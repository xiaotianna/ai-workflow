import {
  ComposerPrimitive,
  useAui,
  useAuiState,
  unstable_useSlashCommandAdapter,
} from '@assistant-ui/react'
import { Fragment, useEffect, useState } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Box,
  Check,
  ImagePlus,
  Plus,
  Workflow as WorkflowIcon,
} from 'lucide-react'
import { NodeIconBadge } from '@ai-workflow/nodes-ui'
import { Button } from '@ai-workflow/ui/components/button'
import { Input } from '@ai-workflow/ui/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@ai-workflow/ui/components/popover'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { useWorkflowKnowledgeBaseCatalog } from '@/components/workflow/workflow-knowledge-base-catalog-context'
import { useWorkflowStudioAppCatalog } from '@/components/workflow/workflow-studio-app-catalog-context'
import { useWorkflowCatalog } from '../catalog/workflow-web-catalog'
import { agentNodeSearchFormSchema } from '../schema'
import { useWorkflowAgent } from './workflow-agent-provider'

export function AgentContextPicker() {
  const agent = useWorkflowAgent(),
    aui = useAui(),
    attachments = useAuiState((s) => s.composer.attachments),
    attachedIds = new Set(attachments.map((attachment) => attachment.id)),
    { nodeRegistry } = useWorkflowCatalog(),
    workflows = useWorkflowStudioAppCatalog(),
    knowledge = useWorkflowKnowledgeBaseCatalog(),
    [open, setOpen] = useState(false),
    [mode, setMode] = useState<'menu' | 'nodes' | 'workflow' | 'knowledge-base'>('menu'),
    search = useFormData({ query: '' }),
    parsed = validateFormByZod(agentNodeSearchFormSchema, search.form),
    query = parsed.success ? parsed.data.query.toLowerCase() : '',
    resources = mode === 'workflow' ? workflows.apps : knowledge.knowledgeBases,
    catalog = mode === 'workflow' ? workflows : knowledge,
    nodeItems = agent.nodes.filter((node) =>
      `${node.label ?? ''} ${nodeRegistry.get(node.type)?.definition.label ?? node.type}`
        .toLowerCase()
        .includes(query),
    ),
    resourceItems = resources.filter((resource) => resource.title.toLowerCase().includes(query))
  return (
    <Popover
      open={open}
      onOpenChange={(value) => {
        setOpen(value)
        if (!value) {
          setMode('menu')
          search.resetForm()
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground shrink-0 rounded-full"
          aria-label="添加附件"
          disabled={!agent.enabled || agent.switchingConversation}
        >
          <Plus className="size-4" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-72 max-w-[calc(100vw-2rem)] space-y-1 p-1.5"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        {mode === 'menu' ? (
          <>
            <ComposerPrimitive.AddAttachment asChild multiple>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                onClick={() => setOpen(false)}
              >
                <ImagePlus className="size-4" aria-hidden />
                上传图片
                <span className="text-muted-foreground ml-auto text-xs">10MB</span>
              </Button>
            </ComposerPrimitive.AddAttachment>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => setMode('nodes')}
            >
              <Box className="size-4" aria-hidden />
              选择节点<span className="text-muted-foreground ml-auto">@</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                setMode('workflow')
                workflows.load()
              }}
            >
              <WorkflowIcon className="size-4" aria-hidden />
              选择工作流<span className="text-muted-foreground ml-auto">/</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => {
                setMode('knowledge-base')
                knowledge.load()
              }}
            >
              <BookOpen className="size-4" aria-hidden />
              选择知识库<span className="text-muted-foreground ml-auto">/</span>
            </Button>
          </>
        ) : (
          <>
            <div className="flex items-center gap-1 px-1 py-0.5">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="返回附件菜单"
                onClick={() => {
                  setMode('menu')
                  search.resetForm()
                }}
              >
                <ArrowLeft className="size-3.5" aria-hidden />
              </Button>
              <span className="text-sm font-medium">
                {mode === 'nodes'
                  ? '选择节点'
                  : mode === 'workflow'
                    ? '选择已发布工作流'
                    : '选择知识库'}
              </span>
            </div>
            <Input
              aria-label="搜索附件"
              placeholder="输入名称搜索"
              value={search.form.query}
              onChange={(event) => search.updateFormField('query', event.target.value)}
            />
            {mode === 'nodes' && agent.selectedNodeIds.size > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => agent.addNodes([...agent.selectedNodeIds])}
              >
                添加所选节点（{agent.selectedNodeIds.size}）
              </Button>
            )}
            <div className="max-h-52 overflow-y-auto">
              {mode === 'nodes'
                ? nodeItems.map((node) => {
                    const id = `workflow-node:${node.id}`,
                      checked = attachedIds.has(id)
                    return (
                      <Button
                        key={node.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2"
                        aria-pressed={checked}
                        onClick={() => {
                          if (checked) aui.composer.attachment({ id }).remove()
                          else agent.addNodes([node.id])
                        }}
                      >
                        <NodeIconBadge
                          type={node.type}
                          icon={nodeRegistry.get(node.type)?.definition.icon}
                          className="size-5 rounded"
                        />
                        <span className="min-w-0 flex-1 truncate text-left">
                          {node.label ?? nodeRegistry.get(node.type)?.definition.label ?? node.type}
                        </span>
                        {checked && <Check className="text-success size-4 shrink-0" aria-hidden />}
                      </Button>
                    )
                  })
                : resourceItems.map((resource) => {
                    const id = `agent-resource:${mode}:${resource.id}`,
                      checked = attachedIds.has(id)
                    return (
                      <Button
                        key={resource.id}
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start gap-2"
                        aria-pressed={checked}
                        onClick={() => {
                          if (checked) aui.composer.attachment({ id }).remove()
                          else
                            agent.addResource({
                              kind: mode,
                              id: resource.id,
                              label: resource.title,
                            })
                        }}
                      >
                        {mode === 'workflow' ? (
                          <WorkflowIcon className="size-4" aria-hidden />
                        ) : (
                          <BookOpen className="size-4" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1 truncate text-left">{resource.title}</span>
                        {checked && <Check className="text-success size-4 shrink-0" aria-hidden />}
                      </Button>
                    )
                  })}
              {mode !== 'nodes' && catalog.loading && (
                <p role="status" className="text-muted-foreground p-2 text-xs">
                  正在加载资源…
                </p>
              )}
              {mode !== 'nodes' && catalog.loadError && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={catalog.reload}
                >
                  重新加载资源
                </Button>
              )}
              {(mode === 'nodes' ? !nodeItems.length : catalog.loaded && !resourceItems.length) && (
                <p className="text-muted-foreground p-2 text-xs">
                  没有匹配的
                  {mode === 'nodes' ? '节点' : mode === 'workflow' ? '已发布工作流' : '知识库'}
                </p>
              )}
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  )
}

export function AgentComposerTriggers() {
  const agent = useWorkflowAgent(),
    { nodeRegistry } = useWorkflowCatalog(),
    text = useAuiState((s) => s.composer.text),
    attachments = useAuiState((s) => s.composer.attachments),
    workflows = useWorkflowStudioAppCatalog(),
    knowledge = useWorkflowKnowledgeBaseCatalog(),
    mentions = unstable_useSlashCommandAdapter({
      removeOnExecute: true,
      commands: agent.nodes.map((node) => ({
        id: node.id,
        label: node.label ?? nodeRegistry.get(node.type)?.definition.label ?? node.type,
        description: '画布节点',
        execute: () => agent.addNodes([node.id]),
      })),
    }),
    slash = unstable_useSlashCommandAdapter({
      removeOnExecute: true,
      commands: [
        ...workflows.apps.map((app) => ({
          id: `workflow:${app.id}`,
          label: app.title,
          description: '工作流 · 已发布',
          icon: 'workflow',
          execute: () => agent.addResource({ kind: 'workflow', id: app.id, label: app.title }),
        })),
        ...knowledge.knowledgeBases.map((base) => ({
          id: `knowledge-base:${base.id}`,
          label: base.title,
          description: '知识库',
          icon: 'knowledge-base',
          execute: () =>
            agent.addResource({ kind: 'knowledge-base', id: base.id, label: base.title }),
        })),
      ],
    })
  useEffect(() => {
    if (agent.enabled && text.includes('/')) {
      workflows.load()
      knowledge.load()
    }
  }, [agent.enabled, text, workflows.load, knowledge.load])
  return (
    <>
      {(
        [
          { char: '@', config: mentions },
          { char: '/', config: slash },
        ] as const
      ).map(({ char, config }) => (
        <ComposerPrimitive.TriggerPopover
          key={char}
          char={char}
          adapter={config.adapter}
          isLoading={char === '/' && (workflows.loading || knowledge.loading)}
          className="bg-popover text-popover-foreground border-border absolute right-3 bottom-full left-3 z-50 mb-2 max-h-64 overflow-y-auto rounded-xl border-[0.5px] p-1.5 shadow-lg"
        >
          <ComposerPrimitive.TriggerPopover.Action {...config.action} />
          <ComposerPrimitive.TriggerPopoverItems
            aria-label={char === '@' ? '选择节点' : '选择工作流或知识库'}
          >
            {(items) => (
              <>
                {char === '@' && (
                  <p className="text-muted-foreground px-2 py-1.5 text-xs">画布节点</p>
                )}
                {items.map((item, index) => {
                  const node =
                      char === '@'
                        ? agent.nodes.find((candidate) => candidate.id === item.id)
                        : undefined,
                    checked = attachments.some(
                      (attachment) =>
                        attachment.id ===
                        (char === '@' ? `workflow-node:${item.id}` : `agent-resource:${item.id}`),
                    )
                  return (
                    <Fragment key={item.id}>
                      {char === '/' &&
                        (index === 0 ||
                          items[index - 1]?.metadata?.icon !== item.metadata?.icon) && (
                          <p className="text-muted-foreground px-2 py-1.5 text-xs">
                            {item.metadata?.icon === 'workflow' ? '工作流' : '知识库'}
                          </p>
                        )}
                      <ComposerPrimitive.TriggerPopoverItem
                        item={item}
                        index={index}
                        aria-description={char === '/' ? item.description : undefined}
                        className="hover:bg-accent focus-visible:bg-accent data-[highlighted]:bg-accent flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-left text-sm outline-none"
                      >
                        {node ? (
                          <NodeIconBadge
                            type={node.type}
                            icon={nodeRegistry.get(node.type)?.definition.icon}
                            className="size-5 rounded"
                          />
                        ) : item.metadata?.icon === 'workflow' ? (
                          <WorkflowIcon className="size-4 shrink-0" aria-hidden />
                        ) : (
                          <BookOpen className="size-4 shrink-0" aria-hidden />
                        )}
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {checked && (
                          <>
                            <Check className="text-success size-4 shrink-0" aria-hidden />
                            <span className="sr-only">已选择</span>
                          </>
                        )}
                      </ComposerPrimitive.TriggerPopoverItem>
                    </Fragment>
                  )
                })}
                {!items.length && (
                  <p role="status" className="text-muted-foreground px-2 py-2 text-xs">
                    {char === '/' && (workflows.loading || knowledge.loading)
                      ? '正在加载资源…'
                      : '没有匹配项'}
                  </p>
                )}
                {char === '/' && (workflows.loadError || knowledge.loadError) && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      workflows.reload()
                      knowledge.reload()
                    }}
                  >
                    重新加载资源
                  </Button>
                )}
              </>
            )}
          </ComposerPrimitive.TriggerPopoverItems>
        </ComposerPrimitive.TriggerPopover>
      ))}
    </>
  )
}
