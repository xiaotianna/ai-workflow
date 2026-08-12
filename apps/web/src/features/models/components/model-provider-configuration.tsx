import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { ExternalLink } from 'lucide-react'

import {
  type ModelProviderConfigurationFieldName,
  type ModelProviderStrategy,
} from '../provider-strategies'
import { type ModelGroupFormInput } from '../schema'

interface ModelProviderConfigurationProps {
  savedApiKey?: string
  strategy: ModelProviderStrategy
  values: ModelGroupFormInput
  getFieldError: (name: ModelProviderConfigurationFieldName) => string | undefined
  onFieldBlur: (name: ModelProviderConfigurationFieldName) => void
  onFieldChange: (name: ModelProviderConfigurationFieldName, value: string) => void
}

export function ModelProviderConfiguration({
  savedApiKey,
  strategy,
  values,
  getFieldError,
  onFieldBlur,
  onFieldChange,
}: ModelProviderConfigurationProps) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        {strategy.configurationFields.map((field) => {
          const error = getFieldError(field.name),
            isSavedApiKey =
              field.name === 'apiKey' && Boolean(savedApiKey) && values.apiKey === savedApiKey

          return (
            <Form.Field key={field.name} label={field.label} error={error}>
              <Input
                type={isSavedApiKey ? 'text' : field.type}
                value={values[field.name]}
                onChange={(event) => onFieldChange(field.name, event.target.value)}
                onBlur={() => onFieldBlur(field.name)}
                aria-label={`${field.label}（可选）`}
                aria-invalid={Boolean(error)}
                autoComplete={field.autoComplete}
                maxLength={field.maxLength}
                placeholder={field.placeholder}
              />
            </Form.Field>
          )
        })}
      </div>

      <a
        href={strategy.apiDocsUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`查看 ${strategy.label} API 文档（在新窗口打开）`}
        className="text-primary hover:text-primary/80 focus-visible:text-primary/80 flex w-fit items-center gap-1 text-xs font-medium underline-offset-4 transition-colors outline-none hover:underline focus-visible:underline"
      >
        查看 {strategy.label} API 文档
        <ExternalLink aria-hidden className="size-3.5" />
      </a>
    </>
  )
}
