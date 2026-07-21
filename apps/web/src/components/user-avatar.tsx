import { cn } from '@ai-workflow/ui/lib/utils'
import { useEffect, useRef } from 'react'

const AVATAR_SIZE = 32

interface UserAvatarProps {
  username: string
  className?: string
}

function hashUsername(username: string) {
  let hash = 2_166_136_261

  for (const character of username.trim().toLowerCase()) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16_777_619)
  }

  return hash >>> 0
}

function createSeededRandom(seed: number) {
  let state = seed

  return () => {
    state = Math.imul(state, 1_664_525) + 1_013_904_223
    return (state >>> 0) / 4_294_967_296
  }
}

export function UserAvatar({ username, className }: UserAvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')

    if (!context) return

    const hash = hashUsername(username || 'user')
    const random = createSeededRandom(hash)
    const hue = hash % 360
    const saturation = 68 + ((hash >>> 8) % 13)
    const bottomLightness = 28 + ((hash >>> 16) % 8)
    const topLightness = bottomLightness + 28

    context.clearRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)

    for (let y = 0; y < AVATAR_SIZE; y += 1) {
      const gradientProgress = 1 - y / (AVATAR_SIZE - 1)
      const gradientLightness =
        bottomLightness + (topLightness - bottomLightness) * gradientProgress

      for (let x = 0; x < AVATAR_SIZE; x += 1) {
        const grain = (random() - 0.5) * 18
        const lightness = Math.max(18, Math.min(72, gradientLightness + grain))

        context.fillStyle = `hsl(${hue} ${saturation}% ${Math.round(lightness)}%)`
        context.fillRect(x, y, 1, 1)
      }
    }
  }, [username])

  return (
    <canvas
      ref={canvasRef}
      width={AVATAR_SIZE}
      height={AVATAR_SIZE}
      role="img"
      aria-label={`${username} 的头像`}
      className={cn('block size-8 shrink-0 rounded-full', className)}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}
