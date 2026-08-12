export const KNOWLEDGE_DOCUMENT_FILE_TYPES = [
  'pdf',
  'markdown',
  'text',
  'docx',
  'pptx',
  'xlsx',
  'csv',
  'html',
] as const

export const KNOWLEDGE_DOCUMENT_PARSER_VERSION = 'document-v2'

export type KnowledgeDocumentFileType = (typeof KNOWLEDGE_DOCUMENT_FILE_TYPES)[number]

const knowledgeDocumentExtensionTypeMap = {
    pdf: 'pdf',
    md: 'markdown',
    markdown: 'markdown',
    txt: 'text',
    docx: 'docx',
    pptx: 'pptx',
    xlsx: 'xlsx',
    csv: 'csv',
    html: 'html',
    htm: 'html',
  } as const satisfies Record<string, KnowledgeDocumentFileType>,
  knowledgeDocumentSourceFileNameMap = {
    pdf: 'source.pdf',
    markdown: 'source.md',
    text: 'source.txt',
    docx: 'source.docx',
    pptx: 'source.pptx',
    xlsx: 'source.xlsx',
    csv: 'source.csv',
    html: 'source.html',
  } as const satisfies Record<KnowledgeDocumentFileType, string>

export function resolveKnowledgeDocumentFileType(
  fileName: string,
): KnowledgeDocumentFileType | undefined {
  const extension = fileName.split('.').pop()?.trim().toLowerCase()
  if (!extension) return undefined

  return knowledgeDocumentExtensionTypeMap[
    extension as keyof typeof knowledgeDocumentExtensionTypeMap
  ]
}

export function getKnowledgeDocumentSourceFileName(fileType: string): string | undefined {
  return knowledgeDocumentSourceFileNameMap[fileType as KnowledgeDocumentFileType]
}
