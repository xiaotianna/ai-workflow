import { produce } from 'immer'
import { useCallback, useEffect, useRef, useState } from 'react'

interface UseFormDataOptions<T> {
  onChange?: (values: T) => void
}

type KeysOfUnion<T> = T extends T ? keyof T : never
type ValueOfUnion<T, K extends PropertyKey> = T extends T
  ? K extends keyof T
    ? T[K]
    : never
  : never
type Updater<V> = V | ((prev: V) => V)

// 表单hook，自动管理表单数据
export function useFormData<T extends Record<PropertyKey, unknown>>(
  initialValues: T,
  { onChange }: UseFormDataOptions<T> = {},
) {
  const [form, setForm] = useState<T>(initialValues)
  const initialValuesRef = useRef(initialValues)
  initialValuesRef.current = initialValues

  // 更新单个字段
  const updateFormField = useCallback(
    <K extends KeysOfUnion<T>>(key: K, updater: Updater<ValueOfUnion<T, K>>) => {
      setForm((prev) =>
        produce(prev, (draft) => {
          const next = draft as Record<PropertyKey, unknown>
          const prevFieldValue = next[key] as ValueOfUnion<T, K>
          next[key] =
            typeof updater === 'function'
              ? (updater as (prev: ValueOfUnion<T, K>) => ValueOfUnion<T, K>)(prevFieldValue)
              : updater
        }),
      )
    },
    [],
  )

  // 更新多个
  const updateForm = useCallback((values: Partial<T>) => {
    setForm((prev) =>
      produce(prev, (draft) => {
        Object.assign(draft, values)
      }),
    )
  }, [])

  const resetForm = useCallback(() => {
    setForm(initialValuesRef.current)
  }, [])

  useEffect(() => {
    onChange?.(form)
  }, [form, onChange])

  return {
    form,
    setForm,
    updateFormField,
    updateForm,
    resetForm,
  }
}
