// 向 Map 中某个 Key 对应的数组追加一个元素；如果 Key 还不存在，就创建新数组
export function appendMapValue<TKey, TValue>(
  map: Map<TKey, TValue[]>,
  key: TKey,
  value: TValue,
): void {
  const values = map.get(key)
  if (values) {
    values.push(value)
  } else {
    map.set(key, [value])
  }
}
