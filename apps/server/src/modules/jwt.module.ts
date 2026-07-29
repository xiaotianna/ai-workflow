import { JWT_EXPIRES_IN, JWT_SECRET } from '@/constant/env'
import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModuleOptions, JwtModule as NestJwtModule } from '@nestjs/jwt'

type JwtExpiresIn = NonNullable<NonNullable<JwtModuleOptions['signOptions']>['expiresIn']>

@Module({
  imports: [
    NestJwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>(JWT_SECRET),
        signOptions: {
          expiresIn: configService.get<JwtExpiresIn>(JWT_EXPIRES_IN),
        },
      }),
    }),
  ],
  exports: [NestJwtModule],
})
export class JwtModule {}
