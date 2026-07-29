import { Transform } from 'class-transformer'
import { IsNotEmpty, IsPhoneNumber, IsString, MaxLength, ValidateIf } from 'class-validator'

export class LoginDto {
  @IsPhoneNumber('CN', { message: '无效电话号码' })
  @IsNotEmpty({ message: '手机号不能为空' })
  phone!: string

  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string
}

export class UpdateCurrentUserDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(40, { message: '用户名不能超过 40 个字符' })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString({ message: '用户名必须是字符串' })
  username!: string

  @ValidateIf(
    (dto: UpdateCurrentUserDto) => dto.oldPassword !== undefined || dto.newPassword !== undefined,
  )
  @IsString({ message: '旧密码必须是字符串' })
  @IsNotEmpty({ message: '旧密码不能为空' })
  oldPassword?: string

  @ValidateIf(
    (dto: UpdateCurrentUserDto) => dto.oldPassword !== undefined || dto.newPassword !== undefined,
  )
  @IsString({ message: '新密码必须是字符串' })
  @IsNotEmpty({ message: '新密码不能为空' })
  newPassword?: string
}
