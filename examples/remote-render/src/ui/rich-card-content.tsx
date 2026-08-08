import {
  NodeContentItem,
  NodeContentList,
  type PluginNodeContentProps,
} from '@ai-workflow/plugin/ui'

import { GradientBadge, PreviewPanel } from '../components/visual-kit'

interface RichCardConfig {
  readonly headline: string
  readonly subtitle: string
  readonly status: 'draft' | 'review' | 'live'
  readonly accent: 'indigo' | 'emerald' | 'amber' | 'rose'
}

const STATUS_LABELS = {
  draft: '草稿',
  review: '审核中',
  live: '已上线',
} as const

export default function RichCardContent({ node }: PluginNodeContentProps<RichCardConfig>) {
  const { headline, subtitle, status, accent } = node.config

  return (
    <NodeContentList>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <GradientBadge label="Remote Content" tone={accent} />
          <GradientBadge
            label={STATUS_LABELS[status]}
            tone={status === 'live' ? 'emerald' : 'amber'}
          />
        </div>
        <PreviewPanel
          title={headline}
          subtitle={subtitle}
          accentClassName={
            accent === 'emerald'
              ? 'from-emerald-500/15 to-teal-500/5'
              : accent === 'amber'
                ? 'from-amber-500/15 to-orange-500/5'
                : accent === 'rose'
                  ? 'from-rose-500/15 to-pink-500/5'
                  : 'from-indigo-500/15 to-violet-500/5'
          }
          footer={`节点 ${node.id.slice(0, 8)} · content 模式`}
        />
        <NodeContentItem content={subtitle} />
      </div>
    </NodeContentList>
  )
}
