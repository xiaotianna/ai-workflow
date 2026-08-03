// 安全检查 JSON 对象自己的字段，避免原型链字段被当成用户输入
export function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.hasOwn(value, key)
}
