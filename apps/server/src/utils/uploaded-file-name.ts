export function normalizeUploadedFileName(originalFileName: string): string {
  const leafName = originalFileName.replaceAll('\\', '/').split('/').at(-1)?.replaceAll('\0', '')
  if (!leafName) return ''

  if (Array.from(leafName).some((character) => character.codePointAt(0)! > 255)) {
    return leafName.normalize('NFC')
  }

  const latin1Bytes = Buffer.from(leafName, 'latin1')
  const utf8FileName = latin1Bytes.toString('utf8')
  const isValidUtf8 = Buffer.from(utf8FileName, 'utf8').equals(latin1Bytes)

  return (isValidUtf8 ? utf8FileName : leafName).normalize('NFC')
}
