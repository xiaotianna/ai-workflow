import { toast, type ExternalToast } from 'sonner'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

type ToastHandler = (message: string, options?: ExternalToast) => string | number

const toastHandlers = {
  success: toast.success,
  error: toast.error,
  warning: toast.warning,
  info: toast.info,
} satisfies Record<ToastType, ToastHandler>

/**
 * 展示全局通知。
 *
 * @param type 通知类型
 * @param message 通知内容
 * @param duration 可选展示时长，单位为毫秒
 */
export function showToast(type: ToastType, message: string, duration?: number) {
  const options = duration === undefined ? undefined : { duration }
  return toastHandlers[type](message, options)
}
