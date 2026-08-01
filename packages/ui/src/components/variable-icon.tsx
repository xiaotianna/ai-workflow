// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- Vite exposes SVG imports through ambient declarations.
/// <reference types="vite/client" />

import type { ComponentProps } from 'react'

import { cn } from '../lib/utils'
import EnvironmentIcon from './icon/environment-icon.svg'
import SystemIcon from './icon/system-icon.svg'

export type VariableIconVariant = 'default' | 'system' | 'environment'

export type VariableIconProps = Omit<ComponentProps<'span'>, 'children'> & {
  variant?: VariableIconVariant
}

const VARIABLE_ICON_ASSETS: Record<VariableIconVariant, string> = {
  default: SystemIcon,
  system: SystemIcon,
  environment: EnvironmentIcon,
}

const VARIABLE_ICON_COLOR_CLASSES: Record<VariableIconVariant, string> = {
  default: '',
  system: 'text-orange-600 dark:text-orange-400',
  environment: 'text-violet-600 dark:text-violet-400',
}

export function getVariableIconColorClass(variant: VariableIconVariant) {
  return VARIABLE_ICON_COLOR_CLASSES[variant]
}

export function getVariableIconMaskImage(variant: VariableIconVariant) {
  return `url("${VARIABLE_ICON_ASSETS[variant]}")`
}

export function VariableIcon({
  variant = 'default',
  className,
  style,
  ...props
}: VariableIconProps) {
  const maskImage = getVariableIconMaskImage(variant)

  return (
    <span
      {...props}
      aria-hidden
      className={cn('inline-block size-4 shrink-0', getVariableIconColorClass(variant), className)}
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
