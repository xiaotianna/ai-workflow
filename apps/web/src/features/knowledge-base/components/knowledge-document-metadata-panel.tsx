import {
  createKnowledgeMetadataField,
  deleteKnowledgeMetadataField,
  listKnowledgeMetadataFields,
  updateKnowledgeDocumentMetadata,
  updateKnowledgeMetadataField,
  type KnowledgeDocumentDto,
  type KnowledgeMetadataFieldDto,
  type KnowledgeMetadataFieldType,
} from '@/api/knowledge-bases'
import { useFormData } from '@ai-workflow/shared/hooks/use-form-data'
import { validateFormByZod } from '@ai-workflow/shared/utils/validate-form-by-zod'
import { Button } from '@ai-workflow/ui/components/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ai-workflow/ui/components/dialog'
import { Form } from '@ai-workflow/ui/components/form'
import { Input } from '@ai-workflow/ui/components/input'
import { Popover, PopoverContent, PopoverTrigger } from '@ai-workflow/ui/components/popover'
import { Skeleton } from '@ai-workflow/ui/components/skeleton'
import { showToast } from '@ai-workflow/ui/lib/toast'
import { cn } from '@ai-workflow/ui/lib/utils'
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CircleHelp,
  Hash,
  PencilLine,
  Plus,
  Search,
  TextCursorInput,
  Trash2,
} from 'lucide-react'
import { Fragment, useEffect, useState, type FormEvent } from 'react'

import {
  createKnowledgeDocumentMetadataSchema,
  KNOWLEDGE_METADATA_FIELD_INITIAL_VALUES,
  knowledgeMetadataFieldSchema,
  type KnowledgeDocumentMetadataFormInput,
  type KnowledgeMetadataFieldFormInput,
} from '../schema'

const metadataTypeLabels: Record<KnowledgeMetadataFieldType, string> = {
  string: 'String',
  number: 'Number',
  time: 'Time',
}

const metadataTypeIcons = {
  string: TextCursorInput,
  number: Hash,
  time: CalendarClock,
} satisfies Record<KnowledgeMetadataFieldType, typeof TextCursorInput>

function toLocalDateTimeInput(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function createMetadataFormValues(
  document: KnowledgeDocumentDto,
  fields: KnowledgeMetadataFieldDto[],
): KnowledgeDocumentMetadataFormInput {
  const fieldsById = new Map(fields.map((field) => [field.id, field]))
  return {
    values: Object.fromEntries(
      Object.entries(document.metadata).flatMap(([fieldId, value]) => {
        const field = fieldsById.get(fieldId)
        if (!field) return []
        if (field.type === 'time' && typeof value === 'string') {
          return [[fieldId, toLocalDateTimeInput(value)]]
        }
        return [[fieldId, value]]
      }),
    ),
  }
}

function MetadataFieldForm({
  field,
  saving,
  onBack,
  onSave,
}: {
  field?: KnowledgeMetadataFieldDto
  saving: boolean
  onBack: () => void
  onSave: (values: KnowledgeMetadataFieldFormInput) => Promise<void>
}) {
  const { form, setForm, updateFormField } = useFormData<KnowledgeMetadataFieldFormInput>(
    field ? { name: field.name, type: field.type } : { ...KNOWLEDGE_METADATA_FIELD_INITIAL_VALUES },
  )
  const [touched, setTouched] = useState(false)
  const validation = validateFormByZod(knowledgeMetadataFieldSchema, form)
  const nameError = validation.success ? undefined : validation.errors.name

  useEffect(() => {
    setForm(
      field
        ? { name: field.name, type: field.type }
        : { ...KNOWLEDGE_METADATA_FIELD_INITIAL_VALUES },
    )
    setTouched(false)
  }, [field, setForm])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setTouched(true)
    const result = validateFormByZod(knowledgeMetadataFieldSchema, form)
    if (!result.success) return
    await onSave(result.data)
  }

  return (
    <Form className="space-y-3 p-3" onSubmit={handleSubmit}>
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="text-primary -ml-1.5 px-1.5"
        disabled={saving}
        onClick={onBack}
      >
        <ArrowLeft aria-hidden className="size-3.5" />
        返回
      </Button>

      <h3 className="text-sm leading-5 font-semibold">{field ? '编辑元数据' : '新建元数据'}</h3>

      <Form.Field required label="类型">
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(metadataTypeLabels) as KnowledgeMetadataFieldType[]).map((type) => (
            <Button
              key={type}
              type="button"
              variant={form.type === type ? 'default' : 'secondary'}
              className={cn('h-8 text-[13px]', form.type === type && 'shadow-none')}
              disabled={saving}
              aria-pressed={form.type === type}
              onClick={() => updateFormField('type', type)}
            >
              {metadataTypeLabels[type]}
            </Button>
          ))}
        </div>
      </Form.Field>

      <Form.Field required label="名称" error={touched ? nameError : undefined}>
        <Input
          aria-label="元数据名称"
          aria-invalid={Boolean(touched && nameError)}
          placeholder="添加元数据名称"
          className="h-8 text-[13px]"
          maxLength={40}
          disabled={saving}
          value={form.name}
          onBlur={() => setTouched(true)}
          onChange={(event) => updateFormField('name', event.target.value)}
        />
      </Form.Field>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={onBack}>
          取消
        </Button>
        <Button type="submit" variant="confirm" size="sm" disabled={!validation.success || saving}>
          {saving ? '保存中…' : '保存'}
        </Button>
      </div>
    </Form>
  )
}

export function KnowledgeDocumentMetadataPanel({
  disabled,
  document,
  knowledgeBaseId,
  onDocumentChange,
}: {
  disabled: boolean
  document?: KnowledgeDocumentDto
  knowledgeBaseId: string
  onDocumentChange: (document: KnowledgeDocumentDto) => void
}) {
  const { form, setForm, updateFormField } = useFormData<KnowledgeDocumentMetadataFormInput>({
    values: {},
  })
  const [annotating, setAnnotating] = useState(false)
  const [fields, setFields] = useState<KnowledgeMetadataFieldDto[]>([])
  const [fieldsLoaded, setFieldsLoaded] = useState(false)
  const [loadingFields, setLoadingFields] = useState(false)
  const [saving, setSaving] = useState(false)
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverMode, setPopoverMode] = useState<'list' | 'create' | 'edit'>('list')
  const [editingField, setEditingField] = useState<KnowledgeMetadataFieldDto>()
  const [deletingField, setDeletingField] = useState<KnowledgeMetadataFieldDto>()
  const [mutatingField, setMutatingField] = useState(false)
  const [search, setSearch] = useState('')
  const metadataSchema = createKnowledgeDocumentMetadataSchema(fields)
  const validation = validateFormByZod(metadataSchema, form)
  const documentMetadataEntries = Object.entries(document?.metadata ?? {})
  const hasDocumentMetadata = documentMetadataEntries.length > 0
  const selectedFields = fields.filter((field) => field.id in form.values)
  const filteredFields = fields.filter((field) =>
    field.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )

  useEffect(() => {
    setAnnotating(false)
    setFields([])
    setFieldsLoaded(false)
    setForm({ values: {} })
    setPopoverOpen(false)
  }, [document?.id, setForm])

  useEffect(() => {
    if (annotating || fieldsLoaded || !document || Object.keys(document.metadata).length === 0) {
      return
    }

    let cancelled = false
    setLoadingFields(true)
    void listKnowledgeMetadataFields(knowledgeBaseId)
      .then((result) => {
        if (cancelled) return
        setFields(result)
        setFieldsLoaded(true)
        setForm(createMetadataFormValues(document, result))
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoadingFields(false)
      })

    return () => {
      cancelled = true
    }
  }, [annotating, document, fieldsLoaded, knowledgeBaseId, setForm])

  async function loadFields() {
    setLoadingFields(true)
    try {
      const result = await listKnowledgeMetadataFields(knowledgeBaseId)
      setFields(result)
      setFieldsLoaded(true)
      if (document) setForm(createMetadataFormValues(document, result))
    } finally {
      setLoadingFields(false)
    }
  }

  async function handleStart() {
    if (!document) return
    setAnnotating(true)
    if (fieldsLoaded) {
      setForm(createMetadataFormValues(document, fields))
      return
    }
    try {
      await loadFields()
    } catch {
      setAnnotating(false)
    }
  }

  function handleCancel() {
    if (document) setForm(createMetadataFormValues(document, fields))
    setAnnotating(false)
    setPopoverOpen(false)
  }

  async function handleSave() {
    if (!document || saving) return
    const result = validateFormByZod(metadataSchema, form)
    if (!result.success) return
    setSaving(true)
    try {
      const updated = await updateKnowledgeDocumentMetadata(
        knowledgeBaseId,
        document.id,
        result.data.values,
      )
      onDocumentChange(updated)
      setAnnotating(false)
      setPopoverOpen(false)
      showToast('success', '文档元数据已保存')
    } finally {
      setSaving(false)
    }
  }

  function addFieldToDocument(field: KnowledgeMetadataFieldDto) {
    if (field.id in form.values) return
    updateFormField('values', { ...form.values, [field.id]: '' })
    setPopoverOpen(false)
  }

  function removeFieldFromDocument(fieldId: string) {
    const values = { ...form.values }
    delete values[fieldId]
    updateFormField('values', values)
  }

  async function handleFieldSave(values: KnowledgeMetadataFieldFormInput) {
    setMutatingField(true)
    try {
      if (popoverMode === 'edit' && editingField) {
        const updated = await updateKnowledgeMetadataField(knowledgeBaseId, editingField.id, values)
        setFields((current) => current.map((field) => (field.id === updated.id ? updated : field)))
        if (updated.type !== editingField.type && updated.id in form.values) {
          updateFormField('values', { ...form.values, [updated.id]: '' })
          if (document) {
            const metadata = { ...document.metadata }
            delete metadata[updated.id]
            onDocumentChange({ ...document, metadata })
          }
        }
        setPopoverMode('list')
        setEditingField(undefined)
        showToast('success', '元数据字段已更新')
        return
      }

      const created = await createKnowledgeMetadataField(knowledgeBaseId, values)
      setFields((current) => [...current, created])
      updateFormField('values', { ...form.values, [created.id]: '' })
      setPopoverOpen(false)
      showToast('success', '元数据字段已创建')
    } finally {
      setMutatingField(false)
    }
  }

  async function handleFieldDelete() {
    if (!deletingField || mutatingField) return
    const field = deletingField
    setMutatingField(true)
    try {
      await deleteKnowledgeMetadataField(knowledgeBaseId, field.id)
      setFields((current) => current.filter((item) => item.id !== field.id))
      removeFieldFromDocument(field.id)
      if (document) {
        const metadata = { ...document.metadata }
        delete metadata[field.id]
        onDocumentChange({ ...document, metadata })
      }
      setDeletingField(undefined)
      showToast('success', '元数据字段已删除')
    } finally {
      setMutatingField(false)
    }
  }

  if (!annotating) {
    if (hasDocumentMetadata) {
      return (
        <section aria-label="文档元数据" className="pl-2">
          <div className="flex min-h-8 items-center gap-2">
            <h2 className="text-sm leading-5 font-semibold">元数据</h2>
            <CircleHelp aria-hidden className="text-muted-foreground/60 size-3.5" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground -mr-2 ml-auto"
              aria-label="编辑文档元数据"
              disabled={disabled}
              onClick={handleStart}
            >
              <PencilLine aria-hidden className="size-3.5" />
              编辑
            </Button>
          </div>

          {loadingFields ? (
            <div
              role="status"
              aria-label="正在加载元数据"
              className="mt-3 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 gap-y-1"
            >
              <Skeleton className="my-1 h-4 w-16 rounded" />
              <Skeleton className="my-1 h-4 w-24 rounded" />
              <Skeleton className="my-1 h-4 w-20 rounded" />
              <Skeleton className="my-1 h-4 w-16 rounded" />
            </div>
          ) : (
            <dl className="mt-3 grid grid-cols-[8rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs leading-4">
              {documentMetadataEntries.map(([fieldId, value]) => (
                <Fragment key={fieldId}>
                  <dt className="text-muted-foreground truncate py-1 font-medium">
                    {fields.find((field) => field.id === fieldId)?.name ?? '元数据'}
                  </dt>
                  <dd className="min-w-0 py-1 break-all">{String(value)}</dd>
                </Fragment>
              ))}
            </dl>
          )}
        </section>
      )
    }

    return (
      <section className="bg-input rounded-xl p-4">
        <h2 className="text-foreground text-xs leading-5 font-semibold">元数据</h2>
        <p className="text-muted-foreground mt-1 text-xs leading-5">
          元数据是关于文档的数据，用于描述文档的属性。元数据可以帮助您更好地组织和管理文档。
        </p>
        <Button type="button" size="sm" className="mt-2" disabled={disabled} onClick={handleStart}>
          开始标注
          <ArrowRight aria-hidden className="size-4" />
        </Button>
      </section>
    )
  }

  return (
    <>
      <section aria-label="文档元数据标注">
        <div className="flex min-h-8 items-center gap-2">
          <h2 className="text-sm leading-5 font-semibold">元数据</h2>
          <CircleHelp aria-hidden className="text-muted-foreground/60 size-3.5" />
          <div className="ml-auto flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving}
              onClick={handleCancel}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="confirm"
              size="sm"
              disabled={loadingFields || !validation.success || saving}
              onClick={() => void handleSave()}
            >
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
        </div>

        <Popover
          open={popoverOpen}
          onOpenChange={(open) => {
            if (mutatingField) return
            setPopoverOpen(open)
            if (!open) {
              setPopoverMode('list')
              setEditingField(undefined)
              setSearch('')
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="bg-input hover:bg-muted focus-visible:bg-muted mt-2 h-8 w-full justify-center rounded-lg text-[13px]"
              disabled={loadingFields || saving}
            >
              <Plus aria-hidden className="size-4" />
              添加元数据
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="end"
            sideOffset={8}
            className="w-[min(20rem,calc(100vw-2rem))] p-0"
          >
            {popoverMode === 'list' ? (
              <div className="overflow-hidden">
                <div className="p-2">
                  <div className="relative">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="搜索元数据"
                      aria-label="搜索元数据字段"
                      className="h-8 pl-8 text-[13px]"
                    />
                  </div>
                </div>

                <div className="max-h-44 overflow-auto px-1.5 pb-1.5">
                  {filteredFields.length ? (
                    filteredFields.map((field) => {
                      const Icon = metadataTypeIcons[field.type]
                      const selected = field.id in form.values
                      return (
                        <div
                          key={field.id}
                          className="group/item hover:bg-muted/70 focus-within:bg-muted/70 flex h-8 items-center rounded-md px-2 transition-colors"
                        >
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left disabled:cursor-default disabled:opacity-50"
                            disabled={selected}
                            onClick={() => addFieldToDocument(field)}
                          >
                            <Icon aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
                            <span className="truncate text-[13px] font-medium">{field.name}</span>
                            <span className="text-muted-foreground ml-auto text-xs">
                              {field.type}
                            </span>
                          </button>
                          <div className="ml-2 flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-focus-within/item:opacity-100 group-hover/item:opacity-100">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground"
                              aria-label={`编辑元数据字段 ${field.name}`}
                              onClick={() => {
                                setEditingField(field)
                                setPopoverMode('edit')
                              }}
                            >
                              <PencilLine aria-hidden className="size-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-xs"
                              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
                              aria-label={`删除元数据字段 ${field.name}`}
                              onClick={() => {
                                setPopoverOpen(false)
                                setDeletingField(field)
                              }}
                            >
                              <Trash2 aria-hidden className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-muted-foreground flex h-14 items-center justify-center text-xs">
                      {fields.length ? '没有匹配的元数据' : '还没有元数据字段'}
                    </p>
                  )}
                </div>

                <div className="border-border/60 border-t p-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setPopoverMode('create')}
                  >
                    <Plus aria-hidden className="size-4" />
                    新建元数据
                  </Button>
                </div>
              </div>
            ) : (
              <MetadataFieldForm
                field={popoverMode === 'edit' ? editingField : undefined}
                saving={mutatingField}
                onBack={() => {
                  setPopoverMode('list')
                  setEditingField(undefined)
                }}
                onSave={handleFieldSave}
              />
            )}
          </PopoverContent>
        </Popover>

        {loadingFields ? (
          <div role="status" aria-label="正在加载元数据字段" className="mt-3 space-y-1.5">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        ) : selectedFields.length ? (
          <div className="border-border/60 mt-3 space-y-1.5 border-t pt-2.5">
            {selectedFields.map((field) => {
              const error = validation.success ? undefined : validation.errors[`values.${field.id}`]
              const value = form.values[field.id] ?? ''
              return (
                <div
                  key={field.id}
                  className="grid grid-cols-[5.5rem_minmax(0,1fr)_2rem] items-start gap-2"
                >
                  <label
                    htmlFor={`document-metadata-${field.id}`}
                    className="text-muted-foreground truncate pt-2 text-xs font-medium"
                  >
                    {field.name}
                  </label>
                  <div>
                    <Input
                      id={`document-metadata-${field.id}`}
                      aria-label={field.name}
                      aria-invalid={Boolean(error)}
                      type={
                        field.type === 'number'
                          ? 'number'
                          : field.type === 'time'
                            ? 'datetime-local'
                            : 'text'
                      }
                      value={String(value)}
                      className="h-8 max-w-40 text-[13px]"
                      disabled={saving}
                      onChange={(event) =>
                        updateFormField('values', {
                          ...form.values,
                          [field.id]: event.target.value,
                        })
                      }
                    />
                    {error ? <p className="text-destructive mt-1 text-xs">{error}</p> : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:bg-destructive/10 focus-visible:text-destructive"
                    aria-label={`移除文档元数据 ${field.name}`}
                    disabled={saving}
                    onClick={() => removeFieldFromDocument(field.id)}
                  >
                    <Trash2 aria-hidden className="size-4" />
                  </Button>
                </div>
              )
            })}
          </div>
        ) : null}
      </section>

      <Dialog
        open={Boolean(deletingField)}
        onOpenChange={(open) => {
          if (!open && !mutatingField) setDeletingField(undefined)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除元数据字段</DialogTitle>
            <DialogDescription>
              删除“{deletingField?.name}
              ”后，所有文档中已填写的对应值也会被清除，此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              disabled={mutatingField}
              onClick={() => setDeletingField(undefined)}
            >
              取消
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={mutatingField}
              onClick={() => void handleFieldDelete()}
            >
              {mutatingField ? '删除中…' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
