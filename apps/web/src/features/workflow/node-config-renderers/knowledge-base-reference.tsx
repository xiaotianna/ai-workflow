import { KnowledgeBaseReferenceIcon } from '@ai-workflow/nodes-ui'
import { Badge } from '@ai-workflow/ui/components/badge'

import type { KnowledgeSegmentationMode } from '@/api/knowledge-bases'
import { knowledgeSegmentationModeLabels } from '@/features/knowledge-base'

export { KnowledgeBaseReferenceIcon }

interface KnowledgeBaseSegmentationBadgeProps {
  segmentationMode: KnowledgeSegmentationMode | undefined
}

export function KnowledgeBaseSegmentationBadge({
  segmentationMode,
}: KnowledgeBaseSegmentationBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground bg-background/80 h-6 rounded-md px-2 text-xs"
    >
      {segmentationMode ? knowledgeSegmentationModeLabels[segmentationMode] : '分段模式未知'}
    </Badge>
  )
}
