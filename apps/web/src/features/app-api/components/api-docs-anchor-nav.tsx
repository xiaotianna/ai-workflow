import { cn } from '@ai-workflow/ui/lib/utils'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

export interface ApiDocsAnchorItem {
  id: string
  title: string
  description: string
}

interface ApiDocsAnchorNavProps {
  items: readonly ApiDocsAnchorItem[]
  className?: string
}

const SCROLL_OFFSET = 112

/** Equal width when the list is not hovered */
const WIDTH_IDLE = 10
/**
 * Mountain-peak widths by distance from the hovered item:
 * [hovered, ±1, ±2]. Farther items keep the last step.
 */
const WIDTH_BY_DISTANCE = [28, 20, 14] as const

function findScrollRoot(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null
  while (current) {
    const { overflowY } = getComputedStyle(current)
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      return current
    }
    current = current.parentElement
  }
  return null
}

function resolveActiveId(
  items: readonly ApiDocsAnchorItem[],
  scrollRoot: HTMLElement | null,
): string | undefined {
  if (items.length === 0) return undefined

  const rootTop = scrollRoot?.getBoundingClientRect().top ?? 0
  let activeId = items[0]?.id

  for (const item of items) {
    const el = document.getElementById(item.id)
    if (!el) continue
    if (el.getBoundingClientRect().top - rootTop <= SCROLL_OFFSET) {
      activeId = item.id
    }
  }

  return activeId
}

function resolveBarWidth(index: number, hoveredIndex: number | null): number {
  if (hoveredIndex === null) return WIDTH_IDLE

  const distance = Math.abs(index - hoveredIndex)
  const capped = Math.min(distance, WIDTH_BY_DISTANCE.length - 1)
  return WIDTH_BY_DISTANCE[capped]!
}

export function ApiDocsAnchorNav({ items, className }: ApiDocsAnchorNavProps) {
  const navRef = useRef<HTMLElement>(null)
  const [activeId, setActiveId] = useState<string | undefined>(items[0]?.id)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const hoveredIndex = hoveredId === null ? null : items.findIndex((item) => item.id === hoveredId)

  useEffect(() => {
    const scrollRoot = findScrollRoot(navRef.current)
    let frame = 0

    function updateActive() {
      frame = 0
      setActiveId(resolveActiveId(items, scrollRoot))
    }

    function onScroll() {
      if (frame) return
      frame = requestAnimationFrame(updateActive)
    }

    updateActive()
    const target: HTMLElement | Window = scrollRoot ?? window
    target.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)

    return () => {
      if (frame) cancelAnimationFrame(frame)
      target.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [items])

  function scrollToSection(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setActiveId(id)
  }

  if (items.length === 0) return null

  return (
    <nav
      ref={navRef}
      aria-label="页面章节"
      className={cn('relative flex w-fit flex-col items-start gap-2.5', className)}
      onMouseLeave={() => setHoveredId(null)}
    >
      {items.map((item, index) => {
        const isActive = item.id === activeId
        const isHovered = item.id === hoveredId
        const width = resolveBarWidth(index, hoveredIndex === -1 ? null : hoveredIndex)

        return (
          <div key={item.id} className="relative" onMouseEnter={() => setHoveredId(item.id)}>
            <button
              type="button"
              aria-label={item.title}
              aria-current={isActive ? 'location' : undefined}
              className="flex h-2 cursor-pointer items-center outline-none"
              onClick={() => scrollToSection(item.id)}
            >
              <span
                className={cn(
                  'block rounded-full transition-[width,height,background-color] duration-200 ease-out',
                  (hoveredId ? isHovered : isActive) ? 'bg-primary h-0.75' : 'bg-border h-0.5',
                )}
                style={{ width }}
              />
            </button>

            <AnimatePresence>
              {isHovered ? (
                <motion.div
                  role="tooltip"
                  initial={{ opacity: 0, x: -6, scale: 0.98 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: 'easeOut' }}
                  className="border-border/60 bg-background absolute top-1/2 left-full z-20 ml-3 w-56 origin-left -translate-y-1/2 rounded-xl border px-3.5 py-3 shadow-md"
                >
                  <p className="text-foreground text-sm leading-5 font-semibold">{item.title}</p>
                  <p className="text-muted-foreground mt-1.5 text-xs leading-5">
                    {item.description}
                  </p>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )
      })}
    </nav>
  )
}
