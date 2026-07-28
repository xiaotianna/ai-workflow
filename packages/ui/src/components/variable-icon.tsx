// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- Vite exposes SVG imports through ambient declarations.
/// <reference types="vite/client" />

import type { ComponentProps } from 'react'

import { cn } from '../lib/utils'
import Icon from './icon/system-icon.svg'

export type VariableIconProps = Omit<ComponentProps<'span'>, 'children'>

export function VariableIcon({ className, style, ...props }: VariableIconProps) {
  const maskImage = `url("${Icon}")`

  return (
    <span
      {...props}
      aria-hidden
      className={cn('inline-block size-4 shrink-0', className)}
      style={{
        backgroundColor: 'currentColor',
        WebkitMaskImage: maskImage,
        WebkitMaskPosition: 'center',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        maskImage,
        maskPosition: 'center',
        maskRepeat: 'no-repeat',
        maskSize: 'contain',
        ...style,
      }}
    />
  )
}
