import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ai-workflow/ui/components/select'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { Plus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'

import { getModelProviderStrategy, modelProviderStrategies } from '../provider-strategies'
import {
  createEmptyModelGroupForm,
  createEmptyModelItem,
  modelConnectionFormSchema,
  modelGroupFormSchema,
  toModelGroupFormInput,
  type ModelGroup,
  type ModelGroupFormInput,
  type ModelGroupInput,
  type ModelItemFormInput,
  type ModelProviderType,
} from '../schema'
import { ModelProviderConfiguration } from './model-provider-configuration'

const CONNECTION_TEST_TIMEOUT_MS = 10_000

interface ModelGroupDialogProps {
  group?: ModelGroup
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (input: ModelGroupInput) => void
}

export function ModelGroupDialog({ group, open, onOpenChange, onSave }: ModelGroupDialogProps) {
  const { form, setForm, updateForm, updateFormField, resetForm } =
    useFormData<ModelGroupFormInput>(createEmptyModelGroupForm())
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const connectionTestControllerRef = useRef<AbortController | null>(null)
  const validationResult = validateFormByZod(modelGroupFormSchema, form)
  const connectionValidationResult = validateFormByZod(modelConnectionFormSchema, {
    providerType: form.providerType,
    baseUrl: form.baseUrl,
  })
  const formErrors = validationResult.errors
  const providerStrategy = getModelProviderStrategy(form.providerType)

  useEffect(() => {
    if (!open) return

    connectionTestControllerRef.current?.abort()
    connectionTestControllerRef.current = null
    setForm(group ? toModelGroupFormInput(group) : createEmptyModelGroupForm())
    setTouchedFields({})
    setSubmitted(false)
    setIsTestingConnection(false)
  }, [group, open, setForm])

  useEffect(
    () => () => {
      connectionTestControllerRef.current?.abort()
    },
    [],
  )

  function markFieldTouched(path: string) {
    setTouchedFields((currentFields) => ({
      ...currentFields,
      [path]: true,
    }))
  }

  function getFieldError(path: string) {
    return submitted || touchedFields[path] ? formErrors[path] : undefined
  }

  function updateModel(index: number, values: Partial<ModelItemFormInput>) {
    updateFormField('models', (models) =>
      models.map((model, modelIndex) =>
        modelIndex === index
          ? {
              ...model,
              ...values,
            }
          : model,
      ),
    )
  }

  function addModel(afterIndex: number) {
    updateFormField('models', (models) => {
      const nextModels = [...models]
      nextModels.splice(afterIndex + 1, 0, createEmptyModelItem())
      return nextModels
    })
  }

  function removeModel(index: number) {
    updateFormField('models', (models) =>
      models.length > 1 ? models.filter((_, modelIndex) => modelIndex !== index) : models,
    )
  }

  function cancelConnectionTest() {
    connectionTestControllerRef.current?.abort()
    connectionTestControllerRef.current = null
    setIsTestingConnection(false)
  }

  function resetDialogForm() {
    cancelConnectionTest()
    resetForm()
    setTouchedFields({})
    setSubmitted(false)
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) resetDialogForm()
    onOpenChange(nextOpen)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitted(true)

    const result = validateFormByZod(modelGroupFormSchema, form)
    if (!result.success) return

    onSave(result.data)
    resetDialogForm()
    onOpenChange(false)
  }

  async function handleTestConnection() {
    const result = validateFormByZod(modelConnectionFormSchema, {
      providerType: form.providerType,
      baseUrl: form.baseUrl,
    })
    if (!result.success) return

    cancelConnectionTest()

    const controller = new AbortController()
    let didTimeout = false
    connectionTestControllerRef.current = controller
    setIsTestingConnection(true)

    const timeoutId = globalThis.setTimeout(() => {
      didTimeout = true
      controller.abort()
    }, CONNECTION_TEST_TIMEOUT_MS)

    try {
      await providerStrategy.testConnection(result.data, controller.signal)

      if (connectionTestControllerRef.current !== controller) return
      showToast('success', `${providerStrategy.label} 服务可达`)
    } catch (error) {
      if (controller.signal.aborted && !didTimeout) return

      showToast(
        'error',
        didTimeout ? '连接超时，请检查服务地址和网络' : getConnectionTestErrorMessage(error),
      )
    } finally {
      globalThis.clearTimeout(timeoutId)

      if (connectionTestControllerRef.current === controller) {
        connectionTestControllerRef.current = null
        setIsTestingConnection(false)
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-h-[calc(100svh-2rem)] max-w-3xl grid-rows-[auto_minmax(0,1fr)]"
      >
        <DialogHeader>
          <DialogTitle>{group ? '编辑模型组' : '新增模型组'}</DialogTitle>
        </DialogHeader>

        <Form onSubmit={handleSubmit} className="flex min-h-0 flex-col">
          <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Form.Field required label="模型组名称" error={getFieldError('name')}>
                  <Input
                    value={form.name}
                    onChange={(event) => updateFormField('name', event.target.value)}
                    onBlur={() => markFieldTouched('name')}
                    aria-label="模型组名称"
                    aria-invalid={Boolean(getFieldError('name'))}
                    maxLength={40}
                    autoComplete="off"
                    placeholder="例如：生产环境 OpenAI"
                  />
                </Form.Field>

                <Form.Field required label="供应商类型" error={getFieldError('providerType')}>
                  <Select
                    value={form.providerType}
                    onValueChange={(value) => {
                      cancelConnectionTest()
                      updateForm({
                        providerType: value as ModelProviderType,
                        baseUrl: '',
                        apiKey: '',
                      })
                    }}
                  >
                    <SelectTrigger
                      aria-label="供应商类型"
                      aria-invalid={Boolean(getFieldError('providerType'))}
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent position="popper" align="start">
                      {modelProviderStrategies.map(({ icon: ProviderIcon, label, type }) => (
                        <SelectItem key={type} value={type}>
                          <ProviderIcon aria-hidden className="size-4" />
                          <span>{label}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Form.Field>
              </div>

              <ModelProviderConfiguration
                strategy={providerStrategy}
                values={form}
                getFieldError={getFieldError}
                onFieldBlur={markFieldTouched}
                onFieldChange={(name, value) => {
                  cancelConnectionTest()
                  updateFormField(name, value)
                }}
              />
            </div>

            <Form.Field
              required
              label="模型列表"
              actions={
                <span className="text-muted-foreground text-xs font-normal">
                  {form.models.length} / 30
                </span>
              }
              error={submitted ? formErrors.models || formErrors.form : undefined}
            >
              <div className="space-y-2">
                {form.models.map((model, index) => {
                  const modelIdPath = `models.${index}.modelId`
                  const displayNamePath = `models.${index}.displayName`
                  const modelIdError = getFieldError(modelIdPath)
                  const displayNameError = getFieldError(displayNamePath)

                  return (
                    <div
                      key={index}
                      className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto_auto]"
                    >
                      <div className="min-w-0">
                        <Input
                          value={model.modelId}
                          onChange={(event) => updateModel(index, { modelId: event.target.value })}
                          onBlur={() => markFieldTouched(modelIdPath)}
                          aria-label={`模型 ${index + 1} ID`}
                          aria-invalid={Boolean(modelIdError)}
                          maxLength={100}
                          autoComplete="off"
                          placeholder="模型 ID（如 gpt-4.1）"
                        />
                        {modelIdError ? (
                          <p className="text-destructive mt-1.5 px-0.5 text-xs leading-4">
                            {modelIdError}
                          </p>
                        ) : null}
                      </div>

                      <div className="min-w-0">
                        <Input
                          value={model.displayName}
                          onChange={(event) =>
                            updateModel(index, { displayName: event.target.value })
                          }
                          onBlur={() => markFieldTouched(displayNamePath)}
                          aria-label={`模型 ${index + 1} 显示名称（可选）`}
                          aria-invalid={Boolean(displayNameError)}
                          maxLength={100}
                          autoComplete="off"
                          placeholder="显示名称（可选）"
                        />
                        {displayNameError ? (
                          <p className="text-destructive mt-1.5 px-0.5 text-xs leading-4">
                            {displayNameError}
                          </p>
                        ) : null}
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`在模型 ${index + 1} 后添加模型`}
                        disabled={form.models.length >= 30}
                        onClick={() => addModel(index)}
                      >
                        <Plus aria-hidden />
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={`删除模型 ${index + 1}`}
                        disabled={form.models.length === 1}
                        onClick={() => removeModel(index)}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
                      >
                        <Trash2 aria-hidden />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </Form.Field>
          </div>

          <DialogFooter className="mt-4 pt-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={isTestingConnection || !connectionValidationResult.success}
              onClick={handleTestConnection}
            >
              {isTestingConnection ? '测试中...' : '测试连通性'}
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary" size="sm">
                取消
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="confirm"
              size="sm"
              disabled={isTestingConnection || !validationResult.success}
            >
              {group ? '保存' : '创建'}
            </Button>
          </DialogFooter>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function getConnectionTestErrorMessage(error: unknown) {
  if (error instanceof TypeError) {
    return '无法连接到模型服务，请检查 Base URL、网络和跨域配置'
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return '测试连接失败，请稍后重试'
}
