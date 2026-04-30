// import type { ComponentType } from 'react'

// export interface FieldProps {
//   field: any
//   value: any
//   onChange: (value: any) => void
// }

// const fieldRegistry = new Map<string, ComponentType<FieldProps>>()

// export function registerField(
//   type: string,
//   component: ComponentType<FieldProps>
// ) {
//   if (fieldRegistry.has(type)) {
//     console.warn(`Field "${type}" 已覆盖`)
//   }

//   fieldRegistry.set(type, component)
// }

// export function getField(type: string) {
//   const comp = fieldRegistry.get(type)

//   if (!comp) {
//     throw new Error(`Field "${type}" 未注册`)
//   }

//   return comp
// }
