import { ENVIRONMENT_VARIABLE_TYPES, workflowSchema } from '@ai-workflow/core'
import { z } from 'zod'

import type { WorkflowEditorSnapshot } from '@/components/workflow/types'

export interface WorkflowApplicationMetadata {
  id: string
  title: string
  description?: string
  icon?: string
}

const pointSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
})

const sizeSchema = z.object({
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
})

const workflowLayoutSchema = z.object({
  positions: z.record(z.string(), pointSchema),
  viewport: z
    .object({
      x: z.number().finite(),
      y: z.number().finite(),
      zoom: z.number().finite().positive(),
    })
    .optional(),
  sizes: z.record(z.string(), sizeSchema).optional(),
})

const workflowApplicationDslSchema = z.object({
  dslVersion: z.literal(1),
  workflow: z.object({
    definition: workflowSchema,
    layout: workflowLayoutSchema,
  }),
})

export function parseWorkflowApplicationDsl(value: unknown): WorkflowEditorSnapshot {
  const result = workflowApplicationDslSchema.safeParse(value)

  if (!result.success) {
    const issue = result.error.issues[0]
    const path = issue?.path.join('.')
    throw new Error(path ? `${path}：${issue.message}` : '应用 DSL 格式无效')
  }

  return {
    workflow: result.data.workflow.definition,
    layout: result.data.workflow.layout,
  }
}

function sanitizeFilename(value: string) {
  const forbiddenCharacters = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*'])
  const sanitizedValue = [...value]
    .map((character) =>
      character.charCodeAt(0) < 32 || forbiddenCharacters.has(character) ? '-' : character,
    )
    .join('')

  return sanitizedValue.replace(/\s+/g, ' ').trim()
}

export function downloadWorkflowApplicationDsl(
  snapshot: WorkflowEditorSnapshot,
  applicationMetadata?: WorkflowApplicationMetadata,
) {
  const application = applicationMetadata ?? {
    id: snapshot.workflow.id,
    title: snapshot.workflow.name,
    description: snapshot.workflow.description,
  }
  const definition = {
    ...snapshot.workflow,
    name: application.title,
    description: application.description,
    environmentVariables: snapshot.workflow.environmentVariables.map((variable) =>
      variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET ? { ...variable, value: '' } : variable,
    ),
  }
  const content = JSON.stringify(
    {
      dslVersion: 1,
      app: {
        id: application.id,
        title: application.title,
        description: application.description,
        icon: application.icon,
      },
      workflow: {
        schemaVersion: 1,
        revision: 1,
        definition,
        layout: snapshot.layout,
      },
    },
    null,
    2,
  )
  const blob = new Blob([`${content}\n`], { type: 'application/json;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = url
  anchor.download = `${sanitizeFilename(application.title) || 'workflow'}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}
