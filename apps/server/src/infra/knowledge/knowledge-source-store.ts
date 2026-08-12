import { randomUUID } from 'node:crypto'
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { extname, posix, relative, resolve, sep } from 'node:path'

import {
  KNOWLEDGE_S3_ACCESS_KEY_ID,
  KNOWLEDGE_S3_BUCKET,
  KNOWLEDGE_S3_ENDPOINT,
  KNOWLEDGE_S3_FORCE_PATH_STYLE,
  KNOWLEDGE_S3_REGION,
  KNOWLEDGE_S3_SECRET_ACCESS_KEY,
  KNOWLEDGE_SOURCE_DIRECTORY,
  KNOWLEDGE_SOURCE_STORAGE_DRIVER,
} from '@/constant/env'
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export interface KnowledgeSourceGcCandidate {
  storageKey: string
  lastModified: Date
}

export interface KnowledgeSourceGcPage {
  items: KnowledgeSourceGcCandidate[]
  continuationToken?: string
}

@Injectable()
export class KnowledgeSourceStore {
  private readonly driver: 'local' | 's3'
  private readonly rootDirectory: string
  private readonly bucket?: string
  private readonly s3Client?: S3Client

  constructor(configService: ConfigService) {
    this.driver = configService.get<'local' | 's3'>(KNOWLEDGE_SOURCE_STORAGE_DRIVER) ?? 'local'
    this.rootDirectory = resolve(
      configService.get<string>(KNOWLEDGE_SOURCE_DIRECTORY) ?? 'var/knowledge-sources',
    )
    if (this.driver === 's3') {
      this.bucket = configService.getOrThrow<string>(KNOWLEDGE_S3_BUCKET)
      const endpoint = configService.get<string>(KNOWLEDGE_S3_ENDPOINT) || undefined,
        accessKeyId = configService.get<string>(KNOWLEDGE_S3_ACCESS_KEY_ID) || undefined,
        secretAccessKey = configService.get<string>(KNOWLEDGE_S3_SECRET_ACCESS_KEY) || undefined
      this.s3Client = new S3Client({
        region: configService.get<string>(KNOWLEDGE_S3_REGION) ?? 'us-east-1',
        ...(endpoint ? { endpoint } : {}),
        forcePathStyle: configService.get<boolean>(KNOWLEDGE_S3_FORCE_PATH_STYLE) ?? false,
        ...(accessKeyId && secretAccessKey
          ? { credentials: { accessKeyId, secretAccessKey } }
          : {}),
      })
    }
  }

  async store(
    knowledgeBaseId: string,
    originalName: string,
    content: Buffer,
    contentType?: string,
  ): Promise<string> {
    const extension = extname(originalName).toLowerCase(),
      storageKey = posix.join(knowledgeBaseId, `${randomUUID()}${extension}`)
    if (this.driver === 's3') {
      const { bucket, client } = this.requireS3()
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: bucket,
            Key: storageKey,
            Body: content,
            ContentLength: content.length,
            ...(contentType ? { ContentType: contentType } : {}),
            Metadata: { knowledgeBaseId },
          }),
        )
      } catch {
        throw new InternalServerErrorException('知识库原文件保存失败')
      }
      return storageKey
    }

    const targetPath = this.resolveStoragePath(storageKey)

    try {
      await mkdir(resolve(this.rootDirectory, knowledgeBaseId), {
        recursive: true,
      })
      await writeFile(targetPath, content, { flag: 'wx', mode: 0o600 })
    } catch {
      throw new InternalServerErrorException('知识库原文件保存失败')
    }

    return storageKey
  }

  async read(storageKey: string): Promise<Buffer> {
    if (this.driver === 's3') {
      const { bucket, client } = this.requireS3()
      try {
        const result = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: this.validateStorageKey(storageKey),
          }),
        )
        if (!result?.Body) throw new Error('对象内容为空')
        return Buffer.from(await result.Body.transformToByteArray())
      } catch {
        throw new InternalServerErrorException('知识库原文件读取失败')
      }
    }

    try {
      return await readFile(this.resolveStoragePath(storageKey))
    } catch {
      throw new InternalServerErrorException('知识库原文件读取失败')
    }
  }

  async remove(storageKey: string): Promise<boolean> {
    if (this.driver === 's3') {
      const { bucket, client } = this.requireS3()
      try {
        await client.send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: this.validateStorageKey(storageKey),
          }),
        )
      } catch {
        // 删除采用尽力补偿；对象存储生命周期和后续 GC 负责清理残留对象。
        return false
      }
      return true
    }

    try {
      await unlink(this.resolveStoragePath(storageKey))
      return true
    } catch (error) {
      if (isFileNotFound(error)) return true
      // 文件删除是数据库写入失败或文档删除后的尽力补偿，孤儿文件由后续清理任务兜底。
      return false
    }
  }

  async listGcCandidates(options: {
    before: Date
    continuationToken?: string
    limit: number
  }): Promise<KnowledgeSourceGcPage> {
    if (this.driver === 's3') {
      const { bucket, client } = this.requireS3(),
        result = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            MaxKeys: options.limit,
            ...(options.continuationToken ? { ContinuationToken: options.continuationToken } : {}),
          }),
        ),
        items = (result.Contents ?? []).flatMap((object) => {
          if (
            !object.Key ||
            !object.LastModified ||
            !this.isManagedStorageKey(object.Key) ||
            object.LastModified >= options.before
          ) {
            return []
          }
          return [{ storageKey: object.Key, lastModified: object.LastModified }]
        })
      return {
        items,
        ...(result.NextContinuationToken
          ? { continuationToken: result.NextContinuationToken }
          : {}),
      }
    }

    const objects = await this.listLocalObjects(this.rootDirectory),
      start = options.continuationToken
        ? objects.findIndex(({ storageKey }) => storageKey > options.continuationToken!)
        : 0,
      pageStart = start < 0 ? objects.length : start,
      page = objects.slice(pageStart, pageStart + options.limit),
      hasMore = pageStart + page.length < objects.length
    return {
      items: page.filter(
        ({ storageKey, lastModified }) =>
          this.isManagedStorageKey(storageKey) && lastModified < options.before,
      ),
      ...(hasMore && page.length ? { continuationToken: page[page.length - 1].storageKey } : {}),
    }
  }

  private resolveStoragePath(storageKey: string): string {
    const targetPath = resolve(this.rootDirectory, this.validateStorageKey(storageKey)),
      relativePath = relative(this.rootDirectory, targetPath)

    if (!relativePath || relativePath.startsWith('..') || relativePath.startsWith(sep)) {
      throw new InternalServerErrorException('知识库原文件存储路径不安全')
    }

    return targetPath
  }

  private validateStorageKey(storageKey: string): string {
    const normalized = posix.normalize(storageKey)
    if (
      !storageKey ||
      normalized !== storageKey ||
      normalized.startsWith('../') ||
      normalized.startsWith('/')
    ) {
      throw new InternalServerErrorException('知识库原文件存储路径不安全')
    }
    return normalized
  }

  private isManagedStorageKey(storageKey: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:md|markdown|txt|pdf)$/i.test(
      storageKey,
    )
  }

  private async listLocalObjects(
    directory: string,
    relativeDirectory = '',
  ): Promise<KnowledgeSourceGcCandidate[]> {
    let entries
    try {
      entries = await readdir(directory, { withFileTypes: true })
    } catch (error) {
      if (isFileNotFound(error)) return []
      throw error
    }

    const nestedItems = await Promise.all(
        entries.map(async (entry): Promise<KnowledgeSourceGcCandidate[]> => {
          const storageKey = posix.join(relativeDirectory, entry.name),
            fullPath = resolve(directory, entry.name)
          if (entry.isDirectory()) return this.listLocalObjects(fullPath, storageKey)
          if (!entry.isFile()) return []
          const fileStat = await stat(fullPath)
          return [{ storageKey, lastModified: fileStat.mtime }]
        }),
      ),
      items = nestedItems.flat()
    return items.sort((left, right) => left.storageKey.localeCompare(right.storageKey))
  }

  private requireS3(): { bucket: string; client: S3Client } {
    if (!this.bucket || !this.s3Client) {
      throw new InternalServerErrorException('知识库对象存储配置无效')
    }
    return { bucket: this.bucket, client: this.s3Client }
  }
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  )
}
