import { PrismaService } from '@/infra/prisma/prisma.service'
import { Injectable } from '@nestjs/common'

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByPhone(phone: string) {
    return this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        password: true,
      },
    })
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        phone: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  findPasswordById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        password: true,
      },
    })
  }

  create(user: { phone: string; password: string; username: string }) {
    return this.prisma.user.create({
      data: user,
      select: {
        id: true,
        phone: true,
        username: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  updateById(id: string, user: { username: string; password?: string }) {
    return this.prisma.user.update({
      where: { id },
      data: user,
      select: {
        phone: true,
        username: true,
      },
    })
  }
}
