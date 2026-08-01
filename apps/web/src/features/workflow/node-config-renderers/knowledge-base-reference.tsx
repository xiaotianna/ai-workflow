import { KnowledgeBaseReferenceIcon } from '@ai-workflow/nodes-ui'
import { Badge } from '@ai-workflow/ui/components/badge'

export { KnowledgeBaseReferenceIcon }

export const DEFAULT_KNOWLEDGE_BASE_RETRIEVAL_LABEL = '经济 · 倒排索引'

export function KnowledgeBaseRetrievalBadge() {
  return (
    <Badge
      variant="outline"
      className="text-muted-foreground bg-background/80 h-6 rounded-md px-2 text-xs"
    >
      {DEFAULT_KNOWLEDGE_BASE_RETRIEVAL_LABEL}
    </Badge>
  )
}
