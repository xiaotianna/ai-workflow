export const knowledgeBaseIconBackground = 'rgb(219, 234, 254)'

export const documentCategoryOptions = [
  { value: 'all', label: '全部' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'pdf', label: 'PDF' },
  { value: 'text', label: '文本' },
] as const

export const documentSortOptions = [
  { value: 'uploaded-at', label: '上传时间' },
  { value: 'recall-count', label: '召回次数' },
  { value: 'character-count', label: '字符数' },
  { value: 'name', label: '名称' },
] as const

export const documentPageSizeOptions = [10, 25, 50] as const

export const documentAcceptedFileTypes =
  '.md,.markdown,.txt,.pdf,.doc,.docx,.csv,.html,.htm,.xlsx,.xls'

export const documentMaxFileSizeBytes = 15 * 1024 * 1024

export const documentFileTypeIconBackground = 'rgb(219, 234, 254)'
