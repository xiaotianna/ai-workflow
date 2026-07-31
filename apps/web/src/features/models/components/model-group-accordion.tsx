import { Button } from '@ai-workflow/ui/components/button'
import { DropdownMenu, DropdownMenuTrigger } from '@ai-workflow/ui/components/dropdown-menu'
import { Switch } from '@ai-workflow/ui/components/switch'
import { ChevronDown, MoreHorizontal } from 'lucide-react'
import { AnimatePresence, motion, MotionConfig } from 'motion/react'
import { useState } from 'react'

import { ActionMenuContent, type ActionMenuAction } from '@/components/action-menu-content'

import { getModelProviderStrategy } from '../provider-strategies'
import { type ModelGroup } from '../schema'

interface ModelGroupAccordionItemProps {
  group: ModelGroup
  onDelete: (group: ModelGroup) => void
  onEdit: (group: ModelGroup) => void
  onGroupEnabledChange: (groupId: string, enabled: boolean) => void
  onModelEnabledChange: (groupId: string, modelId: string, enabled: boolean) => void
}

function ModelGroupAccordionItem({
  group,
  onDelete,
  onEdit,
  onGroupEnabledChange,
  onModelEnabledChange,
}: ModelGroupAccordionItemProps) {
  const [open, setOpen] = useState(false)
  const strategy = getModelProviderStrategy(group.providerType)
  const ProviderIcon = strategy.icon
  const contentId = `model-group-${group.id}`
  const actions: ActionMenuAction[] = [
    {
      id: 'edit',
      label: '编辑',
      onSelect: () => onEdit(group),
    },
    {
      id: 'delete',
      label: '删除',
      destructive: true,
      separatorBefore: true,
      onSelect: () => onDelete(group),
    },
  ]

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ height: 0, opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className="border-border/50 overflow-hidden border-b-[0.5px] last:border-b-0"
    >
      <div className="hover:bg-input flex min-h-16 items-center gap-2 px-4 transition-colors">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((currentOpen) => !currentOpen)}
          className="focus-visible:text-primary flex min-w-0 flex-1 cursor-pointer items-center gap-3 self-stretch py-2 text-left outline-none"
        >
          <span className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-xl">
            <ProviderIcon aria-hidden className="text-foreground size-5" />
          </span>

          <span className="min-w-0 flex-1">
            <span className="text-foreground block truncate text-[15px] leading-5 font-semibold">
              {group.name}
            </span>
            <span className="text-muted-foreground mt-0.5 block truncate text-xs leading-4">
              {group.models.length} 个可用模型
            </span>
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <Switch
            checked={group.enabled}
            onCheckedChange={(enabled) => onGroupEnabledChange(group.id, enabled)}
            aria-label={`${group.enabled ? '停用' : '启用'}模型组 ${group.name}`}
            className="mr-2"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${group.name} 的更多操作`}
                className="text-muted-foreground hover:bg-button-secondary-bg-active focus-visible:bg-button-secondary-bg-active aria-expanded:bg-button-secondary-bg-active"
              >
                <MoreHorizontal aria-hidden className="size-4" />
              </Button>
            </DropdownMenuTrigger>

            <ActionMenuContent actions={actions} sideOffset={6} />
          </DropdownMenu>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={`${open ? '收起' : '展开'}模型组 ${group.name}`}
          aria-expanded={open}
          aria-controls={contentId}
          onClick={() => setOpen((currentOpen) => !currentOpen)}
          className="hover:bg-button-secondary-bg-active focus-visible:bg-button-secondary-bg-active aria-expanded:hover:bg-button-secondary-bg-active aria-expanded:focus-visible:bg-button-secondary-bg-active dark:hover:bg-button-secondary-bg-active dark:focus-visible:bg-button-secondary-bg-active dark:aria-expanded:hover:bg-button-secondary-bg-active dark:aria-expanded:focus-visible:bg-button-secondary-bg-active aria-expanded:bg-transparent aria-expanded:text-inherit"
        >
          <motion.span
            aria-hidden
            animate={{ rotate: open ? 180 : 0 }}
            transition={{ duration: 0.18 }}
            className="text-muted-foreground flex size-4 items-center justify-center"
          >
            <ChevronDown className="size-4" />
          </motion.span>
        </Button>
      </div>

      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={contentId}
            role="region"
            aria-label={`${group.name} 模型列表`}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-border/50 border-t-[0.5px]">
              {group.models.map((model) => {
                const displayName = model.displayName || model.modelId

                return (
                  <motion.div
                    layout
                    key={model.modelId}
                    className="border-border/50 hover:bg-input flex min-h-11 items-center gap-3 border-b-[0.5px] px-5 py-2 transition-colors last:border-b-0"
                  >
                    <div className="min-w-0 flex-1 pl-12">
                      <p className="text-foreground truncate text-sm font-normal">{displayName}</p>
                    </div>

                    <Switch
                      checked={model.enabled}
                      onCheckedChange={(enabled) =>
                        onModelEnabledChange(group.id, model.modelId, enabled)
                      }
                      aria-label={`${model.enabled ? '停用' : '启用'}模型 ${displayName}`}
                    />
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.article>
  )
}

interface ModelGroupAccordionProps {
  groups: readonly ModelGroup[]
  onDelete: (group: ModelGroup) => void
  onEdit: (group: ModelGroup) => void
  onGroupEnabledChange: (groupId: string, enabled: boolean) => void
  onModelEnabledChange: (groupId: string, modelId: string, enabled: boolean) => void
}

export function ModelGroupAccordion({
  groups,
  onDelete,
  onEdit,
  onGroupEnabledChange,
  onModelEnabledChange,
}: ModelGroupAccordionProps) {
  if (groups.length === 0) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
        <p className="text-foreground text-sm font-medium">还没有模型组</p>
        <p className="text-muted-foreground mt-1 text-xs">添加供应商并配置可用的模型列表</p>
      </div>
    )
  }

  return (
    <MotionConfig reducedMotion="user">
      <motion.div
        layout
        className="border-border/50 bg-background overflow-hidden rounded-2xl border-[0.5px] shadow-xs"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {groups.map((group) => (
            <ModelGroupAccordionItem
              key={group.id}
              group={group}
              onDelete={onDelete}
              onEdit={onEdit}
              onGroupEnabledChange={onGroupEnabledChange}
              onModelEnabledChange={onModelEnabledChange}
            />
          ))}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  )
}
