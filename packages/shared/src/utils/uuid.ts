import { v4 as uuidv4 } from 'uuid'

// 生成uuid
export function generateUuid(): string {
  return uuidv4()
}
