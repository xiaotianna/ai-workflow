import { AGENT_MAX_IMAGE_BYTES, agentImageSchema } from '@ai-workflow/agent-protocol'
import { SimpleImageAttachmentAdapter, type AttachmentAdapter } from '@assistant-ui/react'
import { z } from 'zod'
import { showToast } from '@ai-workflow/ui/lib/toast'

const fileSchema = z.object({
    type: z.enum(['image/png', 'image/jpeg', 'image/webp'], {
      error: '请上传 PNG、JPEG 或 WebP 图片',
    }),
    size: z.number().positive().max(AGENT_MAX_IMAGE_BYTES, '图片最大为 10MB'),
  }),
  imageAdapter = new SimpleImageAttachmentAdapter()

export function parseAgentImage(image: string) {
  const match =
    /^data:(?<mimeType>image\/(?:png|jpeg|webp));base64,(?<data>[A-Za-z0-9+/]+={0,2})$/.exec(image)
  return agentImageSchema.parse(match?.groups)
}

export const agentImageAttachmentAdapter: AttachmentAdapter = {
  accept:
    'image/png,image/jpeg,image/webp,application/x-workflow-node,application/x-agent-resource',
  async add({ file }) {
    try {
      const validation = fileSchema.safeParse({ type: file.type, size: file.size })
      if (!validation.success) throw new Error(validation.error.issues[0]?.message)
      const pending = await imageAdapter.add({ file }),
        complete = await imageAdapter.send(pending)
      for (const part of complete.content) if (part.type === 'image') parseAgentImage(part.image)
      return { ...pending, content: complete.content }
    } catch (error) {
      showToast('error', error instanceof Error ? error.message : '图片读取失败')
      throw error
    }
  },
  async send(attachment) {
    return { ...attachment, status: { type: 'complete' }, content: attachment.content ?? [] }
  },
  remove: () => imageAdapter.remove(),
}
