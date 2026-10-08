import { createLocalStorageAdapter, type AsyncStorageLike } from '@assistant-ui/core/react'
import { showToast } from '@ai-workflow/ui/lib/toast'

let database: Promise<IDBDatabase> | undefined = undefined
function openDatabase() {
  database ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = globalThis.indexedDB.open('ai-workflow.agent.history', 1)
    let blocked = false
    request.addEventListener('upgradeneeded', () =>
      request.result.createObjectStore('conversations'),
    )
    request.addEventListener('success', () => {
      const result = request.result
      if (blocked) {
        result.close()
        return
      }
      result.addEventListener('versionchange', () => {
        result.close()
        database = undefined
      })
      resolve(result)
    })
    request.addEventListener('error', () => reject(request.error))
    request.addEventListener('blocked', () => {
      blocked = true
      reject(new Error('请关闭其他页面后重试历史存储'))
    })
  }).catch((error) => {
    database = undefined
    throw error
  })
  return database
}
async function access(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest,
): Promise<unknown> {
  try {
    const db = await openDatabase()
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('conversations', mode),
        request = operation(transaction.objectStore('conversations'))
      transaction.addEventListener('complete', () => resolve(request.result))
      transaction.addEventListener('abort', () => reject(transaction.error ?? request.error))
      transaction.addEventListener('error', () => reject(transaction.error ?? request.error))
    })
  } catch (error) {
    showToast('error', '无法读取或保存对话历史，请检查浏览器存储空间和权限后重试')
    throw error
  }
}
const storage: AsyncStorageLike = {
  async getItem(key) {
    const value = await access('readonly', (store) => store.get(key))
    return typeof value === 'string' ? value : null
  },
  async setItem(key, value) {
    await access('readwrite', (store) => store.put(value, key))
  },
  async removeItem(key) {
    await access('readwrite', (store) => store.delete(key))
  },
}
export function createAgentConversationAdapter(scope: string) {
  // shortcut: 历史仅保存在当前浏览器，需要跨设备同步时接入服务端适配器。
  return createLocalStorageAdapter({ storage, prefix: `ai-workflow.agent.history.${scope}:` })
}
