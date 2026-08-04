package mq

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"node-executor-go/internal/executor"
	protocol "workflow-protocol"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	reconnectDelay       = 2 * time.Second
	resultPublishTimeout = 10 * time.Second
)

type Worker struct {
	rabbitMQURL string
	registry    *executor.Registry
	logger      *log.Logger
}

/*
实现mq节点执行worker：
连接 RabbitMQ
→ 监听节点执行命令
→ 解析并校验命令
→ 根据 nodeType 找到执行器
→ 执行节点
→ 发送执行结果
→ RabbitMQ 确认结果已收到
→ Ack 原始命令
*/
func NewWorker(rabbitMQURL string, registry *executor.Registry, logger *log.Logger) *Worker {
	return &Worker{
		rabbitMQURL: rabbitMQURL,
		registry:    registry,
		logger:      logger,
	}
}

func (worker *Worker) Run(ctx context.Context) error {
	for {
		if err := ctx.Err(); err != nil {
			return err
		}

		if err := worker.runSession(ctx); err != nil && !errors.Is(err, context.Canceled) {
			worker.logger.Printf("rabbitmq session ended error=%v", err)
		}

		timer := time.NewTimer(reconnectDelay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
	}
}

func (worker *Worker) runSession(ctx context.Context) error {
	connection, err := amqp.Dial(worker.rabbitMQURL)
	if err != nil {
		return fmt.Errorf("connect RabbitMQ: %w", err)
	}
	defer func() { _ = connection.Close() }()

	consumerChannel, err := connection.Channel()
	if err != nil {
		return fmt.Errorf("create consumer channel: %w", err)
	}
	defer func() { _ = consumerChannel.Close() }()
	if err := declareTopology(consumerChannel); err != nil {
		return fmt.Errorf("declare RabbitMQ topology: %w", err)
	}
	if err := consumerChannel.Qos(1, 0, false); err != nil {
		return fmt.Errorf("set consumer qos: %w", err)
	}

	publisherChannel, err := connection.Channel()
	if err != nil {
		return fmt.Errorf("create publisher channel: %w", err)
	}
	defer func() { _ = publisherChannel.Close() }()
	if err := publisherChannel.Confirm(false); err != nil {
		return fmt.Errorf("enable publisher confirms: %w", err)
	}

	// 监听节点执行命名（注册消费者）
	deliveries, err := consumerChannel.Consume(
		CommandQueue,
		"executor-go",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("consume workflow commands: %w", err)
	}

	worker.logger.Printf("rabbitmq worker ready queue=%s", CommandQueue)
	connectionClosed := connection.NotifyClose(make(chan *amqp.Error, 1))
	consumerClosed := consumerChannel.NotifyClose(make(chan *amqp.Error, 1))
	publisherClosed := publisherChannel.NotifyClose(make(chan *amqp.Error, 1))

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case closeError := <-connectionClosed:
			return formatAMQPCloseError("connection", closeError)
		case closeError := <-consumerClosed:
			return formatAMQPCloseError("consumer channel", closeError)
		case closeError := <-publisherClosed:
			return formatAMQPCloseError("publisher channel", closeError)
		// 接收【监听节点执行命名】的消息
		case delivery, open := <-deliveries:
			if !open {
				return errors.New("workflow command delivery channel closed")
			}
			worker.handleDelivery(ctx, publisherChannel, delivery)
		}
	}
}

func (worker *Worker) handleDelivery(
	workerContext context.Context,
	publisherChannel *amqp.Channel,
	delivery amqp.Delivery,
) {
	// 校验命令
	command, err := protocol.DecodeExecuteNodeCommand(delivery.Body)
	if err != nil {
		worker.logger.Printf("reject invalid workflow command messageId=%s error=%v", delivery.MessageId, err)
		// 校验失败，不放回原队列
		if rejectErr := delivery.Reject(false); rejectErr != nil {
			worker.logger.Printf("reject invalid workflow command failed error=%v", rejectErr)
		}
		return
	}

	result := worker.executeCommand(workerContext, command)
	if err := protocol.ValidateExecuteNodeResult(result); err != nil {
		worker.logger.Printf("executor returned invalid result commandId=%s error=%v", command.CommandID, err)
		result = protocol.NewFailedResult(
			resultIdentity(command),
			protocol.NodeExecutionError{
				Code:      "EXECUTOR_RESULT_INVALID",
				Message:   "节点执行器返回了无效结果",
				Retryable: false,
			},
		)
	}

	body, err := json.Marshal(result)
	if err != nil {
		worker.requeue(delivery, command.CommandID, err)
		return
	}

	publishContext, cancel := context.WithTimeout(workerContext, resultPublishTimeout)
	defer cancel()
	confirmation, err := publisherChannel.PublishWithDeferredConfirmWithContext(
		publishContext,
		ResultExchange,
		ResultRoutingKey,
		false,
		false,
		amqp.Publishing{
			DeliveryMode:    amqp.Persistent,
			ContentType:     "application/json",
			ContentEncoding: "utf-8",
			MessageId:       command.CommandID,
			CorrelationId:   command.RunID,
			Type:            "workflow.execute-node.result.v1",
			Timestamp:       time.Now().UTC(),
			Body:            body,
		},
	)
	if err != nil {
		worker.requeue(delivery, command.CommandID, err)
		return
	}

	confirmed, err := confirmation.WaitContext(publishContext)
	if err != nil || !confirmed {
		if err == nil {
			err = errors.New("RabbitMQ negatively acknowledged result")
		}
		worker.requeue(delivery, command.CommandID, err)
		return
	}

	if err := delivery.Ack(false); err != nil {
		worker.logger.Printf("ack workflow command failed commandId=%s error=%v", command.CommandID, err)
	}
}

func (worker *Worker) executeCommand(
	workerContext context.Context,
	command protocol.ExecuteNodeCommand,
) protocol.ExecuteNodeResult {
	deadline, err := time.Parse(time.RFC3339Nano, command.DeadlineAt)
	if err != nil {
		return protocol.NewFailedResult(
			resultIdentity(command),
			protocol.NodeExecutionError{
				Code:      "COMMAND_DEADLINE_INVALID",
				Message:   "节点执行命令的 deadlineAt 无效",
				Retryable: false,
			},
		)
	}
	if !deadline.After(time.Now()) {
		return protocol.NewFailedResult(
			resultIdentity(command),
			protocol.NodeExecutionError{
				Code:      "EXECUTION_DEADLINE_EXCEEDED",
				Message:   "节点执行命令已超过 deadline",
				Retryable: false,
			},
		)
	}

	executionContext, cancel := context.WithDeadline(workerContext, deadline)
	defer cancel()
	nodeExecutor, ok := worker.registry.Resolve(command.NodeType)
	if !ok {
		return protocol.NewFailedResult(
			resultIdentity(command),
			protocol.NodeExecutionError{
				Code:      "NODE_EXECUTOR_NOT_REGISTERED",
				Message:   fmt.Sprintf("节点类型 %s 没有注册执行器", command.NodeType),
				Retryable: false,
			},
		)
	}

	result, err := nodeExecutor.Execute(executionContext, command)
	if err == nil {
		return result
	}

	worker.logger.Printf(
		"node execute failed commandId=%s nodeRunId=%s error=%v",
		command.CommandID,
		command.NodeRunID,
		err,
	)
	return protocol.NewFailedResult(
		resultIdentity(command),
		protocol.NodeExecutionError{
			Code:      "NODE_EXECUTOR_FAILED",
			Message:   err.Error(),
			Retryable: false,
		},
	)
}

func (worker *Worker) requeue(delivery amqp.Delivery, commandID string, cause error) {
	worker.logger.Printf("publish workflow result failed commandId=%s error=%v", commandID, cause)
	if err := delivery.Nack(false, true); err != nil {
		worker.logger.Printf("requeue workflow command failed commandId=%s error=%v", commandID, err)
	}
}

func resultIdentity(command protocol.ExecuteNodeCommand) protocol.ResultIdentity {
	return protocol.ResultIdentity{
		ProtocolVersion: command.ProtocolVersion,
		CommandID:       command.CommandID,
		NodeRunID:       command.NodeRunID,
		ExecutionKey:    command.ExecutionKey,
		LeaseToken:      command.LeaseToken,
	}
}

func formatAMQPCloseError(name string, closeError *amqp.Error) error {
	if closeError == nil {
		return fmt.Errorf("RabbitMQ %s closed", name)
	}
	return fmt.Errorf("RabbitMQ %s closed: %w", name, closeError)
}
