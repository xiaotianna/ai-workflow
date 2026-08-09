import { Button } from '@ai-workflow/ui/components/button'
import { cn } from '@ai-workflow/ui/lib/utils'
import { ArrowLeft, Check } from 'lucide-react'

const steps = ['选择数据源', '文本分段与清洗', '处理并完成'] as const

interface AddDocumentStepHeaderProps {
  currentStep: 1 | 2 | 3
  onBack: () => void
}

export function AddDocumentStepHeader({ currentStep, onBack }: AddDocumentStepHeaderProps) {
  return (
    <header className="border-border relative flex h-12 shrink-0 items-center border-b px-4 sm:px-6">
      <Button
        type="button"
        variant="ghost"
        size="xs"
        className="z-10 -ml-2 gap-1.5 px-2 text-[13px]"
        onClick={onBack}
      >
        <ArrowLeft aria-hidden className="size-4" />
        <span>知识库</span>
      </Button>

      <nav
        aria-label="添加文件步骤"
        className="absolute inset-x-0 hidden items-center justify-center px-32 md:flex"
      >
        {steps.map((label, index) => {
          const step = (index + 1) as 1 | 2 | 3
          const active = step === currentStep
          const completed = step < currentStep

          return (
            <div key={label} className="flex items-center">
              {index > 0 ? <span aria-hidden className="bg-border mx-4 h-px w-6 lg:w-8" /> : null}
              <div
                aria-current={active ? 'step' : undefined}
                className={cn(
                  'flex items-center gap-1.5 text-[13px] font-medium whitespace-nowrap transition-colors',
                  active
                    ? 'text-primary'
                    : completed
                      ? 'text-foreground'
                      : 'text-muted-foreground/55',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 shrink-0 items-center justify-center border text-[11px] font-semibold transition-[background-color,border-color,color]',
                    active
                      ? 'border-primary bg-primary text-primary-foreground min-w-15 rounded-full px-2.5'
                      : completed
                        ? 'border-primary/35 bg-primary/5 text-primary size-6 rounded-full'
                        : 'border-border text-muted-foreground/60 size-6 rounded-full',
                  )}
                >
                  {active ? (
                    `STEP ${step}`
                  ) : completed ? (
                    <Check aria-hidden className="size-3.5" />
                  ) : (
                    step
                  )}
                </span>
                <span>{label}</span>
              </div>
            </div>
          )
        })}
      </nav>

      <span className="text-muted-foreground ml-auto text-xs font-medium md:hidden">
        {currentStep} / {steps.length} · {steps[currentStep - 1]}
      </span>
    </header>
  )
}
