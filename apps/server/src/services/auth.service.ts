import { UserRepository } from '@/repository/user.repository'
import { Injectable } from '@nestjs/common'

@Injectable()
export class AuthService {
  constructor(private readonly userRepository: UserRepository) {}
}
