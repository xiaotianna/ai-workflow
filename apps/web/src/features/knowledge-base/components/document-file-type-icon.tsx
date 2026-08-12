import type { ComponentPropsWithoutRef } from 'react'

export type DocumentFileType = 'word' | 'ppt' | 'pdf' | 'excel' | 'markdown' | 'html' | 'unknown'

const documentFileTypeIconMap = new Map<DocumentFileType, string>([
    ['word', '/word.svg'],
    ['ppt', '/ppt.svg'],
    ['pdf', '/pdf.svg'],
    ['excel', '/excel.svg'],
    ['markdown', '/markdown.svg'],
    ['html', '/html.svg'],
    ['unknown', '/unknow.svg'],
  ]),
  documentFileTypeAliasMap = new Map<string, DocumentFileType>([
    ['application/msword', 'word'],
    ['application/pdf', 'pdf'],
    ['application/vnd.ms-excel', 'excel'],
    ['application/vnd.ms-powerpoint', 'ppt'],
    ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'ppt'],
    ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'excel'],
    ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'word'],
    ['csv', 'excel'],
    ['doc', 'word'],
    ['docx', 'word'],
    ['excel', 'excel'],
    ['html', 'html'],
    ['htm', 'html'],
    ['markdown', 'markdown'],
    ['md', 'markdown'],
    ['pdf', 'pdf'],
    ['ppt', 'ppt'],
    ['pptx', 'ppt'],
    ['text/markdown', 'markdown'],
    ['text/html', 'html'],
    ['word', 'word'],
    ['xls', 'excel'],
    ['xlsx', 'excel'],
  ])

interface DocumentFileTypeIconProps extends Omit<ComponentPropsWithoutRef<'img'>, 'alt' | 'src'> {
  fileName?: string
  fileType?: string
}

function resolveDocumentFileType(fileType?: string, fileName?: string): DocumentFileType {
  const normalizedFileType = fileType?.trim().toLowerCase(),
    fileExtension = fileName?.split('.').pop()?.trim().toLowerCase()

  return (
    (normalizedFileType ? documentFileTypeAliasMap.get(normalizedFileType) : undefined) ??
    (fileExtension ? documentFileTypeAliasMap.get(fileExtension) : undefined) ??
    'unknown'
  )
}

export function DocumentFileTypeIcon({ fileName, fileType, ...props }: DocumentFileTypeIconProps) {
  const resolvedFileType = resolveDocumentFileType(fileType, fileName),
    iconSource =
      documentFileTypeIconMap.get(resolvedFileType) ??
      documentFileTypeIconMap.get('unknown') ??
      '/unknow.svg'

  return <img {...props} src={iconSource} alt="" aria-hidden draggable={false} />
}
