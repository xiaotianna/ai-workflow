import {
  NodeContentItem,
  NodeContentList,
  type PluginNodeContentProps,
} from '@ai-workflow/plugin/ui'

import { GradientBadge, PreviewPanel } from '../components/visual-kit'

interface VisualBuilderConfig {
  readonly theme: 'aurora' | 'sunset' | 'forest' | 'mono'
  readonly primaryColor: string
  readonly secondaryColor: string
  readonly showGrid: boolean
  readonly caption: string
}

const THEME_ACCENTS = {
  aurora: 'from-indigo-500/20 via-violet-500/10 to-cyan-500/10',
  sunset: 'from-orange-500/20 via-rose-500/10 to-amber-500/10',
  forest: 'from-emerald-500/20 via-teal-500/10 to-lime-500/10',
  mono: 'from-muted/50 to-muted/20',
} as const

export default function VisualBuilderContent({
  node,
}: PluginNodeContentProps<VisualBuilderConfig>) {
  const { theme, primaryColor, secondaryColor, showGrid, caption } = node.config

  return (
    <NodeContentList>
      <div className="space-y-2">
        <GradientBadge label={`Theme · ${theme}`} tone="indigo" />
        <PreviewPanel
          title="Canvas Preview"
          subtitle={caption}
          accentClassName={THEME_ACCENTS[theme]}
          footer={`${primaryColor} → ${secondaryColor}`}
        />
        {showGrid ? (
          <div className="grid grid-cols-4 gap-1">
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={index}
                className="h-6 rounded-sm"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor}${index % 2 === 0 ? 'cc' : '66'}, ${secondaryColor}${index % 2 === 0 ? '66' : 'cc'})`,
                }}
              />
            ))}
          </div>
        ) : (
          <NodeContentItem content="网格预览已关闭" />
        )}
      </div>
    </NodeContentList>
  )
}
