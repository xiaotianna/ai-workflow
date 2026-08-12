const MARKDOWN_HEADING_PATTERN = /^(#{1,6})\s+(.+?)\s*#*\s*$/

export interface KnowledgeSearchMetadata {
  title?: string
  titlePath?: string
}

export function normalizeKnowledgeSearchText(value: string): string {
  return finishKnowledgeSearchTextNormalization(
    value
      .normalize('NFKC')
      .replace(/([\p{Ll}\d])(\p{Lu})/gu, '$1 $2')
      .replace(/(\p{Lu})(\p{Lu}\p{Ll})/gu, '$1 $2'),
  )
}

export function createKnowledgeSearchTextVariants(value: string): string[] {
  return [
    ...new Set([
      normalizeKnowledgeSearchText(value),
      finishKnowledgeSearchTextNormalization(value.normalize('NFKC')),
    ]),
  ].filter(Boolean)
}

function finishKnowledgeSearchTextNormalization(value: string): string {
  return value
    .replace(/[_.\\/:-]+/g, ' ')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function readKnowledgeSearchMetadata(
  metadata: Record<string, unknown>,
  content: string,
): KnowledgeSearchMetadata {
  const metadataTitle = readNonEmptyString(metadata.title) ?? readNonEmptyString(metadata.question),
    metadataTitlePath = readNonEmptyString(metadata.titlePath)
  if (metadataTitle || metadataTitlePath) {
    return {
      ...(metadataTitle ? { title: metadataTitle } : {}),
      ...(metadataTitlePath ? { titlePath: metadataTitlePath } : {}),
    }
  }

  const heading = content
      .split('\n')
      .map((line) => line.trim())
      .map((line) => MARKDOWN_HEADING_PATTERN.exec(line))
      .find(Boolean),
    title = heading?.[2]?.trim()
  return title ? { title, titlePath: title } : {}
}

export function addHeadingMetadata(
  chunks: Array<{ content: string; metadata: Record<string, string | number> }>,
): Array<{ content: string; metadata: Record<string, string | number> }> {
  const headingPath: string[] = []

  return chunks.map((chunk) => {
    for (const line of chunk.content.split('\n')) {
      const match = MARKDOWN_HEADING_PATTERN.exec(line.trim()),
        level = match?.[1]?.length,
        title = match?.[2]?.trim()
      if (!level || !title) continue
      headingPath.length = level - 1
      headingPath[level - 1] = title
    }

    const activeHeadings = headingPath.filter(Boolean)
    if (!activeHeadings.length) return chunk
    return {
      ...chunk,
      metadata: {
        ...chunk.metadata,
        title: activeHeadings.at(-1) as string,
        titlePath: activeHeadings.join(' > '),
      },
    }
  })
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}
