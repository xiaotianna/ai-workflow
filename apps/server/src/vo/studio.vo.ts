export interface StudioAppVo {
  id: string
  title: string
  author: string
  description?: string
  icon?: string
  createdAt: Date
  updatedAt: Date
}

export interface StudioAppListVo {
  items: StudioAppVo[]
  nextCursor: string | null
}

export interface StudioAppDslExport {
  content: string
  filename: string
}
