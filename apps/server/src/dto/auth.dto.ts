import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator'

export class LoginDto {
  @IsPhoneNumber('CN', { message: '无效电话号码' })
  @IsNotEmpty({ message: '手机号不能为空' })
  phone!: string

  @IsString({ message: '密码必须是字符串' })
  @IsNotEmpty({ message: '密码不能为空' })
  password!: string
}
