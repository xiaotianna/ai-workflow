import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

export function getScrollParent(element: HTMLElement | null): HTMLElement | null {
  if (!element) return null

  let parent = element.parentElement

  while (parent) {
    const { overflowY } = getComputedStyle(parent)

    if (overflowY === 'auto' || overflowY === 'scroll') {
      return parent
    }

    parent = parent.parentElement
  }

  return null
}

interface UsePluginHeroCollapseOptions {
  heroRef: RefObject<HTMLElement | null>
  titleRef: RefObject<HTMLElement | null>
  trackRef: RefObject<HTMLElement | null>
}

/** Title block top margin: mt-8 (32px) → mt-4 (16px) */
const TITLE_MARGIN_TOP = 32,
  /** Top padding stays at 12px; only pb-6 → pb-4 collapses (8px). */
  PADDING_COLLAPSE = 8

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function measureTitle(title: HTMLElement, hero: HTMLElement) {
  const titleHeight = title.scrollHeight
  hero.style.setProperty('--hero-title-height', `${titleHeight}px`)
  return titleHeight + TITLE_MARGIN_TOP + PADDING_COLLAPSE
}

export function usePluginHeroCollapse({
  heroRef,
  titleRef,
  trackRef,
}: UsePluginHeroCollapseOptions) {
  const collapseDistanceRef = useRef(120),
    lastProgressRef = useRef(-1)

  useLayoutEffect(() => {
    const title = titleRef.current,
      hero = heroRef.current,
      track = trackRef.current

    if (!title || !hero || !track) return

    const collapseDistance = measureTitle(title, hero)
    collapseDistanceRef.current = collapseDistance
    track.style.height = `${collapseDistance}px`
    track.style.marginBottom = `-${collapseDistance}px`

    const resizeObserver = new ResizeObserver(() => {
      if (!titleRef.current || !heroRef.current || !trackRef.current) return

      const nextDistance = measureTitle(titleRef.current, heroRef.current)
      collapseDistanceRef.current = nextDistance
      trackRef.current.style.height = `${nextDistance}px`
      trackRef.current.style.marginBottom = `-${nextDistance}px`
    })

    resizeObserver.observe(title)

    return () => {
      resizeObserver.disconnect()
    }
  }, [heroRef, titleRef, trackRef])

  useEffect(() => {
    const hero = heroRef.current,
      track = trackRef.current,
      scrollParent = getScrollParent(hero)

    if (!hero || !track || !scrollParent) return

    hero.style.setProperty('--hero-progress', '0')
    lastProgressRef.current = -1

    function applyProgress() {
      if (!hero || !track || !scrollParent) return

      const scrollParentTop = scrollParent.getBoundingClientRect().top,
        trackTop = track.getBoundingClientRect().top,
        scrolled = scrollParentTop - trackTop,
        progress = clamp(scrolled / collapseDistanceRef.current, 0, 1)

      if (Math.abs(progress - lastProgressRef.current) < 0.001) return
      lastProgressRef.current = progress

      hero.style.setProperty('--hero-progress', String(progress))

      if (progress >= 0.85) {
        hero.dataset.collapsed = 'true'
      } else {
        delete hero.dataset.collapsed
      }
    }

    applyProgress()
    scrollParent.addEventListener('scroll', applyProgress, { passive: true })
    window.addEventListener('resize', applyProgress, { passive: true })

    return () => {
      scrollParent.removeEventListener('scroll', applyProgress)
      window.removeEventListener('resize', applyProgress)
      delete hero.dataset.collapsed
      hero.style.removeProperty('--hero-progress')
      hero.style.removeProperty('--hero-title-height')
    }
  }, [heroRef, titleRef, trackRef])
}
