import type { Channel } from 'amqplib'
import {
  WORKFLOW_COMMAND_DEAD_LETTER_QUEUE,
  WORKFLOW_COMMAND_DEAD_LETTER_ROUTING_KEY,
  WORKFLOW_COMMAND_EXCHANGE,
  WORKFLOW_COMMAND_QUEUE,
  WORKFLOW_COMMAND_ROUTING_KEY,
  WORKFLOW_DEAD_LETTER_EXCHANGE,
  WORKFLOW_RESULT_DEAD_LETTER_QUEUE,
  WORKFLOW_RESULT_DEAD_LETTER_ROUTING_KEY,
  WORKFLOW_RESULT_EXCHANGE,
  WORKFLOW_RESULT_QUEUE,
  WORKFLOW_RESULT_RETRY_DELAY_MS,
  WORKFLOW_RESULT_RETRY_QUEUE,
  WORKFLOW_RESULT_ROUTING_KEY,
} from './workflow-mq.constants'

export async function assertWorkflowMqTopology(channel: Channel): Promise<void> {
  await Promise.all([
    channel.assertExchange(WORKFLOW_COMMAND_EXCHANGE, 'direct', { durable: true }),
    channel.assertExchange(WORKFLOW_RESULT_EXCHANGE, 'direct', { durable: true }),
    channel.assertExchange(WORKFLOW_DEAD_LETTER_EXCHANGE, 'direct', { durable: true }),
  ])

  await Promise.all([
    channel.assertQueue(WORKFLOW_COMMAND_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': WORKFLOW_DEAD_LETTER_EXCHANGE,
        'x-dead-letter-routing-key': WORKFLOW_COMMAND_DEAD_LETTER_ROUTING_KEY,
      },
    }),
    channel.assertQueue(WORKFLOW_RESULT_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': WORKFLOW_DEAD_LETTER_EXCHANGE,
        'x-dead-letter-routing-key': WORKFLOW_RESULT_DEAD_LETTER_ROUTING_KEY,
      },
    }),
    channel.assertQueue(WORKFLOW_RESULT_RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': WORKFLOW_RESULT_RETRY_DELAY_MS,
        'x-dead-letter-exchange': WORKFLOW_RESULT_EXCHANGE,
        'x-dead-letter-routing-key': WORKFLOW_RESULT_ROUTING_KEY,
      },
    }),
    channel.assertQueue(WORKFLOW_COMMAND_DEAD_LETTER_QUEUE, { durable: true }),
    channel.assertQueue(WORKFLOW_RESULT_DEAD_LETTER_QUEUE, { durable: true }),
  ])

  await Promise.all([
    channel.bindQueue(
      WORKFLOW_COMMAND_QUEUE,
      WORKFLOW_COMMAND_EXCHANGE,
      WORKFLOW_COMMAND_ROUTING_KEY,
    ),
    channel.bindQueue(WORKFLOW_RESULT_QUEUE, WORKFLOW_RESULT_EXCHANGE, WORKFLOW_RESULT_ROUTING_KEY),
    channel.bindQueue(
      WORKFLOW_COMMAND_DEAD_LETTER_QUEUE,
      WORKFLOW_DEAD_LETTER_EXCHANGE,
      WORKFLOW_COMMAND_DEAD_LETTER_ROUTING_KEY,
    ),
    channel.bindQueue(
      WORKFLOW_RESULT_DEAD_LETTER_QUEUE,
      WORKFLOW_DEAD_LETTER_EXCHANGE,
      WORKFLOW_RESULT_DEAD_LETTER_ROUTING_KEY,
    ),
  ])
}
