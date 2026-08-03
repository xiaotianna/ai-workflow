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

func declareTopology(channel *amqp.Channel) error {
	exchanges := []string{CommandExchange, ResultExchange, DeadLetterExchange}
	for _, exchange := range exchanges {
		if err := channel.ExchangeDeclare(exchange, "direct", true, false, false, false, nil); err != nil {
			return err
		}
	}

	queues := []struct {
		name      string
		arguments amqp.Table
	}{
		{
			name: CommandQueue,
			arguments: amqp.Table{
				"x-dead-letter-exchange":    DeadLetterExchange,
				"x-dead-letter-routing-key": CommandDeadLetterRoutingKey,
			},
		},
		{
			name: ResultQueue,
			arguments: amqp.Table{
				"x-dead-letter-exchange":    DeadLetterExchange,
				"x-dead-letter-routing-key": ResultDeadLetterRoutingKey,
			},
		},
		{
			name: ResultRetryQueue,
			arguments: amqp.Table{
				"x-message-ttl":             resultRetryDelayMilliseconds,
				"x-dead-letter-exchange":    ResultExchange,
				"x-dead-letter-routing-key": ResultRoutingKey,
			},
		},
		{name: CommandDeadLetterQueue},
		{name: ResultDeadLetterQueue},
	}
	for _, queue := range queues {
		if _, err := channel.QueueDeclare(queue.name, true, false, false, false, queue.arguments); err != nil {
			return err
		}
	}

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
