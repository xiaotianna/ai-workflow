import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { WinstonModule, WinstonModuleOptions } from 'nest-winston'
import { utilities } from 'nest-winston'
import winston from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'

@Module({
  imports: [
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): WinstonModuleOptions => {
        const level =
            configService.get<string>('NODE_ENV', 'development') === 'development'
              ? 'silly'
              : 'info',
          consoleTransport = new winston.transports.Console({
            level,
            format: winston.format.combine(
              // 日志时间
              winston.format.timestamp({
                format: 'YYYY-MM-DD HH:mm:ss',
              }),
              // 记录当前日志与上一条日志之间间隔了多久
              winston.format.ms(),
              // 把日志格式化成类似 NestJS 默认控制台日志的样式
              utilities.format.nestLike('AI Workflow', {
                colors: true,
                prettyPrint: true,
              }),
            ),
          }),
          // 创建按日期自动切割的文件日志输出器，负责把日志写入文件
          dailyRotateTransport = new DailyRotateFile({
            level,
            dirname: 'logs',
            filename: 'application-%DATE%.log',
            datePattern: 'YYYY-MM-DD-HH',
            zippedArchive: true, // 文件压缩
            maxSize: '20m',
            maxFiles: '15d', // 文件保存时间：15天
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.errors({ stack: true }),
              winston.format.splat(),
              winston.format.json(),
            ),
          })

        dailyRotateTransport.on('error', (error: Error) => {
          process.stderr.write(`[logger] 写入日志文件失败：${error.stack ?? error.message}\n`)
        })
        return {
          level,
          transports: [consoleTransport, dailyRotateTransport],
        }
      },
    }),
  ],
})
export class LogModule {}
