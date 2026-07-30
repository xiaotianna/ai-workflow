import { exportStudioAppDsl } from '@/api/studio'
import { showToast } from '@ai-workflow/ui/lib/toast'

import type { StudioAppListItem } from '../types'

export async function downloadStudioAppDsl(app: StudioAppListItem): Promise<void> {
  const { blob, filename } = await exportStudioAppDsl(app.id)
  const objectUrl = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = objectUrl
  link.download = filename ?? `${sanitizeFilename(app.title)}.json`
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(objectUrl)
  showToast('success', 'DSL 已导出')
}

function sanitizeFilename(filename: string): string {
  const invalidCharacters = String.raw`<>:"/\|?*`
  const sanitized = [...filename]
    .map((character) => {
      const codePoint = character.codePointAt(0) ?? 0
      return codePoint < 32 || invalidCharacters.includes(character) ? '-' : character
    })
    .join('')
    .trim()

  return sanitized || 'workflow'
}
