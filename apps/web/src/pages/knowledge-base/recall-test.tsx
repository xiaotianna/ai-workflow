import { useOutletContext } from 'react-router-dom'

import { PageContent } from '@/components/page-content'
import { PageTitle } from '@/components/page-title'

import type { KnowledgeBaseDetailOutletContext } from '.'

export default function KnowledgeBaseRecallTestPage() {
  const { isResourceAvailable } = useOutletContext<KnowledgeBaseDetailOutletContext>()

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden px-6 pt-4 pb-2">
      <PageTitle title="召回测试" subtitle="生产混合检索将在索引基础设施接入后启用" />

      <PageContent className="mt-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="text-muted-foreground flex min-h-48 items-center justify-center text-sm">
          {isResourceAvailable
            ? '文档分段已可管理；当前环境尚未接入 Embedding 与 OpenSearch，因此不返回模拟召回结果'
            : '知识库不可用或正在加载'}
        </div>
      </PageContent>
    </div>
  )
}
