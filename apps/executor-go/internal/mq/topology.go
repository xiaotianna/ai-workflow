package mq

import amqp "github.com/rabbitmq/amqp091-go"

const (
	CommandExchange              = "ai-workflow.command.v1"
	CommandRoutingKey            = "node.execute"
	CommandQueue                 = "ai-workflow.node.execute.v1"
	ResultExchange               = "ai-workflow.result.v1"
	ResultRoutingKey             = "node.result"
	ResultQueue                  = "ai-workflow.node.result.v1"
	ResultRetryQueue             = "ai-workflow.node.result.retry.v1"
	DeadLetterExchange           = "ai-workflow.dead-letter.v1"
	CommandDeadLetterRoutingKey  = "node.execute.dead"
	CommandDeadLetterQueue       = "ai-workflow.node.execute.dlq.v1"
	ResultDeadLetterRoutingKey   = "node.result.dead"
	ResultDeadLetterQueue        = "ai-workflow.node.result.dlq.v1"
	resultRetryDelayMilliseconds = int32(1000)
)

/*
*
mq三个核心概念：
1、Exchange：交换机，接收消息并负责分发。
2、RoutingKey：路由标识，告诉交换机应该走哪条路线。
3、Queue：队列，真正保存消息，等待消费者处理。
*/
func declareTopology(channel *amqp.Channel) error {
	/**
	创建三个交换机（Exchange）
	1、CommandExchange：发送节点执行命令。
	2、ResultExchange：发送节点执行结果。
	3、DeadLetterExchange：接收无法正常处理的消息。
	*/
	exchanges := []string{CommandExchange, ResultExchange, DeadLetterExchange}
	for _, exchange := range exchanges {
		// 交换机不存在就创建；存在配置相同，正常返回；存在但配置不同，返回错误
		if err := channel.ExchangeDeclare(exchange, "direct", true, false, false, false, nil); err != nil {
			return err
		}
	}

	// 创建5个队列
	queues := []struct {
		name      string
		arguments amqp.Table
	}{
		{
			// 保存等待 Go Worker 执行的命令（也就是nestjs要执行节点的mq信息）
			name: CommandQueue,
			arguments: amqp.Table{
				"x-dead-letter-exchange":    DeadLetterExchange,
				"x-dead-letter-routing-key": CommandDeadLetterRoutingKey,
			},
		},
		{
			// 返回给nestjs的信息
			name: ResultQueue,
			arguments: amqp.Table{
				"x-dead-letter-exchange":    DeadLetterExchange,
				"x-dead-letter-routing-key": ResultDeadLetterRoutingKey,
			},
		},
		{
			// nestjs收到消息失败（只要nestjs没有返回ack成功消息，才算成功）后，将节点执行消息保存的队列
			name: ResultRetryQueue,
			arguments: amqp.Table{
				"x-message-ttl":             resultRetryDelayMilliseconds,
				"x-dead-letter-exchange":    ResultExchange,
				"x-dead-letter-routing-key": ResultRoutingKey,
			},
		},
		// 不能被go worker合法解析的节点（例如：不是合法json、缺少必填字段）
		{name: CommandDeadLetterQueue},
		// 结果消息格式不合法
		{name: ResultDeadLetterQueue},
	}

	for _, queue := range queues {
		// 在mq中声明队列配置，一个失败就返回错误
		if _, err := channel.QueueDeclare(queue.name, true, false, false, false, queue.arguments); err != nil {
			return err
		}
	}

	// 把mq的三个概念关联起来
	bindings := []struct {
		queue      string
		routingKey string
		exchange   string
	}{
		{CommandQueue, CommandRoutingKey, CommandExchange},
		{ResultQueue, ResultRoutingKey, ResultExchange},
		{CommandDeadLetterQueue, CommandDeadLetterRoutingKey, DeadLetterExchange},
		{ResultDeadLetterQueue, ResultDeadLetterRoutingKey, DeadLetterExchange},
	}
	for _, binding := range bindings {
		// 定义 Exchange 根据不同 RoutingKey 把消息发送到哪个 Queue
		if err := channel.QueueBind(
			binding.queue,
			binding.routingKey,
			binding.exchange,
			false,
			nil,
		); err != nil {
			return err
		}
	}

	return nil
}
