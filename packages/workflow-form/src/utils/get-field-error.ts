import type { FieldRendererErrors } from '../contracts/field-renderer'

export function getFieldError(errors: FieldRendererErrors | undefined, path: string) {
  if (!errors) return undefined

  const matchingEntry = Object.entries(errors).find(
    ([errorPath]) => errorPath === path || errorPath.startsWith(`${path}.`),
  )

  return matchingEntry?.[1]
}
