import { useFormData, type PluginConfigRendererProps } from '@ai-workflow/plugin/ui'

import { GradientBadge, PreviewPanel, cn } from '../components/visual-kit'

interface VisualBuilderConfig {
  readonly theme: 'aurora' | 'sunset' | 'forest' | 'mono'
  readonly primaryColor: string
  readonly secondaryColor: string
  readonly showGrid: boolean
  readonly caption: string
}

const THEME_OPTIONS = [
  { value: 'aurora', label: 'Aurora', primary: '#6366f1', secondary: '#06b6d4' },
  { value: 'sunset', label: 'Sunset', primary: '#f97316', secondary: '#ec4899' },
  { value: 'forest', label: 'Forest', primary: '#10b981', secondary: '#84cc16' },
  { value: 'mono', label: 'Mono', primary: '#64748b', secondary: '#334155' },
] as const

const COLOR_SWATCHES = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6'] as const

export default function VisualBuilderConfigRenderer({
  config,
  availableVariables = [],
  errors = {},
  disabled = false,
  onConfigChange,
}: PluginConfigRendererProps<VisualBuilderConfig>) {
  const { form, setForm } = useFormData<VisualBuilderConfig>(config)

  function commit(next: VisualBuilderConfig) {
    setForm(next)
    onConfigChange(next)
  }

  function updateField<K extends keyof VisualBuilderConfig>(key: K, value: VisualBuilderConfig[K]) {
    commit({ ...form, [key]: value })
  }

  function handleThemeChange(theme: VisualBuilderConfig['theme']) {
    const preset = THEME_OPTIONS.find((option) => option.value === theme)
    if (!preset) return
    commit({
      ...form,
      theme,
      primaryColor: preset.primary,
      secondaryColor: preset.secondary,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <GradientBadge label="Remote Config" tone="emerald" />
        <GradientBadge label="Custom Form" tone="amber" />
      </div>

      <PreviewPanel
        title="配置面板预览"
        subtitle="configRenderer 模式：完全自定义表单区域"
        accentClassName="from-emerald-500/15 to-teal-500/5"
        footer={form.caption}
      />

      <fieldset disabled={disabled} className="space-y-4">
        <legend className="text-foreground text-sm font-medium">主题预设</legend>
        <div className="grid grid-cols-2 gap-2">
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={cn(
                'border-border/70 bg-background rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                form.theme === option.value && 'border-primary ring-primary/30 ring-2',
              )}
              onClick={() => handleThemeChange(option.value)}
            >
              <span className="text-foreground font-semibold">{option.label}</span>
              <span
                className="mt-2 block h-2 rounded-full"
                style={{
                  background: `linear-gradient(90deg, ${option.primary}, ${option.secondary})`,
                }}
              />
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-xs font-medium">主色</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_SWATCHES.map((color) => (
              <button
                key={`primary-${color}`}
                type="button"
                aria-label={`主色 ${color}`}
                className={cn(
                  'size-7 rounded-full border-2 border-transparent',
                  form.primaryColor === color && 'border-foreground',
                )}
                style={{ backgroundColor: color }}
                onClick={() => commit({ ...form, primaryColor: color })}
              />
            ))}
          </div>
          <input
            className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm"
            value={form.primaryColor}
            onChange={(event) => updateField('primaryColor', event.target.value)}
          />
          {errors.primaryColor ? (
            <p className="text-destructive text-xs">{errors.primaryColor}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-foreground text-xs font-medium">副色</label>
          <input
            className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm"
            value={form.secondaryColor}
            onChange={(event) => updateField('secondaryColor', event.target.value)}
          />
          {errors.secondaryColor ? (
            <p className="text-destructive text-xs">{errors.secondaryColor}</p>
          ) : null}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.showGrid}
            onChange={(event) => updateField('showGrid', event.target.checked)}
          />
          显示画布网格预览
        </label>

        <div className="space-y-2">
          <label className="text-foreground text-xs font-medium">说明文案</label>
          <textarea
            className="border-border bg-background text-foreground min-h-20 w-full rounded-md border px-3 py-2 text-sm"
            value={form.caption}
            onChange={(event) => updateField('caption', event.target.value)}
          />
          {errors.caption ? <p className="text-destructive text-xs">{errors.caption}</p> : null}
        </div>

        {availableVariables.length > 0 ? (
          <div className="space-y-2">
            <label className="text-foreground text-xs font-medium">插入变量到说明</label>
            <select
              className="border-border bg-background text-foreground w-full rounded-md border px-3 py-2 text-sm"
              defaultValue=""
              onChange={(event) => {
                const option = availableVariables.find((item) => item.id === event.target.value)
                if (!option) return
                commit({
                  ...form,
                  caption: `${form.caption}{{${option.variableName}}}`,
                })
                event.currentTarget.value = ''
              }}
            >
              <option value="">选择变量…</option>
              {availableVariables.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.sourceLabel} · {option.variableName}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </fieldset>
    </div>
  )
}
