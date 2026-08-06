import { cn } from '@ai-workflow/ui/lib/utils'

export function PluginHeroBackground({ className }: { className?: string }) {
  return (
    <>
      <div aria-hidden className={cn('absolute inset-0 bg-[#0033ff]', className)} />
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 bg-[length:110%] bg-[position:center_top] bg-no-repeat opacity-80 mix-blend-lighten',
          className,
        )}
        style={{ backgroundImage: 'url(/hero-bg.jpg)' }}
      />
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat',
          className,
        )}
        style={{ backgroundImage: 'url(/hero-gradient-noise.svg)' }}
      />
    </>
  )
}
