// 把map数组冻结，不允许新增和删除
export function freezeArrayMap<TKey, TValue>(
  map: ReadonlyMap<TKey, TValue[]>,
): ReadonlyMap<TKey, readonly TValue[]> {
  return new Map([...map].map(([key, values]) => [key, Object.freeze([...values])]))
}
