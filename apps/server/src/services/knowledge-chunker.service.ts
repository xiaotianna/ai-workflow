import type { KnowledgeSegmentationMode } from '@/generated/prisma/enums'
import { resolveKnowledgeDocumentFileType } from '@/constant/knowledge-document'
import { addHeadingMetadata } from '@/utils/knowledge-search-text'
import { BadRequestException, Injectable } from '@nestjs/common'
import { OfficeParser, type SupportedFileType } from 'officeparser'
import { PDFParse } from 'pdf-parse'

const OFFICE_PARSER_FILE_TYPES = new Set<SupportedFileType>(['docx', 'pptx', 'xlsx', 'csv', 'html'])

const OFFICE_PARSER_DECOMPRESSION_LIMITS = {
  maxUncompressedBytes: 64 * 1024 * 1024,
  maxZipEntries: 5000,
  maxTableCells: 200_000,
} as const

export interface KnowledgeChunkInput {
  content: string
  metadata: Record<string, string | number>
}

export interface KnowledgeChunkConfig {
  segmentationMode: KnowledgeSegmentationMode
  maxSegmentLength: number
  overlapLength: number
  normalizeWhitespace: boolean
}

@Injectable()
export class KnowledgeChunkerService {
  async parseText(content: Buffer, fileName: string): Promise<string> {
    const fileType = resolveKnowledgeDocumentFileType(fileName)
    if (!fileType) {
      throw new BadRequestException(
        '当前仅支持 PDF、Markdown、TXT、DOCX、PPTX、XLSX、CSV 和 HTML 文件',
      )
    }

    const text =
      fileType === 'pdf'
        ? await this.parsePdfText(content)
        : OFFICE_PARSER_FILE_TYPES.has(fileType as SupportedFileType)
          ? await this.parseOfficeText(content, fileType as SupportedFileType)
          : this.decodePlainText(content)
    if (!text.trim()) {
      throw new BadRequestException(
        fileType === 'pdf' ? 'PDF 未提取到文本，暂不支持扫描件 OCR' : '文件内容不能为空',
      )
    }

    return text
  }

  private decodePlainText(content: Buffer): string {
    try {
      if (content.subarray(0, 2).equals(Buffer.from([255, 254]))) {
        return new TextDecoder('utf-16le', { fatal: true }).decode(content.subarray(2))
      }
      if (content.subarray(0, 2).equals(Buffer.from([254, 255]))) {
        return new TextDecoder('utf-16be', { fatal: true }).decode(content.subarray(2))
      }

      return new TextDecoder('utf-8', { fatal: true }).decode(content).replace(/^\uFEFF/, '')
    } catch {
      throw new BadRequestException('文本文件编码无效，请转换为 UTF-8 或带 BOM 的 UTF-16')
    }
  }

  private async parseOfficeText(content: Buffer, fileType: SupportedFileType): Promise<string> {
    const parserContent =
      fileType === 'csv' || fileType === 'html'
        ? Buffer.from(this.decodePlainText(content), 'utf8')
        : content

    try {
      const document = await OfficeParser.parseOffice(parserContent, {
        fileType,
        extractAttachments: false,
        includeRawContent: false,
        ignoreComments: true,
        ignoreHeadersAndFooters: true,
        ignoreSlideMasters: true,
        ocr: false,
        decompressionLimits: OFFICE_PARSER_DECOMPRESSION_LIMITS,
      })
      const result = await document.to('text', {
        includeImages: false,
        textConfig: {
          preserveLayout: true,
          renderNotes: true,
        },
      })
      return result.value
    } catch (error) {
      if (error instanceof BadRequestException) throw error
      throw new BadRequestException(`${fileType.toUpperCase()} 文件解析失败`)
    }
  }

  private async parsePdfText(content: Buffer): Promise<string> {
    if (content.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new BadRequestException('PDF 文件格式无效')
    }

    const parser = new PDFParse({ data: content })
    try {
      const info = await parser.getInfo()
      if (info.total > 500) {
        throw new BadRequestException('PDF 页数不能超过 500 页')
      }
      const result = await parser.getText({ pageJoiner: '\n\n' })
      return result.text
    } catch (error) {
      if (error instanceof BadRequestException) throw error
      throw new BadRequestException('PDF 文本解析失败')
    } finally {
      await parser.destroy()
    }
  }

  chunk(source: string, config: KnowledgeChunkConfig): KnowledgeChunkInput[] {
    const normalized = this.clean(source, config.normalizeWhitespace)

    if (config.segmentationMode === 'QA') {
      return this.chunkQa(normalized, config.maxSegmentLength)
    }

    if (config.segmentationMode === 'PARENT_CHILD') {
      return this.chunkParentChild(normalized, config)
    }

    return addHeadingMetadata(
      this.chunkGeneral(normalized, config).map((content) => ({ content, metadata: {} })),
    )
  }

  private clean(source: string, normalizeWhitespace: boolean): string {
    const normalizedLines = Array.from(source.replace(/\r\n?/g, '\n'))
      .filter((character) => {
        const code = character.codePointAt(0) ?? 0
        return code === 9 || code === 10 || (code >= 32 && code !== 127)
      })
      .join('')
      .split('\n')
      .map((line) => line.replace(/[ \t]+$/g, ''))

    if (!normalizeWhitespace) return normalizedLines.join('\n').trim()

    return normalizedLines
      .map((line) => (/^\s{4}|^\t|^```/.test(line) ? line : line.replace(/[ \t]{2,}/g, ' ')))
      .join('\n')
      .replace(/\n{4,}/g, '\n\n\n')
      .trim()
  }

  private chunkGeneral(source: string, config: KnowledgeChunkConfig): string[] {
    const blocks = source
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean)
    const chunks: string[] = []
    let current = ''

    const pushCurrent = () => {
      if (!current.trim()) return
      chunks.push(current.trim())
      current = ''
    }

    for (const block of blocks) {
      const pieces = this.splitLongBlock(block, config.maxSegmentLength)
      for (const piece of pieces) {
        const candidate = current ? `${current}\n\n${piece}` : piece
        if (candidate.length <= config.maxSegmentLength) {
          current = candidate
          continue
        }

        const previous = current
        pushCurrent()
        const overlap = this.resolveOverlap(previous, config.overlapLength)
        current = overlap ? `${overlap}\n${piece}` : piece
        if (current.length > config.maxSegmentLength) {
          current = piece
        }
      }
    }

    pushCurrent()
    return chunks
  }

  private chunkQa(source: string, maxLength: number): KnowledgeChunkInput[] {
    const blocks = source
      .split(/\n{2,}/)
      .map((item) => item.trim())
      .filter(Boolean)
    return blocks.flatMap((block, blockIndex) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
      const questionIndex = lines.findIndex((line) => /^(q|问|问题)\s*[:：]/i.test(line))
      const answerIndex = lines.findIndex((line) => /^(a|答|答案)\s*[:：]/i.test(line))
      const question =
        questionIndex !== -1 ? lines[questionIndex].replace(/^[^:：]+[:：]\s*/, '') : ''
      const answer =
        answerIndex !== -1
          ? lines
              .slice(answerIndex)
              .join('\n')
              .replace(/^[^:：]+[:：]\s*/, '')
          : block
      const content = question ? `问题：${question}\n答案：${answer}` : answer

      const metadata: Record<string, string | number> = { qaBlock: blockIndex + 1 }
      if (question) metadata.question = question
      return this.splitLongBlock(content, maxLength).map((piece) => ({ content: piece, metadata }))
    })
  }

  private chunkParentChild(source: string, config: KnowledgeChunkConfig): KnowledgeChunkInput[] {
    const parents = source
      .split(/(?=^#{1,3}\s)|\n{3,}/m)
      .map((item) => item.trim())
      .filter(Boolean)
    const childLength = Math.max(100, Math.floor(config.maxSegmentLength / 2))
    return addHeadingMetadata(
      parents.flatMap((parent, parentIndex) =>
        this.chunkGeneral(parent, {
          ...config,
          maxSegmentLength: childLength,
          overlapLength: Math.min(config.overlapLength, childLength - 1),
        }).map((content) => ({
          content,
          metadata: {
            parentContent: parent,
            parentSequence: parentIndex + 1,
          },
        })),
      ),
    )
  }

  private splitLongBlock(block: string, maxLength: number): string[] {
    if (block.length <= maxLength) return [block]

    const pieces: string[] = []
    let remaining = block
    while (remaining.length > maxLength) {
      const window = remaining.slice(0, maxLength + 1)
      const boundary = Math.max(
        window.lastIndexOf('\n'),
        window.lastIndexOf('。'),
        window.lastIndexOf('；'),
      )
      const cut = boundary >= Math.floor(maxLength * 0.5) ? boundary + 1 : maxLength
      pieces.push(remaining.slice(0, cut).trim())
      remaining = remaining.slice(cut).trimStart()
    }
    if (remaining) pieces.push(remaining)
    return pieces
  }

  private resolveOverlap(content: string, length: number): string {
    if (!content || length <= 0) return ''
    return content.slice(-length).trimStart()
  }
}
