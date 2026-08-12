import type {
  AppApiInputVariableDto,
  AppApiOverviewDto,
  AppApiVersionInputContractDto,
} from '@/api/app-api'
import type { OpenAPIPageProps } from 'fumadocs-openapi/ui'

type OpenApiDocument = Extract<OpenAPIPageProps, { payload: unknown }>['payload']['bundled']
type OpenApiSchema = Record<string, unknown>

export type AppApiDocumentContract = Pick<AppApiOverviewDto, 'currentVersionId' | 'versions'>

function resolveAppApiBaseUrl(): string {
  const configured = String(import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/+$/, '')
  if (configured) return `${configured}/v1`
  if (typeof globalThis.location !== 'undefined') return `${globalThis.location.origin}/v1`
  return '/v1'
}

export const APP_API_BASE_URL = resolveAppApiBaseUrl()

const apiKeySecurity = [{ ApiKeyAuth: [] }],
  runIdExample = '6df6b566-0d9d-4e20-a339-b901a4b905ef',
  runIdSourceDescription =
    '从执行工作流接口返回的首个 `workflow_started` SSE 事件 `data.id` 获取；也可从 `GET /workflows/logs` 响应的 `data.items[].id` 获取。'

export const workflowOpenApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Workflow 应用 API',
    description: '执行已发布工作流，并查询应用、参数、运行状态与调用日志。',
    version: '1.0.0',
  },
  servers: [
    {
      url: APP_API_BASE_URL,
      description: '应用 API 服务器',
    },
  ],
  tags: [
    { name: 'Workflow', description: '工作流执行' },
    { name: 'Runs', description: '运行状态与日志' },
    { name: 'Application', description: '应用信息与参数' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description:
          '在 Authorization 请求头中携带创建时获得的 app- 开头密钥。API Key 与应用绑定，不能跨应用复用。',
      },
    },
    schemas: {
      SuccessResponse: {
        type: 'object',
        required: ['code', 'message', 'data'],
        properties: {
          code: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'success' },
          data: {},
        },
      },
      Error: {
        type: 'object',
        required: ['code', 'message', 'data'],
        properties: {
          code: { type: 'integer', example: 401 },
          message: { type: 'string', example: 'API 密钥无效或已失效' },
          data: { type: 'null', example: null },
        },
      },
      WorkflowRunRequest: {
        type: 'object',
        additionalProperties: false,
        description: '请求体字段由目标发布版本的 Start 节点输入变量动态生成。',
        properties: {},
      },
      WorkflowNodeRun: {
        type: 'object',
        required: ['id', 'nodeId', 'nodeType', 'status'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: '节点执行记录 `id`，不是工作流的 `runId`。',
          },
          nodeId: { type: 'string' },
          nodeType: { type: 'string', example: 'llm' },
          status: {
            type: 'string',
            enum: [
              'PENDING',
              'RUNNING',
              'SUCCEEDED',
              'FAILED',
              'SKIPPED',
              'CANCELLED',
              'TIMED_OUT',
            ],
          },
          input: { description: '实际下发给节点执行器的输入。' },
          output: { description: '节点执行输出。' },
          durationMs: { type: 'integer', minimum: 0 },
        },
      },
      WorkflowRun: {
        type: 'object',
        required: ['id', 'traceId', 'status', 'input', 'nodeRuns', 'queuedAt'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            description: '本次工作流执行的运行记录 ID，即 `runId`。',
            example: runIdExample,
          },
          traceId: { type: 'string', format: 'uuid' },
          status: {
            type: 'string',
            enum: ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT'],
          },
          input: { type: 'object', additionalProperties: true },
          output: { type: 'object', additionalProperties: true },
          queuedAt: { type: 'string', format: 'date-time' },
          startedAt: { type: 'string', format: 'date-time' },
          finishedAt: { type: 'string', format: 'date-time' },
          durationMs: { type: 'integer', minimum: 0 },
          nodeRuns: {
            type: 'array',
            items: { $ref: '#/components/schemas/WorkflowNodeRun' },
          },
        },
      },
      WorkflowRunList: {
        type: 'object',
        required: ['items', 'nextCursor'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'traceId', 'trigger', 'mode', 'status', 'queuedAt'],
              properties: {
                id: {
                  type: 'string',
                  format: 'uuid',
                  description: '工作流运行记录 ID，即 `runId`。',
                  example: runIdExample,
                },
                traceId: { type: 'string', format: 'uuid' },
                trigger: { type: 'string', enum: ['API', 'SUB_WORKFLOW'] },
                mode: { type: 'string', enum: ['FULL'] },
                status: {
                  type: 'string',
                  enum: ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT'],
                },
                queuedAt: { type: 'string', format: 'date-time' },
                startedAt: { type: 'string', format: 'date-time' },
                finishedAt: { type: 'string', format: 'date-time' },
                durationMs: { type: 'integer', minimum: 0 },
              },
            },
          },
          nextCursor: { type: ['string', 'null'] },
        },
      },
      ApplicationInfo: {
        type: 'object',
        required: ['id', 'name', 'author'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          icon: { type: 'string' },
          description: { type: 'string' },
          author: { type: 'string' },
        },
      },
      ApplicationParameters: {
        type: 'object',
        required: ['systemVariables', 'environmentVariables'],
        properties: {
          systemVariables: { type: 'array', items: { type: 'object' } },
          environmentVariables: {
            type: 'array',
            items: {
              type: 'object',
              description: 'Secret 类型仅包含元数据和 sensitive=true，不包含 value。',
            },
          },
        },
      },
      WorkflowRunEventStream: {
        type: 'string',
        description:
          'SSE 依次发送 `workflow_started`、`node_finished` 和 `workflow_finished`；`data` 为最新运行快照。首个 `workflow_started` 事件的 `data.id` 就是本次执行的 `runId`，后续可传给 `GET /workflows/runs/{runId}` 查询执行情况。',
        example: `event: workflow_started\\ndata: {"id":"${runIdExample}","status":"RUNNING"}\\n\\nevent: node_finished\\ndata: {"runId":"${runIdExample}","node":{"nodeId":"llm-1","status":"SUCCEEDED"}}\\n\\nevent: workflow_finished\\ndata: {"id":"${runIdExample}","status":"SUCCEEDED"}\\n\\n`,
      },
    },
  },
  paths: {
    '/workflows/run': {
      post: {
        tags: ['Workflow'],
        security: apiKeySecurity,
        operationId: 'runCurrentWorkflow',
        summary: '执行工作流',
        description: `执行当前应用正在发布的版本，并通过 SSE 返回每个节点和工作流终态。本次执行的 \`runId\` ${runIdSourceDescription}`,
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkflowRunRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: '工作流事件流',
            content: {
              'text/event-stream': {
                schema: { $ref: '#/components/schemas/WorkflowRunEventStream' },
              },
            },
          },
          '400': {
            description: '工作流未发布或输入无效',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
          '401': {
            description: 'API 密钥无效',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/workflows/versions/{versionId}/run': {
      post: {
        tags: ['Workflow'],
        security: apiKeySecurity,
        operationId: 'runWorkflowVersion',
        summary: '执行指定版本工作流',
        description: `执行当前应用的指定历史发布版本，并通过 SSE 返回节点执行事件。本次执行的 \`runId\` ${runIdSourceDescription}`,
        parameters: [
          {
            name: 'versionId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: '发布版本 ID',
          },
        ],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkflowRunRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: '工作流事件流',
            content: {
              'text/event-stream': {
                schema: { $ref: '#/components/schemas/WorkflowRunEventStream' },
              },
            },
          },
          '404': {
            description: '指定发布版本不存在，或与当前 API Key 所属应用不匹配',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/workflows/runs/{runId}': {
      get: {
        tags: ['Runs'],
        security: apiKeySecurity,
        operationId: 'getWorkflowRun',
        summary: '获取执行情况',
        description: `查询一次 API 或子工作流正式调用的状态、输出、节点执行和追踪信息。\`runId\` ${runIdSourceDescription}`,
        parameters: [
          {
            name: 'runId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid', example: runIdExample },
            description: `运行记录 ID（\`runId\`）。${runIdSourceDescription}`,
          },
        ],
        responses: {
          '200': {
            description: '执行详情',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: { data: { $ref: '#/components/schemas/WorkflowRun' } },
                    },
                  ],
                },
              },
            },
          },
          '404': {
            description: '运行记录不存在',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
          },
        },
      },
    },
    '/workflows/logs': {
      get: {
        tags: ['Runs'],
        security: apiKeySecurity,
        operationId: 'listWorkflowLogs',
        summary: '获取工作流日志',
        description: '按时间倒序分页查询当前应用的 API 和子工作流正式调用日志。',
        parameters: [
          {
            name: 'cursor',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: '上一页返回的 opaque 游标',
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'TIMED_OUT'],
            },
          },
          {
            name: 'from',
            in: 'query',
            required: false,
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: '按触发用户昵称或追踪 ID 搜索',
          },
        ],
        responses: {
          '200': {
            description: '运行日志列表，返回 items 与 nextCursor',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: { data: { $ref: '#/components/schemas/WorkflowRunList' } },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/info': {
      get: {
        tags: ['Application'],
        security: apiKeySecurity,
        operationId: 'getApplicationInfo',
        summary: '获取应用基本信息',
        description: '返回应用名称、图标、描述和作者。',
        responses: {
          '200': {
            description: '应用基本信息',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: { data: { $ref: '#/components/schemas/ApplicationInfo' } },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
    '/parameters': {
      get: {
        tags: ['Application'],
        security: apiKeySecurity,
        operationId: 'getApplicationParameters',
        summary: '获取应用参数',
        description:
          '返回系统变量与环境变量。Secret 环境变量仅返回元数据和 sensitive=true，不返回 value。',
        responses: {
          '200': {
            description: '应用参数列表',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    { $ref: '#/components/schemas/SuccessResponse' },
                    {
                      type: 'object',
                      properties: {
                        data: { $ref: '#/components/schemas/ApplicationParameters' },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      },
    },
  },
}

export const workflowOpenApiOperations: NonNullable<OpenAPIPageProps['operations']> = [
  { path: '/workflows/run', method: 'post' },
  { path: '/workflows/versions/{versionId}/run', method: 'post' },
  { path: '/workflows/runs/{runId}', method: 'get' },
  { path: '/workflows/logs', method: 'get' },
  { path: '/info', method: 'get' },
  { path: '/parameters', method: 'get' },
]

export const workflowOpenApiPageProps: OpenAPIPageProps = {
  operations: workflowOpenApiOperations,
  showTitle: true,
  showDescription: true,
  payload: {
    bundled: workflowOpenApiDocument as OpenApiDocument,
  },
}

export function createWorkflowOpenApiPageProps(
  contract?: AppApiDocumentContract,
): OpenAPIPageProps {
  return {
    operations: workflowOpenApiOperations,
    showTitle: true,
    showDescription: true,
    payload: {
      bundled: createWorkflowOpenApiDocument(contract),
    },
  }
}

export function createWorkflowOpenApiDocument(contract?: AppApiDocumentContract): OpenApiDocument {
  const versions = contract?.versions ?? [],
    currentVersion = versions.find((version) => version.versionId === contract?.currentVersionId),
    currentRequestSchema = createInputSchema(
      currentVersion?.inputVariables ?? [],
      currentVersion ? getVersionTitle(currentVersion) : '当前发布版本输入',
      currentVersion ? `当前发布版本 ID：${currentVersion.versionId}` : '当前没有已发布版本。',
    ),
    versionSchemaEntries = versions.map((version) => {
      const schemaName = getVersionSchemaName(version.versionId)
      return [
        schemaName,
        createInputSchema(
          version.inputVariables,
          getVersionTitle(version),
          `发布版本 ID：${version.versionId}`,
        ),
      ] as const
    }),
    versionRequestSchema: OpenApiSchema =
      versionSchemaEntries.length > 0
        ? {
            oneOf: versionSchemaEntries.map(([schemaName]) => ({
              $ref: `#/components/schemas/${schemaName}`,
            })),
            description: '请求体必须匹配 URL 中 versionId 对应发布版本的 Start 输入定义。',
          }
        : createInputSchema([], '指定发布版本输入', '当前没有可用的发布版本。'),
    currentOperation = workflowOpenApiDocument.paths['/workflows/run'].post,
    versionOperation = workflowOpenApiDocument.paths['/workflows/versions/{versionId}/run'].post

  return {
    ...workflowOpenApiDocument,
    components: {
      ...workflowOpenApiDocument.components,
      schemas: {
        ...workflowOpenApiDocument.components.schemas,
        WorkflowRunRequest: currentRequestSchema,
        VersionWorkflowRunRequest: versionRequestSchema,
        ...Object.fromEntries(versionSchemaEntries),
      },
    },
    paths: {
      ...workflowOpenApiDocument.paths,
      '/workflows/run': {
        post: {
          ...currentOperation,
          requestBody: createRequestBody(
            '#/components/schemas/WorkflowRunRequest',
            currentVersion?.inputVariables ?? [],
          ),
        },
      },
      '/workflows/versions/{versionId}/run': {
        post: {
          ...versionOperation,
          parameters: createVersionParameters(versionOperation.parameters, versions),
          requestBody: createRequestBody(
            '#/components/schemas/VersionWorkflowRunRequest',
            versions.flatMap((version) => version.inputVariables),
          ),
        },
      },
    },
  } as OpenApiDocument
}

function createRequestBody(
  schemaReference: string,
  inputVariables: readonly AppApiInputVariableDto[],
) {
  return {
    required: inputVariables.some(isRequiredWithoutDefault),
    content: {
      'application/json': {
        schema: { $ref: schemaReference },
      },
    },
  }
}

function createInputSchema(
  inputVariables: readonly AppApiInputVariableDto[],
  title: string,
  description: string,
): OpenApiSchema {
  const required = inputVariables.filter(isRequiredWithoutDefault).map((variable) => variable.key)

  return {
    type: 'object',
    title,
    description,
    additionalProperties: false,
    properties: Object.fromEntries(
      inputVariables.map((variable) => [variable.key, createInputProperty(variable)]),
    ),
    ...(required.length > 0 ? { required } : {}),
    example: Object.fromEntries(
      inputVariables.map((variable) => [variable.key, getExampleValue(variable)]),
    ),
  }
}

function createInputProperty(variable: AppApiInputVariableDto): OpenApiSchema {
  const description = variable.description
      ? `${variable.label}：${variable.description}`
      : variable.label,
    metadata = {
      title: variable.dataType,
      description,
      ...(variable.defaultValue !== undefined ? { default: variable.defaultValue } : {}),
    }

  switch (variable.dataType) {
    case 'string': {
      return { type: 'string', ...metadata }
    }
    case 'number': {
      return { type: 'number', ...metadata }
    }
    case 'boolean': {
      return { type: 'boolean', ...metadata }
    }
    case 'json': {
      return {
        oneOf: [
          { type: 'object', additionalProperties: true },
          { type: 'array', items: {} },
          { type: 'string' },
          { type: 'number' },
          { type: 'boolean' },
          { type: 'null' },
        ],
        ...metadata,
      }
    }
  }
}

function getExampleValue(variable: AppApiInputVariableDto): unknown {
  if (variable.defaultValue !== undefined) return variable.defaultValue

  switch (variable.dataType) {
    case 'string': {
      return `示例${variable.label}`
    }
    case 'number': {
      return 0
    }
    case 'boolean': {
      return true
    }
    case 'json': {
      return {}
    }
  }
}

function isRequiredWithoutDefault(variable: AppApiInputVariableDto): boolean {
  return variable.required && variable.defaultValue === undefined
}

function getVersionSchemaName(versionId: string): string {
  return `WorkflowVersionInput_${versionId.replaceAll('-', '_')}`
}

function getVersionTitle(version: AppApiVersionInputContractDto): string {
  return `v${version.version}${version.name ? ` · ${version.name}` : ''}`
}

function createVersionIdDescription(versions: readonly AppApiVersionInputContractDto[]): string {
  if (versions.length === 0) return '发布版本 ID'

  return '发布版本 ID。请从上方“可用版本”表格复制对应的 versionId；API Key 必须属于同一应用。'
}

function createVersionParameters(
  parameters: readonly Record<string, unknown>[],
  versions: readonly AppApiVersionInputContractDto[],
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = []

  for (const parameter of parameters) {
    result.push(
      parameter.name === 'versionId'
        ? {
            ...parameter,
            description: createVersionIdDescription(versions),
            schema:
              versions.length > 0
                ? {
                    type: 'string',
                    format: 'uuid',
                    example: versions[0]?.versionId,
                  }
                : parameter.schema,
          }
        : parameter,
    )
  }

  return result
}
