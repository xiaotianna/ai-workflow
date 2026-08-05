import type { OpenAPIPageProps } from 'fumadocs-openapi/ui'

type OpenApiDocument = Extract<OpenAPIPageProps, { payload: unknown }>['payload']['bundled']

/** Mock Workflow Application OpenAPI document for docs UI. */
export const workflowOpenApiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'Workflow 应用 API',
    description: 'Workflow 应用适用于自动化处理、内容生成与数据编排等场景。',
    version: '1.0.0',
  },
  servers: [
    {
      url: 'https://api.example.com/v1',
      description: '生产环境',
    },
  ],
  tags: [
    { name: 'Workflow', description: '工作流执行与查询' },
    { name: 'Runs', description: '运行记录与状态' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'Service API 使用 API Key 进行鉴权，请在 Authorization 请求头中携带密钥。',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['code', 'message'],
        properties: {
          code: { type: 'string', example: 'unauthorized' },
          message: { type: 'string', example: 'Invalid API key' },
        },
      },
      WorkflowRunRequest: {
        type: 'object',
        properties: {
          inputs: {
            type: 'object',
            additionalProperties: true,
            description: '工作流输入变量',
            example: { query: '生成一份周报摘要' },
          },
          stream: {
            type: 'boolean',
            default: false,
            description: '是否以流式方式返回执行事件',
          },
        },
      },
      WorkflowRun: {
        type: 'object',
        required: ['id', 'status', 'createdAt'],
        properties: {
          id: {
            type: 'string',
            format: 'uuid',
            example: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
          },
          status: {
            type: 'string',
            enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'],
            example: 'running',
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            example: '2026-08-05T08:00:00.000Z',
          },
          finishedAt: {
            type: 'string',
            format: 'date-time',
            nullable: true,
            example: null,
          },
          outputs: {
            type: 'object',
            additionalProperties: true,
            nullable: true,
            example: { result: '本周完成三项核心任务…' },
          },
        },
      },
    },
  },
  paths: {
    '/workflows/run': {
      post: {
        tags: ['Workflow'],
        operationId: 'runWorkflow',
        summary: '执行工作流',
        description: '使用当前应用已发布的工作流发起一次执行，并返回运行记录。',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/WorkflowRunRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: '执行已创建',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkflowRun' },
              },
            },
          },
          '401': {
            description: '鉴权失败',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/workflows/runs': {
      get: {
        tags: ['Runs'],
        operationId: 'listWorkflowRuns',
        summary: '列出运行记录',
        description: '分页查询当前应用的工作流运行记录。',
        parameters: [
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: {
              type: 'string',
              enum: ['queued', 'running', 'succeeded', 'failed', 'cancelled'],
            },
            description: '按运行状态过滤',
          },
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, default: 1 },
          },
          {
            name: 'pageSize',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        ],
        responses: {
          '200': {
            description: '运行记录列表',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items', 'total'],
                  properties: {
                    items: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/WorkflowRun' },
                    },
                    total: { type: 'integer', example: 42 },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/workflows/runs/{runId}': {
      get: {
        tags: ['Runs'],
        operationId: 'getWorkflowRun',
        summary: '获取运行详情',
        description: '根据运行 ID 查询单次执行的状态与输出。',
        parameters: [
          {
            name: 'runId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: '运行记录 ID',
          },
        ],
        responses: {
          '200': {
            description: '运行详情',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkflowRun' },
              },
            },
          },
          '404': {
            description: '运行记录不存在',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/workflows/runs/{runId}/cancel': {
      post: {
        tags: ['Runs'],
        operationId: 'cancelWorkflowRun',
        summary: '取消运行',
        description: '取消仍在排队或执行中的工作流运行。',
        parameters: [
          {
            name: 'runId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: '运行记录 ID',
          },
        ],
        responses: {
          '200': {
            description: '取消成功',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/WorkflowRun' },
              },
            },
          },
          '409': {
            description: '当前状态不可取消',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/workflows': {
      get: {
        tags: ['Workflow'],
        operationId: 'getWorkflowInfo',
        summary: '获取工作流信息',
        description: '返回当前应用已发布工作流的基本信息与公开输入契约。',
        responses: {
          '200': {
            description: '工作流信息',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['id', 'name', 'version'],
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    name: { type: 'string', example: '内容生成工作流' },
                    version: { type: 'string', example: '1.2.0' },
                    inputs: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string', example: 'query' },
                          type: { type: 'string', example: 'string' },
                          required: { type: 'boolean', example: true },
                        },
                      },
                    },
                  },
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
  { path: '/workflows/runs', method: 'get' },
  { path: '/workflows/runs/{runId}', method: 'get' },
  { path: '/workflows/runs/{runId}/cancel', method: 'post' },
  { path: '/workflows', method: 'get' },
]

export const workflowOpenApiPageProps: OpenAPIPageProps = {
  operations: workflowOpenApiOperations,
  showTitle: true,
  showDescription: true,
  payload: {
    // Fumadocs Document typing targets OpenAPI 3.2; mock schema is 3.1-compatible.
    bundled: workflowOpenApiDocument as OpenApiDocument,
  },
}
