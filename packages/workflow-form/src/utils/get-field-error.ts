import type { NodeVariableFieldErrors } from '../components/node-variable-section'

export function getFieldError(errors: NodeVariableFieldErrors | undefined, path: string) {
  if (!errors) return undefined

  const matchingEntry = Object.entries(errors).find(
    ([errorPath]) => errorPath === path || errorPath.startsWith(`${path}.`),
  )

  return matchingEntry?.[1]
}
