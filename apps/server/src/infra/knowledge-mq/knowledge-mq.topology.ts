import type { Channel } from 'amqplib'

import {
  KNOWLEDGE_COMMAND_DEAD_LETTER_QUEUE,
  KNOWLEDGE_COMMAND_DEAD_LETTER_ROUTING_KEY,
  KNOWLEDGE_COMMAND_EXCHANGE,
  KNOWLEDGE_COMMAND_QUEUE,
  KNOWLEDGE_COMMAND_RETRY_DELAY_MS,
  KNOWLEDGE_COMMAND_RETRY_QUEUE,
  KNOWLEDGE_COMMAND_ROUTING_KEY,
  KNOWLEDGE_DEAD_LETTER_EXCHANGE,
} from './knowledge-mq.constants'

export async function assertKnowledgeMqTopology(channel: Channel): Promise<void> {
  await Promise.all([
    channel.assertExchange(KNOWLEDGE_COMMAND_EXCHANGE, 'direct', { durable: true }),
    channel.assertExchange(KNOWLEDGE_DEAD_LETTER_EXCHANGE, 'direct', { durable: true }),
  ])

  await Promise.all([
    channel.assertQueue(KNOWLEDGE_COMMAND_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': KNOWLEDGE_DEAD_LETTER_EXCHANGE,
        'x-dead-letter-routing-key': KNOWLEDGE_COMMAND_DEAD_LETTER_ROUTING_KEY,
      },
    }),
    channel.assertQueue(KNOWLEDGE_COMMAND_RETRY_QUEUE, {
      durable: true,
      arguments: {
        'x-message-ttl': KNOWLEDGE_COMMAND_RETRY_DELAY_MS,
        'x-dead-letter-exchange': KNOWLEDGE_COMMAND_EXCHANGE,
        'x-dead-letter-routing-key': KNOWLEDGE_COMMAND_ROUTING_KEY,
      },
    }),
    channel.assertQueue(KNOWLEDGE_COMMAND_DEAD_LETTER_QUEUE, { durable: true }),
  ])

  await Promise.all([
    channel.bindQueue(
      KNOWLEDGE_COMMAND_QUEUE,
      KNOWLEDGE_COMMAND_EXCHANGE,
      KNOWLEDGE_COMMAND_ROUTING_KEY,
    ),
    channel.bindQueue(
      KNOWLEDGE_COMMAND_DEAD_LETTER_QUEUE,
      KNOWLEDGE_DEAD_LETTER_EXCHANGE,
      KNOWLEDGE_COMMAND_DEAD_LETTER_ROUTING_KEY,
    ),
  ])
}
