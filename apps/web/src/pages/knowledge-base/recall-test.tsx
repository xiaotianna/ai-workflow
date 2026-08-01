import { useOutletContext } from 'react-router-dom'

import { PageContent } from '@/components/page-content'
import { PageTitle } from '@/components/page-title'

import type { KnowledgeBaseDetailOutletContext } from '.'

export default function KnowledgeBaseRecallTestPage() {
  const { isResourceAvailable } = useOutletContext<KnowledgeBaseDetailOutletContext>()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-6 pt-4 pb-2">
      <PageTitle title="召回测试" subtitle="检索与召回能力将在索引阶段接入" />

      <PageContent className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
          {isResourceAvailable ? '当前空白知识库暂不支持召回测试' : '知识库不可用或正在加载'}
        </div>
      </PageContent>
    </div>
  )
}
