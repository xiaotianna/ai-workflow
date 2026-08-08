export interface WorkflowPluginDependencyInput {
  readonly pluginVersionId: string
  readonly manifest: unknown
  readonly artifactReference: string
  readonly artifactDigest: string
  readonly artifactSize?: number
}
