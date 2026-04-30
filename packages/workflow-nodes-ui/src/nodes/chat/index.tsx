import type { NodeContentProps } from '../base'
import type { ChatNodeData } from '@ai-workflow/core'

export type ChatNodeUIProps = NodeContentProps<Partial<ChatNodeData>>

export function ChatNodeUI({ data }: ChatNodeUIProps) {
  return (
    <div className="space-y-2 bg-blue-500 text-sm">
      <div className="text-gray-700">Model: {data?.model ?? 'gpt-4.1-mini'}</div>
      <div className="line-clamp-2 text-gray-500">
        Prompt_1: {data?.prompt ? String(data.prompt) : '未填写'}
      </div>
    </div>
  )
}
