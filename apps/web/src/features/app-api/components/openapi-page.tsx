import { createOpenAPIPage } from 'fumadocs-openapi/ui'
import { createCodeUsageGeneratorRegistry } from 'fumadocs-openapi/requests/generators'
import { registerDefault } from 'fumadocs-openapi/requests/generators/all'

const codeUsages = createCodeUsageGeneratorRegistry()
registerDefault(codeUsages)

/**
 * Fumadocs OpenAPI page renderer.
 * @see https://www.fumadocs.dev/docs/integrations/openapi/api-page
 */
export const OpenAPIPage = createOpenAPIPage({
  codeUsages,
  playground: {
    enabled: false,
  },
})
