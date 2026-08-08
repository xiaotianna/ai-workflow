export function getPluginAssetUrl(pluginId: string, versionId: string, assetPath: string): string {
  const normalizedPath = assetPath.replace(/^\/+/, '')
  return `/plugins/${encodeURIComponent(pluginId)}/versions/${encodeURIComponent(versionId)}/assets/${normalizedPath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')}`
}
