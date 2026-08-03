import { RABBITMQ_URL } from '@/constant/env'
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  connect,
  type Channel,
  type ChannelModel,
  type ConfirmChannel,
  type Options,
} from 'amqplib'
import { once } from 'node:events'
import { assertWorkflowMqTopology } from './workflow-mq.topology'

@Injectable()
export class WorkflowMqService implements OnModuleDestroy {
  private readonly logger = new Logger(WorkflowMqService.name)
  private readonly url: string
  private connection?: ChannelModel
  private connecting?: Promise<ChannelModel>
  private confirmChannel?: ConfirmChannel
  private creatingConfirmChannel?: Promise<ConfirmChannel>
  private stopping = false

  constructor(configService: ConfigService) {
    this.url = configService.getOrThrow<string>(RABBITMQ_URL)
  }

  async createConsumerChannel(): Promise<Channel> {
    const connection = await this.getConnection()
    const channel = await connection.createChannel()
    await assertWorkflowMqTopology(channel)
    return channel
  }

  async publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: Options.Publish = {},
  ): Promise<void> {
    const channel = await this.getConfirmChannel()
    const writable = channel.publish(exchange, routingKey, content, {
      persistent: true,
      ...options,
    })

    if (!writable) await once(channel, 'drain')
    await channel.waitForConfirms()
  }

  async onModuleDestroy(): Promise<void> {
    this.stopping = true

    try {
      await this.confirmChannel?.close()
    } catch {
      // 连接已经关闭时无需重复处理。
    }

    try {
      await this.connection?.close()
    } catch {
      // 连接已经关闭时无需重复处理。
    }

    this.confirmChannel = undefined
    this.connection = undefined
  }

  private async getConnection(): Promise<ChannelModel> {
    if (this.stopping) throw new Error('RabbitMQ 客户端正在关闭')
    if (this.connection) return this.connection
    if (this.connecting) return this.connecting

    const connecting = connect(this.url).then((connection) => {
      this.connection = connection
      this.logger.log('RabbitMQ 连接已就绪')

      connection.on('error', (error: Error) => {
        this.logger.error(`RabbitMQ 连接异常：${error.message}`)
      })
      connection.on('close', () => {
        if (this.connection === connection) {
          this.connection = undefined
          this.confirmChannel = undefined
          this.logger.warn('RabbitMQ 连接已关闭，后台任务将自动重连')
        }
      })

      return connection
    })

    this.connecting = connecting
    try {
      return await connecting
    } finally {
      if (this.connecting === connecting) this.connecting = undefined
    }
  }

  private async getConfirmChannel(): Promise<ConfirmChannel> {
    if (this.confirmChannel) return this.confirmChannel
    if (this.creatingConfirmChannel) return this.creatingConfirmChannel

    const creating = this.getConnection().then(async (connection) => {
      const channel = await connection.createConfirmChannel()
      await assertWorkflowMqTopology(channel)
      this.confirmChannel = channel

      channel.on('error', (error: Error) => {
        this.logger.error(`RabbitMQ Confirm Channel 异常：${error.message}`)
      })
      channel.on('close', () => {
        if (this.confirmChannel === channel) this.confirmChannel = undefined
      })

      return channel
    })

    this.creatingConfirmChannel = creating
    try {
      return await creating
    } finally {
      if (this.creatingConfirmChannel === creating) this.creatingConfirmChannel = undefined
    }
  }
}
