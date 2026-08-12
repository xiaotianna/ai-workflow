export function createUniqueKey(prefix: string, keys: readonly string[]) {
  const usedKeys = new Set(keys)
  let index = 1,
    key = prefix

  while (usedKeys.has(key)) {
    index += 1
    key = `${prefix}${index}`
  }

  return key
}
