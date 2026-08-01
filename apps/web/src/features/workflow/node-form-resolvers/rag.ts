import { FIELD_UI_TYPES } from '@ai-workflow/core'
import type { NodeConfigFieldMap } from '@ai-workflow/form/components/node-config-fields'
import type { KnowledgeBaseDto } from '@/api/knowledge-bases'

import type { NodeFormFieldsResolver } from './registry'

type KnowledgeBaseOptionSource = Pick<KnowledgeBaseDto, 'id' | 'title'>

interface KnowledgeBaseCatalogState {
  loading: boolean
  loadError: boolean
  selectedKnowledgeBaseId?: string
}

export function createRagNodeFormFieldsResolver(
  knowledgeBases: readonly KnowledgeBaseOptionSource[],
  catalogState: KnowledgeBaseCatalogState,
): NodeFormFieldsResolver {
  return (fields: NodeConfigFieldMap) => {
    const knowledgeBaseField = fields.knowledgeBaseId

    if (!knowledgeBaseField || knowledgeBaseField.ui !== FIELD_UI_TYPES.SELECT) {
      return fields
    }

    const selectedKnowledgeBaseUnavailable = Boolean(
      catalogState.selectedKnowledgeBaseId &&
      !knowledgeBases.some(
        (knowledgeBase) => knowledgeBase.id === catalogState.selectedKnowledgeBaseId,
      ),
    )
    const options = knowledgeBases.map((knowledgeBase) => ({
      label: knowledgeBase.title,
      value: knowledgeBase.id,
    }))

    if (selectedKnowledgeBaseUnavailable && catalogState.selectedKnowledgeBaseId) {
      options.push({
        label: `不可用的知识库（${catalogState.selectedKnowledgeBaseId}）`,
        value: catalogState.selectedKnowledgeBaseId,
      })
    }

    return {
      ...fields,
      knowledgeBaseId: {
        ...knowledgeBaseField,
        description: getKnowledgeBaseFieldDescription(
          knowledgeBases.length,
          catalogState,
          selectedKnowledgeBaseUnavailable,
        ),
        options,
      },
    }
  }
}

function getKnowledgeBaseFieldDescription(
  knowledgeBaseCount: number,
  catalogState: KnowledgeBaseCatalogState,
  selectedKnowledgeBaseUnavailable: boolean,
): string {
  if (catalogState.loading && knowledgeBaseCount === 0) {
    return '正在加载知识库列表'
  }

  if (catalogState.loadError && knowledgeBaseCount === 0) {
    return '知识库列表加载失败，请重新打开编辑器后重试'
  }

  if (selectedKnowledgeBaseUnavailable) {
    return '已保存的知识库当前不可用，请重新选择'
  }

  if (knowledgeBaseCount === 0) {
    return '暂无知识库，请先创建空白知识库'
  }

  return '选择需要检索的知识库'
}
