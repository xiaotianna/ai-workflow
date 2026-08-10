import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { extname, join, relative, resolve, sep } from 'node:path'

import { KNOWLEDGE_SOURCE_DIRECTORY } from '@/constant/env'
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class KnowledgeSourceStore {
  private readonly rootDirectory: string

  constructor(configService: ConfigService) {
    this.rootDirectory = resolve(
      configService.get<string>(KNOWLEDGE_SOURCE_DIRECTORY) ?? 'var/knowledge-sources',
    )
  }

  async store(knowledgeBaseId: string, originalName: string, content: Buffer): Promise<string> {
    const extension = extname(originalName).toLowerCase()
    const storageKey = join(knowledgeBaseId, `${randomUUID()}${extension}`)
    const targetPath = this.resolveStoragePath(storageKey)

    try {
      await mkdir(resolve(this.rootDirectory, knowledgeBaseId), { recursive: true })
      await writeFile(targetPath, content, { flag: 'wx', mode: 0o600 })
    } catch {
      throw new InternalServerErrorException('知识库原文件保存失败')
    }

    return storageKey.split(sep).join('/')
  }

  async read(storageKey: string): Promise<Buffer> {
    try {
      return await readFile(this.resolveStoragePath(storageKey))
    } catch {
      throw new InternalServerErrorException('知识库原文件读取失败')
    }
  }

  async remove(storageKey: string): Promise<void> {
    try {
      await unlink(this.resolveStoragePath(storageKey))
    } catch {
      // 文件删除是数据库写入失败或文档删除后的尽力补偿，孤儿文件由后续清理任务兜底。
    }
  }

  private resolveStoragePath(storageKey: string): string {
    const targetPath = resolve(this.rootDirectory, storageKey)
    const relativePath = relative(this.rootDirectory, targetPath)

    if (!relativePath || relativePath.startsWith('..') || relativePath.startsWith(sep)) {
      throw new InternalServerErrorException('知识库原文件存储路径不安全')
    }

    return targetPath
  }
}
