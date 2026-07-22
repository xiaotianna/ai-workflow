import { nodeRegistry, type WorkflowNode } from '@ai-workflow/core'
import { Button } from '@ai-workflow/ui/components/button'
import { Form } from '@ai-workflow/ui/components/form'
import { Textarea } from '@ai-workflow/ui/components/textarea'
import { useState, type FormEvent } from 'react'

interface WorkflowConfigFormProps {
  node: WorkflowNode
  onApply: (node: WorkflowNode) => void
}

export const WorkflowConfigForm = ({ node, onApply }: WorkflowConfigFormProps) => {
  const nodeType = nodeRegistry.get(node.type)
  const [draft, setDraft] = useState(() => JSON.stringify(node.config, null, 2))
  const [error, setError] = useState<string>()

  if (!nodeType) {
    return <p className="text-destructive text-sm">未知节点类型：{node.type}</p>
  }

  /** 解析并校验配置草稿；只有合法配置才提交到编辑会话。 */
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    let rawConfig: unknown

    try {
      rawConfig = JSON.parse(draft)
    } catch {
      setError('请输入合法的 JSON')
      return
    }

    const parsedConfig = nodeType!.schema.safeParse(rawConfig)

    if (!parsedConfig.success) {
      setError(
        parsedConfig.error.issues
          .map((issue) => `${issue.path.join('.') || 'config'}：${issue.message}`)
          .join('；'),
      )
      return
    }

    const nextNode: WorkflowNode = {
      ...node,
      config: parsedConfig.data as WorkflowNode['config'],
    }

    setError(undefined)
    setDraft(JSON.stringify(nextNode.config, null, 2))
    onApply(nextNode)
  }

  return (
    <Form onSubmit={handleSubmit}>
      <Form.Field
        required
        label={`${nodeType.definition.label}配置`}
        description="修改动态分支名称时请保留原 portId"
        error={error}
      >
        <Textarea
          aria-label={`${nodeType.definition.label}配置 JSON`}
          aria-invalid={Boolean(error)}
          className="min-h-72 font-mono text-xs"
          spellCheck={false}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </Form.Field>

      <Button type="submit" variant="confirm" size="sm">
        应用配置
      </Button>
    </Form>
  )
}
