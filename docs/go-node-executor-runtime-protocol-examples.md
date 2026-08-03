# Go 节点执行器：Runtime 与 Workflow Protocol 逐文件示例

> 对应方案：[`docs/go-node-executor-architecture.md`](./go-node-executor-architecture.md)
>
> 文档性质：第一阶段根作用域 DAG 的实现参考；当前实现以对应 package 源码和公开入口为准。
>
> 覆盖范围：只包含 `@ai-workflow/runtime` 与 `@ai-workflow/protocol`。不包含 Core、Server、
> RabbitMQ、Prisma、Go Executor 应用和具体业务节点 Executor 的实现。

## 1. 使用前提与边界

这份示例遵守以下前提：

1. 调用方已经使用 Core 的 `workflowSchema.safeParse()` 和
   `validateExecutorWorkflow(workflow, nodeRegistry)` 校验同一份不可变 WorkflowVersion 快照。
2. Core 在真正接入 Runtime 前，需要补齐主架构文档第 4.3 节已经列出的 Start、End、可达性和
   Workflow outputs 静态规则；这里不把这些规则偷偷复制到 `buildExecutionPlan()`。
3. 第一阶段只运行根作用域 DAG。包含 Loop、Loop Start、Loop Exit、Sub Workflow 或 Secret
   明文解析需求的 Workflow，由 Server 的执行能力检查在创建 Run 前拒绝。
4. Start 和 End 由 Runtime 本地推进；其他已支持的业务节点通过 `DISPATCH_NODE` Effect 交给宿主。
5. Runtime 不生成 `commandId`、`nodeRunId`、`leaseToken` 和 `deadlineAt`。这些字段需要数据库事务和
   租约上下文，由 Server 把 `DISPATCH_NODE` Effect 转成 Protocol Command 时补齐。
6. Protocol 的 JSON Schema 是跨语言协议的唯一来源。Protocol 不导入 Core；Runtime 则直接从
   `@ai-workflow/core` 使用已有领域类型。

### 1.1 Config 变量解析的当前边界

当前 Core 已明确声明 `node.inputs` 中每个值都是 `VariableValue`，所以 Runtime 可以通用解析 Inputs。
但 Core 还没有声明“每种节点 Config 中哪些位置允许 `VariableValue`”的通用运行时投影契约。

因此本示例使用必需的 `RuntimeNodeConfigResolver` 注入点：

- Runtime 提供变量解析上下文和 projector registry；
- 只含普通 JSON 的节点使用 `projectStaticJsonNodeConfig`；
- 含嵌套变量的 HTTP、Condition、Loop 等节点必须提供显式 projector 后才能加入 Server 的支持列表；
- 不允许递归扫描任意 Config 并凭对象外形猜测变量引用；
- 本文不为了解决这个缺口修改 Core，也不在 Runtime 重复声明 HTTP、Condition 等 Core 配置类型。

这不是一个未实现的方法：接口、registry、默认静态 projector、调用路径和失败行为都在下文给出。
它是第一阶段有意保留的依赖边界。

## 2. 类型所有权

| 数据                                       | 唯一来源                | 示例中的用法                            |
| ------------------------------------------ | ----------------------- | --------------------------------------- |
| `Workflow`、`WorkflowNode`、`WorkflowEdge` | `@ai-workflow/core`     | Runtime 直接导入                        |
| `VariableValue`、`JsonValue`               | `@ai-workflow/core`     | Runtime 直接导入，不声明 `RuntimeValue` |
| `NodeOutputDefinition`、`DataType`         | `@ai-workflow/core`     | Start 输入和节点输出归一化              |
| `SystemVariableKey` 与系统变量常量         | `@ai-workflow/core`     | Runtime 直接导入，不复制 Key 表         |
| RuntimeState、Effect、Transition           | `@ai-workflow/runtime`  | 仅描述一次 Run 的状态机                 |
| Command、Result、协议 JSON 值              | `@ai-workflow/protocol` | 由 JSON Schema 独立生成                 |
| Workflow 静态合法性                        | `@ai-workflow/core`     | Runtime 不重复实现                      |
| MQ 租约、NodeRun、Outbox/Inbox             | Server                  | 不进入 Runtime                          |

Protocol 中必须独立描述递归 JSON 值，因为 Go 不能导入 TypeScript Core；这不改变 Runtime 继续使用
Core `JsonValue` 的要求。

## 3. 目标文件树

```text
packages/workflow-protocol/
├── package.json
├── schemas/
│   ├── json-value.schema.json
│   ├── execute-node-command.schema.json
│   └── execute-node-result.schema.json
├── src/
│   ├── generated/
│   │   ├── json-value.generated.ts
│   │   ├── execute-node-command.generated.ts
│   │   └── execute-node-result.generated.ts
│   ├── validation/
│   │   ├── protocol-validation-error.ts
│   │   └── validators.ts
│   └── index.ts
├── go.mod
├── codec.go
├── result.go
└── types.generated.go

packages/workflow-runtime/
├── package.json
├── tsconfig.json
└── src/
    ├── compiler/
    │   ├── execution-plan.ts
    │   └── build-execution-plan.ts
    ├── config/
    │   └── runtime-node-config-resolver.ts
    ├── input/
    │   └── normalize-declared-values.ts
    ├── runtime/
    │   ├── runtime-error.ts
    │   ├── runtime-state-schema.ts
    │   ├── runtime-types.ts
    │   ├── runtime-state-operations.ts
    │   ├── restore-runtime-state.ts
    │   ├── workflow-runtime.ts
    │   └── create-workflow-runtime.ts
    ├── scheduler/
    │   ├── settle-outgoing-edges.ts
    │   └── drain-root-scope.ts
    ├── system/
    │   └── parse-system-variables.ts
    ├── utils/
    │   ├── has-own.ts
    │   ├── json-value.ts
    │   └── matches-data-type.ts
    ├── variable/
    │   ├── read-json-path.ts
    │   ├── resolve-variable-value.ts
    │   ├── resolve-node-inputs.ts
    │   └── resolve-workflow-outputs.ts
    └── index.ts
```

生成文件需要提交，但禁止手工修改。下文仍展示其完整目标形状，方便核对两端字段是否一致。

---

## 4. `@ai-workflow/protocol` 逐文件示例

### 4.1 `packages/workflow-protocol/package.json`

**作用**：声明 TypeScript 边界校验依赖和唯一公共入口。Protocol 不依赖 Core。

```json
{
  "name": "@ai-workflow/protocol",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {},
  "dependencies": {
    "ajv": "^8.17.1",
    "ajv-formats": "^3.0.1"
  }
}
```

类型生成工具可以在正式落地 codegen 时加入 `devDependencies`；生成器只负责生成文件，运行时依赖只保留
Schema validator。

### 4.2 `packages/workflow-protocol/schemas/json-value.schema.json`

**作用**：定义跨语言消息中唯一允许传输的递归 JSON 值。它独立于 Core，但结构需要与 Core
`JsonValue` 兼容。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ai-workflow.dev/schemas/json-value.schema.json",
  "title": "JsonValue",
  "oneOf": [
    { "type": "string" },
    { "type": "number" },
    { "type": "boolean" },
    { "type": "null" },
    {
      "type": "array",
      "items": { "$ref": "#" }
    },
    {
      "type": "object",
      "additionalProperties": { "$ref": "#" }
    }
  ]
}
```

### 4.3 `packages/workflow-protocol/schemas/execute-node-command.schema.json`

**作用**：定义 Server 派发给 Go Executor 的单节点命令。命令只携带解析完成的 Inputs/Config，不携带
Workflow、Edge、其他节点输出、数据库信息或长期凭证。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ai-workflow.dev/schemas/execute-node-command.schema.json",
  "title": "ExecuteNodeCommand",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "protocolVersion",
    "commandId",
    "idempotencyKey",
    "runId",
    "nodeRunId",
    "nodeId",
    "nodeType",
    "executionKey",
    "attempt",
    "leaseToken",
    "deadlineAt",
    "inputs",
    "config"
  ],
  "properties": {
    "protocolVersion": { "const": "1" },
    "commandId": { "type": "string", "minLength": 1 },
    "idempotencyKey": { "type": "string", "minLength": 1 },
    "runId": { "type": "string", "minLength": 1 },
    "nodeRunId": { "type": "string", "minLength": 1 },
    "nodeId": { "type": "string", "minLength": 1 },
    "nodeType": { "type": "string", "minLength": 1 },
    "executionKey": { "type": "string", "minLength": 1 },
    "attempt": { "type": "integer", "minimum": 1 },
    "leaseToken": { "type": "string", "minLength": 1 },
    "deadlineAt": { "type": "string", "format": "date-time" },
    "inputs": {
      "type": "object",
      "additionalProperties": {
        "$ref": "https://ai-workflow.dev/schemas/json-value.schema.json"
      }
    },
    "config": {
      "type": "object",
      "additionalProperties": {
        "$ref": "https://ai-workflow.dev/schemas/json-value.schema.json"
      }
    }
  }
}
```

### 4.4 `packages/workflow-protocol/schemas/execute-node-result.schema.json`

**作用**：定义 Go Executor 返回的单节点终态结果。成功和失败是严格判别联合，不能同时出现
`outputs` 与 `error`。

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ai-workflow.dev/schemas/execute-node-result.schema.json",
  "title": "ExecuteNodeResult",
  "oneOf": [
    {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "protocolVersion",
        "commandId",
        "nodeRunId",
        "executionKey",
        "leaseToken",
        "status",
        "outputs",
        "activatedHandles"
      ],
      "properties": {
        "protocolVersion": { "const": "1" },
        "commandId": { "type": "string", "minLength": 1 },
        "nodeRunId": { "type": "string", "minLength": 1 },
        "executionKey": { "type": "string", "minLength": 1 },
        "leaseToken": { "type": "string", "minLength": 1 },
        "status": { "const": "SUCCEEDED" },
        "outputs": {
          "type": "object",
          "additionalProperties": {
            "$ref": "https://ai-workflow.dev/schemas/json-value.schema.json"
          }
        },
        "activatedHandles": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "uniqueItems": true
        }
      }
    },
    {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "protocolVersion",
        "commandId",
        "nodeRunId",
        "executionKey",
        "leaseToken",
        "status",
        "error"
      ],
      "properties": {
        "protocolVersion": { "const": "1" },
        "commandId": { "type": "string", "minLength": 1 },
        "nodeRunId": { "type": "string", "minLength": 1 },
        "executionKey": { "type": "string", "minLength": 1 },
        "leaseToken": { "type": "string", "minLength": 1 },
        "status": { "const": "FAILED" },
        "error": {
          "type": "object",
          "additionalProperties": false,
          "required": ["code", "message", "retryable"],
          "properties": {
            "code": { "type": "string", "minLength": 1 },
            "message": { "type": "string", "minLength": 1 },
            "retryable": { "type": "boolean" },
            "details": {
              "type": "object",
              "additionalProperties": {
                "$ref": "https://ai-workflow.dev/schemas/json-value.schema.json"
              }
            }
          }
        }
      }
    }
  ]
}
```

### 4.5 `packages/workflow-protocol/src/generated/json-value.generated.ts`

**作用**：JSON Schema 生成的 TypeScript JSON 值。只在 Protocol 内使用；Runtime 不导入它代替
Core `JsonValue`。

```ts
// Code generated from schemas/json-value.schema.json. DO NOT EDIT.

export type ProtocolJsonValue =
  | string
  | number
  | boolean
  | null
  | ProtocolJsonValue[]
  | { [key: string]: ProtocolJsonValue }
```

### 4.6 `packages/workflow-protocol/src/generated/execute-node-command.generated.ts`

**作用**：JSON Schema 生成的 TypeScript Command 类型。

```ts
// Code generated from schemas/execute-node-command.schema.json. DO NOT EDIT.

import type { ProtocolJsonValue } from './json-value.generated'

export interface ExecuteNodeCommand {
  protocolVersion: '1'
  commandId: string
  idempotencyKey: string
  runId: string
  nodeRunId: string
  nodeId: string
  nodeType: string
  executionKey: string
  attempt: number
  leaseToken: string
  deadlineAt: string
  inputs: Record<string, ProtocolJsonValue>
  config: Record<string, ProtocolJsonValue>
}
```

### 4.7 `packages/workflow-protocol/src/generated/execute-node-result.generated.ts`

**作用**：JSON Schema 生成的 TypeScript Result 判别联合。

```ts
// Code generated from schemas/execute-node-result.schema.json. DO NOT EDIT.

import type { ProtocolJsonValue } from './json-value.generated'

interface ExecuteNodeResultBase {
  protocolVersion: '1'
  commandId: string
  nodeRunId: string
  executionKey: string
  leaseToken: string
}

export interface ExecuteNodeSucceededResult extends ExecuteNodeResultBase {
  status: 'SUCCEEDED'
  outputs: Record<string, ProtocolJsonValue>
  activatedHandles: string[]
}

export interface ExecuteNodeFailedResult extends ExecuteNodeResultBase {
  status: 'FAILED'
  error: {
    code: string
    message: string
    retryable: boolean
    details?: Record<string, ProtocolJsonValue>
  }
}

export type ExecuteNodeResult = ExecuteNodeSucceededResult | ExecuteNodeFailedResult
```

### 4.8 `packages/workflow-protocol/src/validation/protocol-validation-error.ts`

**作用**：把 AJV 的内部错误对象压缩为稳定、可读的协议边界错误；不把 AJV 实例或原始异常作为消息
内容传输。

```ts
import type { ErrorObject } from 'ajv'

export interface ProtocolValidationIssue {
  path: string
  message: string
}

export class ProtocolValidationError extends Error {
  readonly issues: readonly ProtocolValidationIssue[]

  constructor(message: string, issues: readonly ProtocolValidationIssue[]) {
    super(message)
    this.name = 'ProtocolValidationError'
    this.issues = issues
  }
}

export function toProtocolValidationIssues(
  errors: readonly ErrorObject[] | null | undefined,
): ProtocolValidationIssue[] {
  return (errors ?? []).map((error) => ({
    path: error.instancePath || '/',
    message: error.message ?? error.keyword,
  }))
}
```

### 4.9 `packages/workflow-protocol/src/validation/validators.ts`

**作用**：注册三份 Schema、编译校验器，并提供 Command/Result 的唯一 TypeScript 解析入口。边界输入
始终是 `unknown`，不能用类型断言跳过运行时校验。

```ts
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

import executeNodeCommandSchema from '../../schemas/execute-node-command.schema.json' with { type: 'json' }
import executeNodeResultSchema from '../../schemas/execute-node-result.schema.json' with { type: 'json' }
import jsonValueSchema from '../../schemas/json-value.schema.json' with { type: 'json' }
import type { ExecuteNodeCommand } from '../generated/execute-node-command.generated'
import type { ExecuteNodeResult } from '../generated/execute-node-result.generated'
import { ProtocolValidationError, toProtocolValidationIssues } from './protocol-validation-error'

const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
})

addFormats(ajv)
ajv.addSchema(jsonValueSchema)

const validateExecuteNodeCommand: ValidateFunction<ExecuteNodeCommand> =
  ajv.compile<ExecuteNodeCommand>(executeNodeCommandSchema)

const validateExecuteNodeResult: ValidateFunction<ExecuteNodeResult> =
  ajv.compile<ExecuteNodeResult>(executeNodeResultSchema)

function parseWithValidator<T>(value: unknown, validator: ValidateFunction<T>, message: string): T {
  if (validator(value)) {
    return value
  }

  throw new ProtocolValidationError(message, toProtocolValidationIssues(validator.errors))
}

export function parseExecuteNodeCommand(value: unknown): ExecuteNodeCommand {
  return parseWithValidator(value, validateExecuteNodeCommand, '节点执行命令不符合协议')
}

export function parseExecuteNodeResult(value: unknown): ExecuteNodeResult {
  return parseWithValidator(value, validateExecuteNodeResult, '节点执行结果不符合协议')
}
```

### 4.10 `packages/workflow-protocol/src/index.ts`

**作用**：Protocol 唯一公共入口。调用方禁止深层引用 `src/generated` 或 `src/validation`。

```ts
export type { ProtocolJsonValue } from './generated/json-value.generated'
export type { ExecuteNodeCommand } from './generated/execute-node-command.generated'
export type {
  ExecuteNodeFailedResult,
  ExecuteNodeResult,
  ExecuteNodeSucceededResult,
} from './generated/execute-node-result.generated'

export {
  ProtocolValidationError,
  type ProtocolValidationIssue,
} from './validation/protocol-validation-error'
export { parseExecuteNodeCommand, parseExecuteNodeResult } from './validation/validators'
```

### 4.11 `packages/workflow-protocol/go.mod`

**作用**：让 Go Executor 直接依赖 Protocol 根模块。把 Go module 放在 Protocol 根目录后，Go codec
可以直接 `embed` 同一份 `schemas/*.json`，不需要维护第二套 Schema。

```go
module workflow-protocol

go 1.25.1

require github.com/santhosh-tekuri/jsonschema/v5 v5.3.1
```

正式仓库确定 Go Executor module path 后，再把示例中的本地 module 名替换成仓库真实导入路径。

### 4.12 `packages/workflow-protocol/types.generated.go`

**作用**：由同一批 JSON Schema 生成 Go 消息结构。Go 没有 TypeScript 判别联合，因此生成结构使用
`Status` 加可选字段表示两种结果，完整互斥约束仍由 Schema validator 保证。

```go
// Code generated from schemas/*.schema.json. DO NOT EDIT.

package protocol

type JSONValue = any

type ExecuteNodeCommand struct {
	ProtocolVersion string               `json:"protocolVersion"`
	CommandID       string               `json:"commandId"`
	IdempotencyKey  string               `json:"idempotencyKey"`
	RunID           string               `json:"runId"`
	NodeRunID       string               `json:"nodeRunId"`
	NodeID          string               `json:"nodeId"`
	NodeType        string               `json:"nodeType"`
	ExecutionKey    string               `json:"executionKey"`
	Attempt         int                  `json:"attempt"`
	LeaseToken      string               `json:"leaseToken"`
	DeadlineAt      string               `json:"deadlineAt"`
	Inputs          map[string]JSONValue `json:"inputs"`
	Config          map[string]JSONValue `json:"config"`
}

type NodeResultStatus string

const (
	NodeResultStatusSucceeded NodeResultStatus = "SUCCEEDED"
	NodeResultStatusFailed    NodeResultStatus = "FAILED"
)

type NodeExecutionError struct {
	Code      string               `json:"code"`
	Message   string               `json:"message"`
	Retryable bool                 `json:"retryable"`
	Details   map[string]JSONValue `json:"details,omitempty"`
}

type ExecuteNodeResult struct {
	ProtocolVersion  string               `json:"protocolVersion"`
	CommandID        string               `json:"commandId"`
	NodeRunID        string               `json:"nodeRunId"`
	ExecutionKey     string               `json:"executionKey"`
	LeaseToken       string               `json:"leaseToken"`
	Status           NodeResultStatus     `json:"status"`
	Outputs          *map[string]JSONValue `json:"outputs,omitempty"`
	ActivatedHandles *[]string             `json:"activatedHandles,omitempty"`
	Error            *NodeExecutionError  `json:"error,omitempty"`
}
```

### 4.13 `packages/workflow-protocol/result.go`

**作用**：提供成功/失败 Result 构造方法，避免每个 Executor 手工拼装互斥字段。构造后仍由 Worker 在
发布前调用 `ValidateExecuteNodeResult()`。

```go
package protocol

type ResultIdentity struct {
	ProtocolVersion string
	CommandID       string
	NodeRunID       string
	ExecutionKey    string
	LeaseToken      string
}

func NewSucceededResult(
	identity ResultIdentity,
	outputs map[string]JSONValue,
	activatedHandles []string,
) ExecuteNodeResult {
	resultOutputs := outputs
	if resultOutputs == nil {
		resultOutputs = map[string]JSONValue{}
	}
	resultHandles := append([]string{}, activatedHandles...)

	return ExecuteNodeResult{
		ProtocolVersion:  identity.ProtocolVersion,
		CommandID:        identity.CommandID,
		NodeRunID:        identity.NodeRunID,
		ExecutionKey:     identity.ExecutionKey,
		LeaseToken:       identity.LeaseToken,
		Status:           NodeResultStatusSucceeded,
		Outputs:          &resultOutputs,
		ActivatedHandles: &resultHandles,
	}
}

func NewFailedResult(
	identity ResultIdentity,
	executionError NodeExecutionError,
) ExecuteNodeResult {
	return ExecuteNodeResult{
		ProtocolVersion: identity.ProtocolVersion,
		CommandID:       identity.CommandID,
		NodeRunID:       identity.NodeRunID,
		ExecutionKey:    identity.ExecutionKey,
		LeaseToken:      identity.LeaseToken,
		Status:          NodeResultStatusFailed,
		Error:           &executionError,
	}
}
```

### 4.14 `packages/workflow-protocol/codec.go`

**作用**：在 Go 消息边界编译并执行同一份 JSON Schema；`json.Unmarshal` 成功不能替代 Schema 校验。
这里的所有辅助方法都有完整实现，没有依赖未定义的 codec。

```go
package protocol

import (
	"bytes"
	"embed"
	"encoding/json"
	"fmt"
	"io"

	"github.com/santhosh-tekuri/jsonschema/v5"
)

const (
	jsonValueSchemaID        = "https://ai-workflow.dev/schemas/json-value.schema.json"
	executeNodeCommandSchemaID = "https://ai-workflow.dev/schemas/execute-node-command.schema.json"
	executeNodeResultSchemaID  = "https://ai-workflow.dev/schemas/execute-node-result.schema.json"
)

//go:embed schemas/*.schema.json
var protocolSchemas embed.FS

var (
	executeNodeCommandSchema = mustCompileSchema(executeNodeCommandSchemaID)
	executeNodeResultSchema  = mustCompileSchema(executeNodeResultSchemaID)
)

func mustCompileSchema(schemaID string) *jsonschema.Schema {
	compiler := jsonschema.NewCompiler()

	resources := []struct {
		id   string
		path string
	}{
		{jsonValueSchemaID, "schemas/json-value.schema.json"},
		{executeNodeCommandSchemaID, "schemas/execute-node-command.schema.json"},
		{executeNodeResultSchemaID, "schemas/execute-node-result.schema.json"},
	}

	for _, resource := range resources {
		content, err := protocolSchemas.ReadFile(resource.path)
		if err != nil {
			panic(fmt.Errorf("read protocol schema %s: %w", resource.path, err))
		}

		if err := compiler.AddResource(resource.id, bytes.NewReader(content)); err != nil {
			panic(fmt.Errorf("register protocol schema %s: %w", resource.id, err))
		}
	}

	compiled, err := compiler.Compile(schemaID)
	if err != nil {
		panic(fmt.Errorf("compile protocol schema %s: %w", schemaID, err))
	}

	return compiled
}

func decodeAndValidate(data []byte, schema *jsonschema.Schema, target any) error {
	var raw any
	if err := json.Unmarshal(data, &raw); err != nil {
		return fmt.Errorf("decode protocol JSON: %w", err)
	}

	if err := schema.Validate(raw); err != nil {
		return fmt.Errorf("validate protocol JSON: %w", err)
	}

	decoder := json.NewDecoder(bytes.NewReader(data))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return fmt.Errorf("decode typed protocol message: %w", err)
	}

	if err := ensureJSONEOF(decoder); err != nil {
		return err
	}

	return nil
}

func ensureJSONEOF(decoder *json.Decoder) error {
	var extra any
	if err := decoder.Decode(&extra); err == io.EOF {
		return nil
	} else if err != nil {
		return fmt.Errorf("decode trailing protocol data: %w", err)
	}

	return fmt.Errorf("protocol message contains multiple JSON values")
}

func validateTypedMessage(value any, schema *jsonschema.Schema) error {
	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("encode typed protocol message: %w", err)
	}

	var raw any
	if err := json.Unmarshal(data, &raw); err != nil {
		return fmt.Errorf("decode encoded protocol message: %w", err)
	}

	if err := schema.Validate(raw); err != nil {
		return fmt.Errorf("validate typed protocol message: %w", err)
	}

	return nil
}

func DecodeExecuteNodeCommand(data []byte) (ExecuteNodeCommand, error) {
	var command ExecuteNodeCommand
	if err := decodeAndValidate(data, executeNodeCommandSchema, &command); err != nil {
		return ExecuteNodeCommand{}, err
	}

	return command, nil
}

func DecodeExecuteNodeResult(data []byte) (ExecuteNodeResult, error) {
	var result ExecuteNodeResult
	if err := decodeAndValidate(data, executeNodeResultSchema, &result); err != nil {
		return ExecuteNodeResult{}, err
	}

	return result, nil
}

func ValidateExecuteNodeCommand(command ExecuteNodeCommand) error {
	return validateTypedMessage(command, executeNodeCommandSchema)
}

func ValidateExecuteNodeResult(result ExecuteNodeResult) error {
	return validateTypedMessage(result, executeNodeResultSchema)
}
```

---

## 5. `@ai-workflow/runtime` 逐文件示例

### 5.1 `packages/workflow-runtime/package.json`

**作用**：声明 Runtime 对 Core、Protocol 和 State Schema 校验器的直接依赖。Runtime 不依赖 Server、
NestJS、Prisma、RabbitMQ 或 React。

```json
{
  "name": "@ai-workflow/runtime",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {},
  "dependencies": {
    "@ai-workflow/core": "workspace:*",
    "@ai-workflow/protocol": "workspace:*",
    "zod": "^4.4.3"
  }
}
```

### 5.2 `packages/workflow-runtime/tsconfig.json`

**作用**：复用 workspace package TypeScript 配置。

```json
{
  "extends": ["../../configs/typescript/packages-tsconfig.json"],
  "include": ["."]
}
```

### 5.3 `packages/workflow-runtime/src/compiler/execution-plan.ts`

**作用**：声明只存在于内存中的查询索引。它直接使用 Core 的 Workflow/Node/Edge 类型，不复制领域
结构。

```ts
import type { Workflow, WorkflowEdge, WorkflowNode } from '@ai-workflow/core'

export type StaticScopeKey = 'root' | string

export interface ExecutionPlan {
  readonly workflow: Workflow
  readonly nodeById: ReadonlyMap<string, WorkflowNode>
  readonly incomingEdges: ReadonlyMap<string, readonly WorkflowEdge[]>
  readonly outgoingEdges: ReadonlyMap<string, readonly WorkflowEdge[]>
  readonly childrenByScope: ReadonlyMap<StaticScopeKey, readonly string[]>
  readonly edgesByScope: ReadonlyMap<StaticScopeKey, readonly WorkflowEdge[]>
}
```

### 5.4 `packages/workflow-runtime/src/compiler/build-execution-plan.ts`

**作用**：把已经通过 Core 执行前校验的 Workflow 机械投影为 Map 索引。此处没有唯一性、端口、环、
Loop 或可达性检查。

```ts
import type { Workflow, WorkflowEdge } from '@ai-workflow/core'

import type { ExecutionPlan, StaticScopeKey } from './execution-plan'

function appendMapValue<TKey, TValue>(map: Map<TKey, TValue[]>, key: TKey, value: TValue): void {
  const values = map.get(key)
  if (values) {
    values.push(value)
  } else {
    map.set(key, [value])
  }
}

function freezeArrayMap<TKey, TValue>(
  map: ReadonlyMap<TKey, TValue[]>,
): ReadonlyMap<TKey, readonly TValue[]> {
  return new Map([...map].map(([key, values]) => [key, Object.freeze([...values])]))
}

export function buildExecutionPlan(workflow: Workflow): ExecutionPlan {
  const nodeById = new Map(workflow.nodes.map((node) => [node.id, node]))
  const incomingEdges = new Map<string, WorkflowEdge[]>()
  const outgoingEdges = new Map<string, WorkflowEdge[]>()
  const childrenByScope = new Map<StaticScopeKey, string[]>()
  const edgesByScope = new Map<StaticScopeKey, WorkflowEdge[]>()

  for (const node of workflow.nodes) {
    appendMapValue(childrenByScope, node.parentId ?? 'root', node.id)
  }

  for (const edge of workflow.edges) {
    appendMapValue(incomingEdges, edge.target, edge)
    appendMapValue(outgoingEdges, edge.source, edge)

    // Core 已保证 Edge 不跨静态 Scope，因此使用 source 的 Scope 即可。
    const sourceNode = nodeById.get(edge.source)!
    appendMapValue(edgesByScope, sourceNode.parentId ?? 'root', edge)
  }

  return {
    workflow,
    nodeById,
    incomingEdges: freezeArrayMap(incomingEdges),
    outgoingEdges: freezeArrayMap(outgoingEdges),
    childrenByScope: freezeArrayMap(childrenByScope),
    edgesByScope: freezeArrayMap(edgesByScope),
  }
}
```

### 5.5 `packages/workflow-runtime/src/runtime/runtime-error.ts`

**作用**：定义 Runtime 自己的稳定错误码、可持久化错误数据和进程内异常。Runtime 错误与 Go 节点
Executor 错误属于不同契约。

```ts
import { jsonValueSchema, type JsonValue } from '@ai-workflow/core'
import { z } from 'zod'

export const RUNTIME_ERROR_CODES = {
  // 启动边界：Start 输入存在未声明字段或缺少必填字段。
  INVALID_START_INPUT: 'INVALID_START_INPUT',
  // 启动边界：系统变量键集合不完整或变量值与声明的数据类型不匹配。
  INVALID_SYSTEM_VARIABLES: 'INVALID_SYSTEM_VARIABLES',
  // 恢复边界：持久化的 RuntimeState 无法通过当前 State Schema 校验。
  INVALID_RUNTIME_STATE: 'INVALID_RUNTIME_STATE',
  // 调用参数、Workflow 快照、RuntimeState 或系统变量中的运行身份不一致。
  RUNTIME_IDENTITY_MISMATCH: 'RUNTIME_IDENTITY_MISMATCH',
  // RuntimeState 内部索引、节点状态、Execution 状态或 WorkflowVersion 快照不一致。
  RUNTIME_STATE_MISMATCH: 'RUNTIME_STATE_MISMATCH',
  // 当前 Run 已经成功或失败，不能继续应用新的节点结果。
  RUN_ALREADY_TERMINAL: 'RUN_ALREADY_TERMINAL',
  // 仍有 WAITING 节点，但没有 RUNNING 节点，也没有任何节点可以继续推进。
  RUN_STALLED: 'RUN_STALLED',
  // 直接值、解析结果、节点输出或节点配置不是可序列化的 JsonValue。
  VALUE_NOT_JSON: 'VALUE_NOT_JSON',
  // 动态值不符合 Core 中声明的 string、number、boolean 或 json 数据类型。
  VALUE_TYPE_MISMATCH: 'VALUE_TYPE_MISMATCH',
  // 变量引用的系统变量、环境变量、节点执行结果或输出字段不存在。
  VARIABLE_NOT_FOUND: 'VARIABLE_NOT_FOUND',
  // 变量根值存在，但引用的对象属性或数组下标路径不存在。
  VARIABLE_PATH_NOT_FOUND: 'VARIABLE_PATH_NOT_FOUND',
  // 当前阶段不允许把 Secret 环境变量明文写入 RuntimeState 或 MQ。
  UNSUPPORTED_SECRET_VARIABLE: 'UNSUPPORTED_SECRET_VARIABLE',
  // 当前节点类型没有注册显式 Runtime Config projector。
  UNSUPPORTED_NODE_CONFIG: 'UNSUPPORTED_NODE_CONFIG',
  // Executor 返回的输出字段缺失、多余，或结果不符合节点输出声明。
  INVALID_NODE_RESULT: 'INVALID_NODE_RESULT',
  // 节点 Executor 执行失败，Runtime 将其归一化为工作流失败原因。
  NODE_EXECUTION_FAILED: 'NODE_EXECUTION_FAILED',
  // 非 RuntimeError 的未知异常被收口为稳定的 Runtime 内部错误。
  INTERNAL_RUNTIME_ERROR: 'INTERNAL_RUNTIME_ERROR',
} as const

export type RuntimeErrorCode = (typeof RUNTIME_ERROR_CODES)[keyof typeof RUNTIME_ERROR_CODES]

export const runtimeErrorDataSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.string(), jsonValueSchema).optional(),
})

export type RuntimeErrorData = z.output<typeof runtimeErrorDataSchema>

export class RuntimeError extends Error {
  readonly code: RuntimeErrorCode
  readonly details?: Record<string, JsonValue>

  constructor(code: RuntimeErrorCode, message: string, details?: Record<string, JsonValue>) {
    super(message)
    this.name = 'RuntimeError'
    this.code = code
    this.details = details
  }

  toData(): RuntimeErrorData {
    return {
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
    }
  }
}

export function toRuntimeError(error: unknown): RuntimeError {
  if (error instanceof RuntimeError) {
    return error
  }

  return new RuntimeError(
    RUNTIME_ERROR_CODES.INTERNAL_RUNTIME_ERROR,
    error instanceof Error ? error.message : '未知 Runtime 错误',
  )
}
```

### 5.6 `packages/workflow-runtime/src/runtime/runtime-state-schema.ts`

**作用**：定义可持久化 RuntimeState 的唯一结构校验。所有状态字段都是 JSON 数据；Map 只存在于
ExecutionPlan，不进入数据库。

```ts
import {
  jsonValueSchema,
  systemVariableKeySchema,
  type JsonValue,
  type SystemVariableKey,
} from '@ai-workflow/core'
import { z } from 'zod'

import { runtimeErrorDataSchema } from './runtime-error'

export const RUNTIME_STATE_SCHEMA_VERSION = 1 as const

export const RUNTIME_RUN_STATUSES = {
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const

export const RUNTIME_NODE_STATUSES = {
  WAITING: 'WAITING',
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
} as const

export const RUNTIME_EDGE_STATUSES = {
  WAITING: 'WAITING',
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const

export const RUNTIME_EXECUTION_STATUSES = {
  RUNNING: 'RUNNING',
  SUCCEEDED: 'SUCCEEDED',
  FAILED: 'FAILED',
} as const

const runtimeRunStatusSchema = z.enum(RUNTIME_RUN_STATUSES)
const runtimeNodeStatusSchema = z.enum(RUNTIME_NODE_STATUSES)
const runtimeEdgeStatusSchema = z.enum(RUNTIME_EDGE_STATUSES)
const runtimeExecutionStatusSchema = z.enum(RUNTIME_EXECUTION_STATUSES)

const runtimeSystemVariablesSchema: z.ZodType<Record<SystemVariableKey, JsonValue>> = z.record(
  systemVariableKeySchema,
  jsonValueSchema,
)

const runtimeNodeStateSchema = z.object({
  status: runtimeNodeStatusSchema,
  latestExecutionKey: z.string().min(1).optional(),
})

const runtimeExecutionSchema = z.object({
  executionKey: z.string().min(1),
  nodeId: z.string().min(1),
  scopeKey: z.literal('root'),
  sequence: z.number().int().nonnegative(),
  attempt: z.number().int().positive(),
  status: runtimeExecutionStatusSchema,
  inputs: z.record(z.string(), jsonValueSchema),
  config: z.record(z.string(), jsonValueSchema),
  outputs: z.record(z.string(), jsonValueSchema).optional(),
  error: runtimeErrorDataSchema.optional(),
})

export const runtimeStateSchema = z.object({
  schemaVersion: z.literal(RUNTIME_STATE_SCHEMA_VERSION),
  revision: z.number().int().nonnegative(),
  runId: z.string().min(1),
  workflowId: z.string().min(1),
  workflowVersionId: z.string().min(1),
  status: runtimeRunStatusSchema,
  startInput: z.record(z.string(), jsonValueSchema),
  systemVariables: runtimeSystemVariablesSchema,
  nodeStates: z.record(z.string(), runtimeNodeStateSchema),
  edgeStates: z.record(z.string(), runtimeEdgeStatusSchema),
  executions: z.record(z.string(), runtimeExecutionSchema),
  nextExecutionSequence: z.number().int().nonnegative(),
})

export type RuntimeState = z.output<typeof runtimeStateSchema>
export type RuntimeNodeState = z.output<typeof runtimeNodeStateSchema>
export type RuntimeExecution = z.output<typeof runtimeExecutionSchema>
export type RuntimeRunStatus = z.output<typeof runtimeRunStatusSchema>
export type RuntimeNodeStatus = z.output<typeof runtimeNodeStatusSchema>
export type RuntimeEdgeStatus = z.output<typeof runtimeEdgeStatusSchema>
```

`z.record(systemVariableKeySchema, jsonValueSchema)` 直接复用 Core 的系统变量 Key Schema，不在
Runtime 再写一份 `user_id`、`workflow_id` 等字符串数组。

### 5.7 `packages/workflow-runtime/src/runtime/runtime-types.ts`

**作用**：声明 Runtime 入口和 Effect。这里的 JSON 值直接使用 Core `JsonValue`。

```ts
import type { JsonValue, SystemVariableKey, VariableValue, WorkflowNode } from '@ai-workflow/core'

import type { RuntimeErrorData } from './runtime-error'
import type { RuntimeState } from './runtime-state-schema'

export interface StartRuntimeInput {
  runId: string
  input: Record<string, unknown>
  systemVariables: Record<SystemVariableKey, JsonValue>
}

export interface DispatchNodeEffect {
  type: 'DISPATCH_NODE'
  runId: string
  nodeId: string
  nodeType: string
  executionKey: string
  attempt: number
  inputs: Record<string, JsonValue>
  config: Record<string, JsonValue>
}

export interface CompleteRunEffect {
  type: 'COMPLETE_RUN'
  runId: string
  outputs: Record<string, JsonValue>
}

export interface FailRunEffect {
  type: 'FAIL_RUN'
  runId: string
  error: RuntimeErrorData
}

export type RuntimeEffect = DispatchNodeEffect | CompleteRunEffect | FailRunEffect

export interface RuntimeTransition {
  state: RuntimeState
  effects: RuntimeEffect[]
}

export interface RuntimeVariableResolverContext {
  readonly node: WorkflowNode
  resolveValue(value: VariableValue): JsonValue
}
```

最后一个 Context 只为 Config projector 提供“当前节点 + 解析单个 Core VariableValue”的最小能力，
不暴露可修改的 RuntimeState。

### 5.8 `packages/workflow-runtime/src/utils/has-own.ts`

**作用**：安全检查 JSON 对象自己的字段，避免原型链字段被当成用户输入。

```ts
export function hasOwn(value: object, key: PropertyKey): boolean {
  return Object.prototype.hasOwnProperty.call(value, key)
}
```

### 5.9 `packages/workflow-runtime/src/utils/json-value.ts`

**作用**：把 `unknown` 收敛为 Core `JsonValue` 或 JSON Object。Runtime 不声明新的值类型。

```ts
import { jsonValueSchema, type JsonValue } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'

export function parseJsonValue(value: unknown, field: string): JsonValue {
  const parsed = jsonValueSchema.safeParse(value)
  if (!parsed.success) {
    throw new RuntimeError(RUNTIME_ERROR_CODES.VALUE_NOT_JSON, `${field} 不是合法 JSON 值`, {
      field,
      issues: parsed.error.issues.map((issue) => issue.message),
    })
  }

  return parsed.data
}

export function parseJsonObject(value: unknown, field: string): Record<string, JsonValue> {
  const parsed = parseJsonValue(value, field)
  if (parsed === null || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new RuntimeError(RUNTIME_ERROR_CODES.VALUE_NOT_JSON, `${field} 必须是 JSON 对象`, {
      field,
    })
  }

  return parsed
}
```

### 5.10 `packages/workflow-runtime/src/utils/matches-data-type.ts`

**作用**：校验某次 Run 的动态值是否符合 Core `DataType` 元数据。Edge 连线类型不在这里重新校验。

```ts
import { DATA_TYPE_KINDS, type DataType, type JsonValue } from '@ai-workflow/core'

export function matchesDataType(value: JsonValue, dataType: DataType): boolean {
  switch (dataType) {
    case DATA_TYPE_KINDS.STRING:
      return typeof value === 'string'
    case DATA_TYPE_KINDS.NUMBER:
      return typeof value === 'number'
    case DATA_TYPE_KINDS.BOOLEAN:
      return typeof value === 'boolean'
    case DATA_TYPE_KINDS.JSON:
      return true
  }
}
```

### 5.11 `packages/workflow-runtime/src/system/parse-system-variables.ts`

**作用**：校验系统变量完整键集合、JSON 值、DataType 和 Run/Workflow 身份。键与定义全部来自 Core。

```ts
import {
  SYSTEM_VARIABLE_DEFINITIONS,
  SYSTEM_VARIABLE_KEYS,
  type JsonValue,
  type SystemVariableKey,
} from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { hasOwn } from '../utils/has-own'
import { parseJsonValue } from '../utils/json-value'
import { matchesDataType } from '../utils/matches-data-type'

export interface SystemVariableIdentity {
  runId: string
  workflowId: string
}

export function parseSystemVariables(
  rawVariables: Record<SystemVariableKey, JsonValue>,
  identity: SystemVariableIdentity,
): Record<SystemVariableKey, JsonValue> {
  const expectedKeys = new Set(SYSTEM_VARIABLE_DEFINITIONS.map((definition) => definition.key))
  const actualKeys = Object.keys(rawVariables)

  const missingKeys = [...expectedKeys].filter((key) => !hasOwn(rawVariables, key))
  const unknownKeys = actualKeys.filter((key) => !expectedKeys.has(key as SystemVariableKey))

  if (missingKeys.length > 0 || unknownKeys.length > 0) {
    throw new RuntimeError(RUNTIME_ERROR_CODES.INVALID_SYSTEM_VARIABLES, '系统变量键集合不完整', {
      missingKeys,
      unknownKeys,
    })
  }

  const parsedVariables = {} as Record<SystemVariableKey, JsonValue>

  for (const definition of SYSTEM_VARIABLE_DEFINITIONS) {
    const value = parseJsonValue(rawVariables[definition.key], `system.${definition.key}`)
    if (!matchesDataType(value, definition.dataType)) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.INVALID_SYSTEM_VARIABLES,
        `系统变量 ${definition.key} 类型不匹配`,
        { key: definition.key, expectedDataType: definition.dataType },
      )
    }

    parsedVariables[definition.key] = value
  }

  if (parsedVariables[SYSTEM_VARIABLE_KEYS.WORKFLOW_ID] !== identity.workflowId) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH,
      '系统变量中的 workflow_id 与 Workflow 快照不一致',
    )
  }

  if (parsedVariables[SYSTEM_VARIABLE_KEYS.WORKFLOW_RUN_ID] !== identity.runId) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH,
      '系统变量中的 workflow_run_id 与 Run 不一致',
    )
  }

  return parsedVariables
}
```

### 5.12 `packages/workflow-runtime/src/input/normalize-declared-values.ts`

**作用**：按 Core `NodeOutputDefinition` 归一化 Start 输入或业务节点输出，统一处理未知字段、必填、
默认值、JSON 边界和 DataType。

```ts
import type { JsonValue, NodeOutputDefinition } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { hasOwn } from '../utils/has-own'
import { parseJsonValue } from '../utils/json-value'
import { matchesDataType } from '../utils/matches-data-type'

export interface NormalizeDeclaredValuesOptions {
  boundary: 'startInput' | 'nodeOutput'
  ownerId: string
}

export function normalizeDeclaredValues(
  rawValues: Readonly<Record<string, unknown>>,
  definitions: readonly NodeOutputDefinition[],
  options: NormalizeDeclaredValuesOptions,
): Record<string, JsonValue> {
  const definitionByKey = new Map(definitions.map((definition) => [definition.key, definition]))
  const unknownKeys = Object.keys(rawValues).filter((key) => !definitionByKey.has(key))

  if (unknownKeys.length > 0) {
    throw new RuntimeError(
      options.boundary === 'startInput'
        ? RUNTIME_ERROR_CODES.INVALID_START_INPUT
        : RUNTIME_ERROR_CODES.INVALID_NODE_RESULT,
      '存在未声明的变量字段',
      { ownerId: options.ownerId, unknownKeys },
    )
  }

  const normalized: Record<string, JsonValue> = {}

  for (const definition of definitions) {
    let rawValue: unknown

    if (hasOwn(rawValues, definition.key)) {
      rawValue = rawValues[definition.key]
    } else if (definition.defaultValue !== undefined) {
      rawValue = definition.defaultValue
    } else if (definition.required === true) {
      throw new RuntimeError(
        options.boundary === 'startInput'
          ? RUNTIME_ERROR_CODES.INVALID_START_INPUT
          : RUNTIME_ERROR_CODES.INVALID_NODE_RESULT,
        `缺少必填变量：${definition.key}`,
        { ownerId: options.ownerId, key: definition.key },
      )
    } else {
      continue
    }

    const value = parseJsonValue(rawValue, `${options.boundary}.${definition.key}`)
    if (!matchesDataType(value, definition.dataType)) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.VALUE_TYPE_MISMATCH,
        `变量 ${definition.key} 与声明类型不匹配`,
        {
          ownerId: options.ownerId,
          key: definition.key,
          expectedDataType: definition.dataType,
        },
      )
    }

    normalized[definition.key] = value
  }

  return normalized
}
```

### 5.13 `packages/workflow-runtime/src/config/runtime-node-config-resolver.ts`

**作用**：显式注册每个可执行业务节点的 Config projector。Runtime 调度器不按 HTTP、LLM、Condition
写 `switch`，未注册的节点稳定失败。

```ts
import type { JsonValue, VariableValue, WorkflowNode } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import type { RuntimeVariableResolverContext } from '../runtime/runtime-types'
import { parseJsonObject } from '../utils/json-value'

export type RuntimeNodeConfigProjector = (
  node: WorkflowNode,
  context: RuntimeVariableResolverContext,
) => Record<string, JsonValue>

export interface RuntimeNodeConfigResolver {
  resolve(
    node: WorkflowNode,
    resolveValue: (value: VariableValue) => JsonValue,
  ): Record<string, JsonValue>
}

export function projectStaticJsonNodeConfig(
  node: WorkflowNode,
  _context: RuntimeVariableResolverContext,
): Record<string, JsonValue> {
  return parseJsonObject(node.config, `node.${node.id}.config`)
}

export function createRuntimeNodeConfigResolver(
  projectors: Readonly<Record<string, RuntimeNodeConfigProjector>>,
): RuntimeNodeConfigResolver {
  const projectorByNodeType = new Map(Object.entries(projectors))

  return {
    resolve(node, resolveValue) {
      const projector = projectorByNodeType.get(node.type)
      if (!projector) {
        throw new RuntimeError(
          RUNTIME_ERROR_CODES.UNSUPPORTED_NODE_CONFIG,
          `节点类型 ${node.type} 没有 Runtime Config projector`,
          { nodeId: node.id, nodeType: node.type },
        )
      }

      const config = projector(node, {
        node,
        resolveValue,
      })

      return parseJsonObject(config, `node.${node.id}.resolvedConfig`)
    },
  }
}
```

例如 Code、LLM、RAG 在确认其 Config 不含运行时变量位置后，可以注册
`projectStaticJsonNodeConfig`。HTTP/Condition 不应注册这个 projector，因为它们的 Core Config 中
有嵌套 `VariableValue`；必须提供显式 projector 或暂不列入支持节点集合。

### 5.14 `packages/workflow-runtime/src/variable/read-json-path.ts`

**作用**：按 Core VariableReference 的 `path` 读取对象字段或数组下标。缺失字段返回稳定 Runtime
错误，不用可选链静默得到 `undefined`。

```ts
import type { JsonValue } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { hasOwn } from '../utils/has-own'

function readArrayIndex(value: JsonValue[], segment: string): JsonValue | undefined {
  if (!/^(0|[1-9]\d*)$/.test(segment)) {
    return undefined
  }

  const index = Number(segment)
  return index < value.length ? value[index] : undefined
}

export function readJsonPath(
  root: JsonValue,
  path: readonly string[],
  referenceLabel: string,
): JsonValue {
  let current = root

  for (const segment of path) {
    let next: JsonValue | undefined

    if (Array.isArray(current)) {
      next = readArrayIndex(current, segment)
    } else if (current !== null && typeof current === 'object' && hasOwn(current, segment)) {
      next = current[segment]
    }

    if (next === undefined) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.VARIABLE_PATH_NOT_FOUND,
        `变量路径不存在：${referenceLabel}.${path.join('.')}`,
        { referenceLabel, path: [...path], missingSegment: segment },
      )
    }

    current = next
  }

  return current
}
```

### 5.15 `packages/workflow-runtime/src/variable/resolve-variable-value.ts`

**作用**：统一解析 Core `VariableValue` 的直接值、节点引用、系统变量和环境变量。第一阶段只允许
根 Scope；不解析 executionKey 字符串来推断 nodeId。

```ts
import {
  ENVIRONMENT_VARIABLE_TYPES,
  type JsonValue,
  type VariableValue,
  type Workflow,
} from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import type { RuntimeState } from '../runtime/runtime-state-schema'
import { hasOwn } from '../utils/has-own'
import { parseJsonValue } from '../utils/json-value'
import { readJsonPath } from './read-json-path'

export interface VariableResolutionContext {
  readonly workflow: Workflow
  readonly state: RuntimeState
  readonly scopeKey: 'root'
}

function resolveNodeValue(
  value: Extract<VariableValue, { type: 'reference' }>['reference'] & { scope: 'node' },
  context: VariableResolutionContext,
): JsonValue {
  const nodeState = context.state.nodeStates[value.nodeId]
  const executionKey = nodeState?.latestExecutionKey
  if (!executionKey) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.VARIABLE_NOT_FOUND,
      `节点 ${value.nodeId} 在当前 Scope 没有可见执行结果`,
      { nodeId: value.nodeId, scopeKey: context.scopeKey },
    )
  }

  const execution = context.state.executions[executionKey]
  if (
    !execution ||
    execution.nodeId !== value.nodeId ||
    execution.scopeKey !== context.scopeKey ||
    execution.status !== 'SUCCEEDED' ||
    !execution.outputs
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `节点 ${value.nodeId} 的最近执行记录不可用于变量解析`,
      { nodeId: value.nodeId, executionKey, scopeKey: context.scopeKey },
    )
  }

  if (!hasOwn(execution.outputs, value.outputKey)) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.VARIABLE_NOT_FOUND,
      `节点 ${value.nodeId} 没有输出变量 ${value.outputKey}`,
      { nodeId: value.nodeId, outputKey: value.outputKey },
    )
  }

  return readJsonPath(
    execution.outputs[value.outputKey]!,
    value.path,
    `${value.nodeId}.${value.outputKey}`,
  )
}

function resolveSystemValue(
  value: Extract<VariableValue, { type: 'reference' }>['reference'] & { scope: 'system' },
  context: VariableResolutionContext,
): JsonValue {
  if (!hasOwn(context.state.systemVariables, value.key)) {
    throw new RuntimeError(RUNTIME_ERROR_CODES.VARIABLE_NOT_FOUND, `系统变量不存在：${value.key}`, {
      key: value.key,
    })
  }

  return readJsonPath(context.state.systemVariables[value.key], value.path, `sys.${value.key}`)
}

function resolveEnvironmentValue(
  value: Extract<VariableValue, { type: 'reference' }>['reference'] & { scope: 'env' },
  context: VariableResolutionContext,
): JsonValue {
  const variable = context.workflow.environmentVariables.find(
    (candidate) => candidate.id === value.variableId,
  )

  if (!variable) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.VARIABLE_NOT_FOUND,
      `环境变量不存在：${value.variableId}`,
      { variableId: value.variableId },
    )
  }

  if (variable.type === ENVIRONMENT_VARIABLE_TYPES.SECRET) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.UNSUPPORTED_SECRET_VARIABLE,
      `Secret 环境变量 ${variable.name} 不能进入 RuntimeState 或 MQ`,
      { variableId: variable.id, variableName: variable.name },
    )
  }

  return readJsonPath(variable.value, value.path, `env.${variable.name}`)
}

export function resolveVariableValue(
  variableValue: VariableValue,
  context: VariableResolutionContext,
): JsonValue {
  if (variableValue.type === 'value') {
    return parseJsonValue(variableValue.value, 'variable.value')
  }

  switch (variableValue.reference.scope) {
    case 'node':
      return resolveNodeValue(variableValue.reference, context)
    case 'system':
      return resolveSystemValue(variableValue.reference, context)
    case 'env':
      return resolveEnvironmentValue(variableValue.reference, context)
  }
}
```

这里没有重新校验“节点引用是否为上游”或“环境变量 ID 是否存在于 Workflow”；这些静态规则已经由
Core 负责。运行时仍检查实际输出、当前执行记录和 path，因为这些信息只有本次 Run 才存在。

### 5.16 `packages/workflow-runtime/src/variable/resolve-node-inputs.ts`

**作用**：解析节点明确声明的 `node.inputs`。不递归扫描任意 Config。

```ts
import type { JsonValue, WorkflowNode } from '@ai-workflow/core'

import { resolveVariableValue, type VariableResolutionContext } from './resolve-variable-value'

export function resolveNodeInputs(
  node: WorkflowNode,
  context: VariableResolutionContext,
): Record<string, JsonValue> {
  return Object.fromEntries(
    Object.entries(node.inputs).map(([key, value]) => [key, resolveVariableValue(value, context)]),
  )
}
```

### 5.17 `packages/workflow-runtime/src/variable/resolve-workflow-outputs.ts`

**作用**：从 Core `Workflow.outputs[].value` 解析最终公开输出，并校验本次动态值符合输出 DataType。
End.config 不参与最终结果。

```ts
import type { JsonValue } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { matchesDataType } from '../utils/matches-data-type'
import { resolveVariableValue, type VariableResolutionContext } from './resolve-variable-value'

export function resolveWorkflowOutputs(
  context: VariableResolutionContext,
): Record<string, JsonValue> {
  const outputs: Record<string, JsonValue> = {}

  for (const output of context.workflow.outputs) {
    const value = resolveVariableValue(output.value, context)
    if (!matchesDataType(value, output.dataType)) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.VALUE_TYPE_MISMATCH,
        `工作流输出 ${output.key} 与声明类型不匹配`,
        { key: output.key, expectedDataType: output.dataType },
      )
    }

    outputs[output.key] = value
  }

  return outputs
}
```

### 5.18 `packages/workflow-runtime/src/runtime/runtime-state-operations.ts`

**作用**：集中执行 RuntimeState 的可控写操作：创建初始状态、创建 execution、完成控制节点、跳过
节点和失败收口。调度器不自行拼 executionKey 或反向解析它。

```ts
import type { JsonValue, SystemVariableKey, Workflow, WorkflowNode } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError, type RuntimeErrorData } from './runtime-error'
import {
  RUNTIME_EDGE_STATUSES,
  RUNTIME_EXECUTION_STATUSES,
  RUNTIME_NODE_STATUSES,
  RUNTIME_RUN_STATUSES,
  RUNTIME_STATE_SCHEMA_VERSION,
  type RuntimeExecution,
  type RuntimeState,
} from './runtime-state-schema'

export interface BeginNodeExecutionResult {
  execution: RuntimeExecution
}

function getWaitingNodeState(state: RuntimeState, nodeId: string) {
  const nodeState = state.nodeStates[nodeId]
  if (!nodeState || nodeState.status !== RUNTIME_NODE_STATUSES.WAITING) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `节点 ${nodeId} 不处于 WAITING 状态`,
      { nodeId, actualStatus: nodeState?.status ?? null },
    )
  }

  return nodeState
}

function createExecutionKey(state: RuntimeState): string {
  // executionKey 对外不透明；Runtime 和 Server 都禁止通过拆字符串恢复 nodeId/Scope。
  return `${state.runId}:${state.nextExecutionSequence}`
}

function createExecution(
  state: RuntimeState,
  node: WorkflowNode,
  status: RuntimeExecution['status'],
  inputs: Record<string, JsonValue>,
  config: Record<string, JsonValue>,
  outputs?: Record<string, JsonValue>,
): RuntimeExecution {
  const nodeState = getWaitingNodeState(state, node.id)
  const executionKey = createExecutionKey(state)
  const execution: RuntimeExecution = {
    executionKey,
    nodeId: node.id,
    scopeKey: 'root',
    sequence: state.nextExecutionSequence,
    attempt: 1,
    status,
    inputs,
    config,
    ...(outputs ? { outputs } : {}),
  }

  state.nextExecutionSequence += 1
  state.executions[executionKey] = execution
  nodeState.latestExecutionKey = executionKey
  nodeState.status =
    status === RUNTIME_EXECUTION_STATUSES.RUNNING
      ? RUNTIME_NODE_STATUSES.RUNNING
      : RUNTIME_NODE_STATUSES.SUCCEEDED

  return execution
}

export function createInitialRuntimeState(
  workflow: Workflow,
  identity: { runId: string; workflowVersionId: string },
  startInput: Record<string, JsonValue>,
  systemVariables: Record<SystemVariableKey, JsonValue>,
): RuntimeState {
  return {
    schemaVersion: RUNTIME_STATE_SCHEMA_VERSION,
    revision: 0,
    runId: identity.runId,
    workflowId: workflow.id,
    workflowVersionId: identity.workflowVersionId,
    status: RUNTIME_RUN_STATUSES.RUNNING,
    startInput,
    systemVariables,
    nodeStates: Object.fromEntries(
      workflow.nodes.map((node) => [node.id, { status: RUNTIME_NODE_STATUSES.WAITING }]),
    ),
    edgeStates: Object.fromEntries(
      workflow.edges.map((edge) => [edge.id, RUNTIME_EDGE_STATUSES.WAITING]),
    ),
    executions: {},
    nextExecutionSequence: 0,
  }
}

export function beginNodeExecution(
  state: RuntimeState,
  node: WorkflowNode,
  inputs: Record<string, JsonValue>,
  config: Record<string, JsonValue>,
): BeginNodeExecutionResult {
  return {
    execution: createExecution(state, node, RUNTIME_EXECUTION_STATUSES.RUNNING, inputs, config),
  }
}

export function recordControlNodeSuccess(
  state: RuntimeState,
  node: WorkflowNode,
  outputs: Record<string, JsonValue>,
): RuntimeExecution {
  return createExecution(state, node, RUNTIME_EXECUTION_STATUSES.SUCCEEDED, {}, {}, outputs)
}

export function recordBusinessNodeSuccess(
  state: RuntimeState,
  executionKey: string,
  outputs: Record<string, JsonValue>,
): void {
  const execution = state.executions[executionKey]
  if (!execution || execution.status !== RUNTIME_EXECUTION_STATUSES.RUNNING) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `Execution ${executionKey} 不处于 RUNNING 状态`,
      { executionKey },
    )
  }

  const nodeState = state.nodeStates[execution.nodeId]
  if (
    !nodeState ||
    nodeState.status !== RUNTIME_NODE_STATUSES.RUNNING ||
    nodeState.latestExecutionKey !== executionKey
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `Execution ${executionKey} 与节点状态不一致`,
      { executionKey, nodeId: execution.nodeId },
    )
  }

  execution.status = RUNTIME_EXECUTION_STATUSES.SUCCEEDED
  execution.outputs = outputs
  nodeState.status = RUNTIME_NODE_STATUSES.SUCCEEDED
}

export function recordBusinessNodeFailure(
  state: RuntimeState,
  executionKey: string,
  error: RuntimeErrorData,
): void {
  const execution = state.executions[executionKey]
  if (!execution || execution.status !== RUNTIME_EXECUTION_STATUSES.RUNNING) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `Execution ${executionKey} 不处于 RUNNING 状态`,
      { executionKey },
    )
  }

  const nodeState = state.nodeStates[execution.nodeId]
  if (
    !nodeState ||
    nodeState.status !== RUNTIME_NODE_STATUSES.RUNNING ||
    nodeState.latestExecutionKey !== executionKey
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      `Execution ${executionKey} 与节点状态不一致`,
      { executionKey, nodeId: execution.nodeId },
    )
  }

  execution.status = RUNTIME_EXECUTION_STATUSES.FAILED
  execution.error = error
  nodeState.status = RUNTIME_NODE_STATUSES.FAILED
}

export function markNodeSkipped(state: RuntimeState, nodeId: string): void {
  const nodeState = getWaitingNodeState(state, nodeId)
  nodeState.status = RUNTIME_NODE_STATUSES.SKIPPED
}

export function failRuntimeState(state: RuntimeState, error: RuntimeErrorData): void {
  state.status = RUNTIME_RUN_STATUSES.FAILED

  for (const execution of Object.values(state.executions)) {
    if (execution.status === RUNTIME_EXECUTION_STATUSES.RUNNING) {
      execution.status = RUNTIME_EXECUTION_STATUSES.FAILED
      execution.error = error
    }
  }

  for (const nodeState of Object.values(state.nodeStates)) {
    if (nodeState.status === RUNTIME_NODE_STATUSES.RUNNING) {
      nodeState.status = RUNTIME_NODE_STATUSES.FAILED
    }
  }
}
```

### 5.19 `packages/workflow-runtime/src/runtime/restore-runtime-state.ts`

**作用**：数据库恢复时先解析 State Schema，再校验 Run、WorkflowVersion 和系统变量身份。返回值是
Zod 重新构造的可修改副本，原始入参不会被状态机原地修改。

```ts
import { SYSTEM_VARIABLE_KEYS, type Workflow } from '@ai-workflow/core'

import { RUNTIME_ERROR_CODES, RuntimeError } from './runtime-error'
import { runtimeStateSchema, type RuntimeState } from './runtime-state-schema'
import { parseSystemVariables } from '../system/parse-system-variables'

export interface ExpectedRuntimeIdentity {
  runId: string
  workflowId: string
  workflowVersionId: string
}

export function restoreRuntimeState(
  rawState: unknown,
  expected: ExpectedRuntimeIdentity,
  workflow: Workflow,
): RuntimeState {
  const parsed = runtimeStateSchema.safeParse(rawState)
  if (!parsed.success) {
    throw new RuntimeError(RUNTIME_ERROR_CODES.INVALID_RUNTIME_STATE, 'RuntimeState 结构不合法', {
      issues: parsed.error.issues.map((issue) => issue.message),
    })
  }

  const state = parsed.data
  if (
    state.runId !== expected.runId ||
    state.workflowId !== expected.workflowId ||
    state.workflowVersionId !== expected.workflowVersionId
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH,
      'RuntimeState 与当前 Run 或 WorkflowVersion 不一致',
      {
        expectedRunId: expected.runId,
        actualRunId: state.runId,
        expectedWorkflowId: expected.workflowId,
        actualWorkflowId: state.workflowId,
        expectedWorkflowVersionId: expected.workflowVersionId,
        actualWorkflowVersionId: state.workflowVersionId,
      },
    )
  }

  if (
    state.systemVariables[SYSTEM_VARIABLE_KEYS.WORKFLOW_ID] !== state.workflowId ||
    state.systemVariables[SYSTEM_VARIABLE_KEYS.WORKFLOW_RUN_ID] !== state.runId
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH,
      'RuntimeState 中的系统变量身份不一致',
    )
  }

  const expectedNodeIds = new Set(workflow.nodes.map((node) => node.id))
  const actualNodeIds = Object.keys(state.nodeStates)
  const expectedEdgeIds = new Set(workflow.edges.map((edge) => edge.id))
  const actualEdgeIds = Object.keys(state.edgeStates)
  const missingNodeIds = [...expectedNodeIds].filter((nodeId) => !(nodeId in state.nodeStates))
  const unknownNodeIds = actualNodeIds.filter((nodeId) => !expectedNodeIds.has(nodeId))
  const missingEdgeIds = [...expectedEdgeIds].filter((edgeId) => !(edgeId in state.edgeStates))
  const unknownEdgeIds = actualEdgeIds.filter((edgeId) => !expectedEdgeIds.has(edgeId))

  if (
    missingNodeIds.length > 0 ||
    unknownNodeIds.length > 0 ||
    missingEdgeIds.length > 0 ||
    unknownEdgeIds.length > 0
  ) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      'RuntimeState 的 Node/Edge 索引与 WorkflowVersion 不一致',
      { missingNodeIds, unknownNodeIds, missingEdgeIds, unknownEdgeIds },
    )
  }

  state.systemVariables = parseSystemVariables(state.systemVariables, {
    runId: state.runId,
    workflowId: state.workflowId,
  })

  for (const [executionKey, execution] of Object.entries(state.executions)) {
    if (execution.executionKey !== executionKey) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        'Execution 索引键与记录身份不一致',
        { executionKey, recordExecutionKey: execution.executionKey },
      )
    }

    const nodeState = state.nodeStates[execution.nodeId]
    if (!nodeState) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        'Execution 引用了不存在的节点状态',
        { executionKey, nodeId: execution.nodeId },
      )
    }
  }

  for (const [nodeId, nodeState] of Object.entries(state.nodeStates)) {
    if (!nodeState.latestExecutionKey) {
      if (
        nodeState.status === 'RUNNING' ||
        nodeState.status === 'SUCCEEDED' ||
        nodeState.status === 'FAILED'
      ) {
        throw new RuntimeError(
          RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
          '终态或运行中节点缺少 latestExecutionKey',
          { nodeId, nodeStatus: nodeState.status },
        )
      }
      continue
    }

    const execution = state.executions[nodeState.latestExecutionKey]
    if (!execution || execution.nodeId !== nodeId) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        'latestExecutionKey 没有指向当前节点的 Execution',
        { nodeId, executionKey: nodeState.latestExecutionKey },
      )
    }

    const matchingStatus =
      (nodeState.status === 'RUNNING' && execution.status === 'RUNNING') ||
      (nodeState.status === 'SUCCEEDED' && execution.status === 'SUCCEEDED') ||
      (nodeState.status === 'FAILED' && execution.status === 'FAILED')

    if (!matchingStatus) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        '节点状态与 latest Execution 状态不一致',
        {
          nodeId,
          nodeStatus: nodeState.status,
          executionKey: execution.executionKey,
          executionStatus: execution.status,
        },
      )
    }
  }

  const sequences = Object.values(state.executions).map((execution) => execution.sequence)
  if (new Set(sequences).size !== sequences.length) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      'Execution sequence 不能重复',
    )
  }

  const minimumNextSequence = sequences.length === 0 ? 0 : Math.max(...sequences) + 1
  if (state.nextExecutionSequence < minimumNextSequence) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      'nextExecutionSequence 小于已有 Execution sequence',
      { nextExecutionSequence: state.nextExecutionSequence, minimumNextSequence },
    )
  }

  return state
}
```

State 恢复校验属于 Runtime 动态状态一致性，不是对 Workflow 节点、Edge 或 DAG 的第二套静态校验。

### 5.20 `packages/workflow-runtime/src/scheduler/settle-outgoing-edges.ts`

**作用**：根据节点结果的 `activatedHandles` 一次性把所有出边从 WAITING 收敛为 ACTIVE/INACTIVE。
Runtime 不重新计算 Condition 表达式。

```ts
import type { ExecutionPlan } from '../compiler/execution-plan'
import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import { RUNTIME_EDGE_STATUSES, type RuntimeState } from '../runtime/runtime-state-schema'

export function settleOutgoingEdges(
  plan: ExecutionPlan,
  state: RuntimeState,
  nodeId: string,
  activatedHandles: ReadonlySet<string>,
): void {
  for (const edge of plan.outgoingEdges.get(nodeId) ?? []) {
    const currentStatus = state.edgeStates[edge.id]
    if (currentStatus !== RUNTIME_EDGE_STATUSES.WAITING) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        `Edge ${edge.id} 已经离开 WAITING 状态`,
        { edgeId: edge.id, actualStatus: currentStatus ?? null },
      )
    }

    state.edgeStates[edge.id] = activatedHandles.has(edge.sourceHandle)
      ? RUNTIME_EDGE_STATUSES.ACTIVE
      : RUNTIME_EDGE_STATUSES.INACTIVE
  }
}
```

Protocol 已保证 `activatedHandles` 不重复。Runtime 只关心与当前图中出边匹配的 Handle；未连接的合法
输出 Handle 不需要在 ExecutionPlan 中出现。

### 5.21 `packages/workflow-runtime/src/scheduler/drain-root-scope.ts`

**作用**：把根 DAG 推进到稳定点：传播 Skip、本地完成 End、派发所有 Ready 业务节点，或在全部节点
终态后产生 `COMPLETE_RUN`。该方法只解释当前动态 Edge 状态，不做静态 DAG 校验。

```ts
import { BuiltinNodeType, type WorkflowNode } from '@ai-workflow/core'

import type { ExecutionPlan } from '../compiler/execution-plan'
import type { RuntimeNodeConfigResolver } from '../config/runtime-node-config-resolver'
import { RUNTIME_ERROR_CODES, RuntimeError } from '../runtime/runtime-error'
import {
  beginNodeExecution,
  markNodeSkipped,
  recordControlNodeSuccess,
} from '../runtime/runtime-state-operations'
import {
  RUNTIME_EDGE_STATUSES,
  RUNTIME_NODE_STATUSES,
  RUNTIME_RUN_STATUSES,
  type RuntimeState,
} from '../runtime/runtime-state-schema'
import type { DispatchNodeEffect, RuntimeEffect } from '../runtime/runtime-types'
import { resolveNodeInputs } from '../variable/resolve-node-inputs'
import {
  resolveVariableValue,
  type VariableResolutionContext,
} from '../variable/resolve-variable-value'
import { resolveWorkflowOutputs } from '../variable/resolve-workflow-outputs'
import { settleOutgoingEdges } from './settle-outgoing-edges'

function createVariableContext(
  plan: ExecutionPlan,
  state: RuntimeState,
): VariableResolutionContext {
  return {
    workflow: plan.workflow,
    state,
    scopeKey: 'root',
  }
}

function dispatchBusinessNode(
  plan: ExecutionPlan,
  state: RuntimeState,
  node: WorkflowNode,
  configResolver: RuntimeNodeConfigResolver,
): DispatchNodeEffect {
  const variableContext = createVariableContext(plan, state)
  const inputs = resolveNodeInputs(node, variableContext)
  const config = configResolver.resolve(node, (value) =>
    resolveVariableValue(value, variableContext),
  )
  const { execution } = beginNodeExecution(state, node, inputs, config)

  return {
    type: 'DISPATCH_NODE',
    runId: state.runId,
    nodeId: node.id,
    nodeType: node.type,
    executionKey: execution.executionKey,
    attempt: execution.attempt,
    inputs,
    config,
  }
}

function areAllIncomingEdgesSettled(
  plan: ExecutionPlan,
  state: RuntimeState,
  nodeId: string,
): boolean {
  const incomingEdges = plan.incomingEdges.get(nodeId) ?? []
  return (
    incomingEdges.length > 0 &&
    incomingEdges.every((edge) => state.edgeStates[edge.id] !== RUNTIME_EDGE_STATUSES.WAITING)
  )
}

function hasActiveIncomingEdge(plan: ExecutionPlan, state: RuntimeState, nodeId: string): boolean {
  return (plan.incomingEdges.get(nodeId) ?? []).some(
    (edge) => state.edgeStates[edge.id] === RUNTIME_EDGE_STATUSES.ACTIVE,
  )
}

function hasRunningNode(state: RuntimeState): boolean {
  return Object.values(state.nodeStates).some(
    (nodeState) => nodeState.status === RUNTIME_NODE_STATUSES.RUNNING,
  )
}

function hasWaitingNode(state: RuntimeState): boolean {
  return Object.values(state.nodeStates).some(
    (nodeState) => nodeState.status === RUNTIME_NODE_STATUSES.WAITING,
  )
}

export function drainRootScope(
  plan: ExecutionPlan,
  state: RuntimeState,
  configResolver: RuntimeNodeConfigResolver,
): RuntimeEffect[] {
  const effects: RuntimeEffect[] = []
  const rootNodeIds = plan.childrenByScope.get('root') ?? []
  let progressed: boolean

  do {
    progressed = false

    for (const nodeId of rootNodeIds) {
      const node = plan.nodeById.get(nodeId)!
      const nodeState = state.nodeStates[nodeId]!
      if (nodeState.status !== RUNTIME_NODE_STATUSES.WAITING) {
        continue
      }

      if (!areAllIncomingEdgesSettled(plan, state, nodeId)) {
        continue
      }

      if (!hasActiveIncomingEdge(plan, state, nodeId)) {
        markNodeSkipped(state, nodeId)
        settleOutgoingEdges(plan, state, nodeId, new Set())
        progressed = true
        continue
      }

      if (node.type === BuiltinNodeType.END) {
        recordControlNodeSuccess(state, node, {})
        settleOutgoingEdges(plan, state, nodeId, new Set())
        progressed = true
        continue
      }

      effects.push(dispatchBusinessNode(plan, state, node, configResolver))
      progressed = true
    }
  } while (progressed)

  if (hasRunningNode(state)) {
    return effects
  }

  if (hasWaitingNode(state)) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUN_STALLED,
      '根 DAG 没有可推进节点且仍存在 WAITING 节点',
      {
        waitingNodeIds: Object.entries(state.nodeStates)
          .filter(([, nodeState]) => nodeState.status === RUNTIME_NODE_STATUSES.WAITING)
          .map(([nodeId]) => nodeId),
      },
    )
  }

  const outputs = resolveWorkflowOutputs(createVariableContext(plan, state))
  state.status = RUNTIME_RUN_STATUSES.SUCCEEDED
  effects.push({
    type: 'COMPLETE_RUN',
    runId: state.runId,
    outputs,
  })

  return effects
}
```

`RUN_STALLED` 是对运行状态无法继续推进的安全失败，不是 Compiler 对 Workflow 再做一遍环、可达性或
Start 数量校验。正常情况下，Core 前置规则应保证它不会因为静态图错误触发。

### 5.22 `packages/workflow-runtime/src/runtime/workflow-runtime.ts`

**作用**：定义 Runtime 的最小公共行为。Protocol Result 必须先由 Protocol parser 校验，再传入
`applyNodeResult()`。

```ts
import type { ExecuteNodeResult } from '@ai-workflow/protocol'

import type { RuntimeState } from './runtime-state-schema'
import type { RuntimeTransition, StartRuntimeInput } from './runtime-types'

export interface WorkflowRuntime {
  start(input: StartRuntimeInput): RuntimeTransition
  applyNodeResult(state: RuntimeState, result: ExecuteNodeResult): RuntimeTransition
}
```

### 5.23 `packages/workflow-runtime/src/runtime/create-workflow-runtime.ts`

**作用**：组合 ExecutionPlan、Start 本地推进、状态恢复、Node Result 应用、DAG 继续调度和失败收口。
这是 Runtime 的主要实现入口。

```ts
import { BuiltinNodeType, type Workflow, type WorkflowNode } from '@ai-workflow/core'
import type { ExecuteNodeResult } from '@ai-workflow/protocol'

import { buildExecutionPlan } from '../compiler/build-execution-plan'
import type { ExecutionPlan } from '../compiler/execution-plan'
import type { RuntimeNodeConfigResolver } from '../config/runtime-node-config-resolver'
import { normalizeDeclaredValues } from '../input/normalize-declared-values'
import { drainRootScope } from '../scheduler/drain-root-scope'
import { settleOutgoingEdges } from '../scheduler/settle-outgoing-edges'
import { parseSystemVariables } from '../system/parse-system-variables'
import { parseJsonObject } from '../utils/json-value'
import { RUNTIME_ERROR_CODES, RuntimeError, toRuntimeError } from './runtime-error'
import {
  createInitialRuntimeState,
  failRuntimeState,
  recordBusinessNodeFailure,
  recordBusinessNodeSuccess,
  recordControlNodeSuccess,
} from './runtime-state-operations'
import {
  RUNTIME_EXECUTION_STATUSES,
  RUNTIME_RUN_STATUSES,
  type RuntimeExecution,
  type RuntimeState,
} from './runtime-state-schema'
import type { RuntimeTransition, StartRuntimeInput } from './runtime-types'
import { restoreRuntimeState } from './restore-runtime-state'
import type { WorkflowRuntime } from './workflow-runtime'

export interface CreateWorkflowRuntimeOptions {
  workflowVersionId: string
  configResolver: RuntimeNodeConfigResolver
}

function getRootStartNode(plan: ExecutionPlan): WorkflowNode {
  const startNodes = (plan.childrenByScope.get('root') ?? [])
    .map((nodeId) => plan.nodeById.get(nodeId)!)
    .filter((node) => node.type === BuiltinNodeType.START)

  if (startNodes.length !== 1) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      'Runtime 前置条件要求根作用域恰好存在一个 Start 节点',
      { actualStartCount: startNodes.length },
    )
  }

  return startNodes[0]!
}

function getRunningExecution(state: RuntimeState, executionKey: string): RuntimeExecution {
  const execution = state.executions[executionKey]
  if (!execution || execution.status !== RUNTIME_EXECUTION_STATUSES.RUNNING) {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      '节点结果没有对应的 RUNNING Execution',
      { executionKey },
    )
  }

  const nodeState = state.nodeStates[execution.nodeId]
  if (nodeState?.latestExecutionKey !== executionKey || nodeState.status !== 'RUNNING') {
    throw new RuntimeError(
      RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
      '节点结果与当前节点执行位置不一致',
      { executionKey, nodeId: execution.nodeId },
    )
  }

  return execution
}

function createFailureTransition(
  state: RuntimeState,
  error: RuntimeError,
  nextRevision: number,
): RuntimeTransition {
  const errorData = error.toData()
  failRuntimeState(state, errorData)
  state.revision = nextRevision

  return {
    state,
    effects: [
      {
        type: 'FAIL_RUN',
        runId: state.runId,
        error: errorData,
      },
    ],
  }
}

function activateAllStartHandles(plan: ExecutionPlan, startNodeId: string): Set<string> {
  return new Set((plan.outgoingEdges.get(startNodeId) ?? []).map((edge) => edge.sourceHandle))
}

function createExecutorFailure(result: Extract<ExecuteNodeResult, { status: 'FAILED' }>) {
  const executorDetails = result.error.details
    ? parseJsonObject(result.error.details, 'nodeResult.error.details')
    : undefined

  return new RuntimeError(RUNTIME_ERROR_CODES.NODE_EXECUTION_FAILED, result.error.message, {
    executorCode: result.error.code,
    retryable: result.error.retryable,
    ...(executorDetails ? { executorDetails } : {}),
  })
}

class DefaultWorkflowRuntime implements WorkflowRuntime {
  private readonly plan: ExecutionPlan
  private readonly workflowVersionId: string
  private readonly configResolver: RuntimeNodeConfigResolver

  constructor(workflow: Workflow, options: CreateWorkflowRuntimeOptions) {
    if (!options.workflowVersionId) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH,
        'workflowVersionId 不能为空',
      )
    }

    this.plan = buildExecutionPlan(workflow)
    this.workflowVersionId = options.workflowVersionId
    this.configResolver = options.configResolver
  }

  start(input: StartRuntimeInput): RuntimeTransition {
    if (!input.runId) {
      throw new RuntimeError(RUNTIME_ERROR_CODES.RUNTIME_IDENTITY_MISMATCH, 'runId 不能为空')
    }

    const startNode = getRootStartNode(this.plan)
    const systemVariables = parseSystemVariables(input.systemVariables, {
      runId: input.runId,
      workflowId: this.plan.workflow.id,
    })
    const startInput = normalizeDeclaredValues(input.input, startNode.outputs, {
      boundary: 'startInput',
      ownerId: startNode.id,
    })
    const state = createInitialRuntimeState(
      this.plan.workflow,
      { runId: input.runId, workflowVersionId: this.workflowVersionId },
      startInput,
      systemVariables,
    )

    recordControlNodeSuccess(state, startNode, startInput)
    settleOutgoingEdges(
      this.plan,
      state,
      startNode.id,
      activateAllStartHandles(this.plan, startNode.id),
    )

    try {
      const effects = drainRootScope(this.plan, state, this.configResolver)
      state.revision = 1
      return { state, effects }
    } catch (error) {
      return createFailureTransition(state, toRuntimeError(error), 1)
    }
  }

  applyNodeResult(state: RuntimeState, result: ExecuteNodeResult): RuntimeTransition {
    const restoredState = restoreRuntimeState(
      state,
      {
        runId: state.runId,
        workflowId: this.plan.workflow.id,
        workflowVersionId: this.workflowVersionId,
      },
      this.plan.workflow,
    )

    if (restoredState.status !== RUNTIME_RUN_STATUSES.RUNNING) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUN_ALREADY_TERMINAL,
        '终态 Run 不能继续应用节点结果',
        { runId: restoredState.runId, status: restoredState.status },
      )
    }

    // 迟到、重复或错误 executionKey 是消息关联错误，应由 Server 拒绝，不能把有效 Run 改成失败。
    const execution = getRunningExecution(restoredState, result.executionKey)
    const node = this.plan.nodeById.get(execution.nodeId)
    if (!node) {
      throw new RuntimeError(
        RUNTIME_ERROR_CODES.RUNTIME_STATE_MISMATCH,
        'Execution 对应节点不在当前 WorkflowVersion 中',
        { executionKey: execution.executionKey, nodeId: execution.nodeId },
      )
    }

    const nextRevision = restoredState.revision + 1

    if (result.status === 'FAILED') {
      const failure = createExecutorFailure(result)
      recordBusinessNodeFailure(restoredState, execution.executionKey, failure.toData())
      return createFailureTransition(restoredState, failure, nextRevision)
    }

    try {
      const outputs = normalizeDeclaredValues(result.outputs, node.outputs, {
        boundary: 'nodeOutput',
        ownerId: node.id,
      })
      recordBusinessNodeSuccess(restoredState, execution.executionKey, outputs)
      settleOutgoingEdges(this.plan, restoredState, node.id, new Set(result.activatedHandles))

      const effects = drainRootScope(this.plan, restoredState, this.configResolver)
      restoredState.revision = nextRevision
      return { state: restoredState, effects }
    } catch (error) {
      return createFailureTransition(restoredState, toRuntimeError(error), nextRevision)
    }
  }
}

export function createWorkflowRuntime(
  workflow: Workflow,
  options: CreateWorkflowRuntimeOptions,
): WorkflowRuntime {
  return new DefaultWorkflowRuntime(workflow, options)
}
```

`createWorkflowRuntime()` 不调用 Core validator，也不接收 NodeRegistry。它的输入前置条件是同一份
Workflow 已经通过 Core 执行前校验并绑定不可变 Version。

### 5.24 `packages/workflow-runtime/src/index.ts`

**作用**：Runtime 唯一公共入口。只导出调用方需要的契约、Schema、错误和组装函数。

```ts
export { buildExecutionPlan } from './compiler/build-execution-plan'
export type { ExecutionPlan, StaticScopeKey } from './compiler/execution-plan'

export {
  createRuntimeNodeConfigResolver,
  projectStaticJsonNodeConfig,
  type RuntimeNodeConfigProjector,
  type RuntimeNodeConfigResolver,
} from './config/runtime-node-config-resolver'

export {
  RUNTIME_ERROR_CODES,
  RuntimeError,
  runtimeErrorDataSchema,
  toRuntimeError,
  type RuntimeErrorCode,
  type RuntimeErrorData,
} from './runtime/runtime-error'
export {
  RUNTIME_EDGE_STATUSES,
  RUNTIME_EXECUTION_STATUSES,
  RUNTIME_NODE_STATUSES,
  RUNTIME_RUN_STATUSES,
  RUNTIME_STATE_SCHEMA_VERSION,
  runtimeStateSchema,
  type RuntimeEdgeStatus,
  type RuntimeExecution,
  type RuntimeNodeState,
  type RuntimeNodeStatus,
  type RuntimeRunStatus,
  type RuntimeState,
} from './runtime/runtime-state-schema'
export type {
  CompleteRunEffect,
  DispatchNodeEffect,
  FailRunEffect,
  RuntimeEffect,
  RuntimeTransition,
  StartRuntimeInput,
} from './runtime/runtime-types'
export type { WorkflowRuntime } from './runtime/workflow-runtime'
export {
  createWorkflowRuntime,
  type CreateWorkflowRuntimeOptions,
} from './runtime/create-workflow-runtime'
export { restoreRuntimeState, type ExpectedRuntimeIdentity } from './runtime/restore-runtime-state'
```

`resolveVariableValue`、Scheduler 和 State 写操作保持包内实现细节，不从根入口暴露，避免宿主绕过
状态机直接修改状态。

---

## 6. 完整调用上下文

下面只展示 Runtime 与 Protocol 已覆盖的调用。Core 校验依旧是前置步骤，Server 的事务、租约与
Outbox 组装不在本文假装实现。

```ts
import {
  BuiltinNodeType,
  nodeRegistry,
  validateExecutorWorkflow,
  workflowSchema,
} from '@ai-workflow/core'
import { parseExecuteNodeResult } from '@ai-workflow/protocol'
import {
  createRuntimeNodeConfigResolver,
  createWorkflowRuntime,
  projectStaticJsonNodeConfig,
} from '@ai-workflow/runtime'

export function startValidatedWorkflow(rawWorkflow: unknown) {
  const parsed = workflowSchema.safeParse(rawWorkflow)
  if (!parsed.success) {
    return { ok: false as const, issues: parsed.error.issues }
  }

  const issues = validateExecutorWorkflow(parsed.data, nodeRegistry)
  if (issues.length > 0) {
    return { ok: false as const, issues }
  }

  // 示例支持列表只包含确认 Config 无嵌套 VariableValue 的业务节点。
  const configResolver = createRuntimeNodeConfigResolver({
    [BuiltinNodeType.CODE]: projectStaticJsonNodeConfig,
    [BuiltinNodeType.LLM]: projectStaticJsonNodeConfig,
    [BuiltinNodeType.RAG]: projectStaticJsonNodeConfig,
  })

  const runtime = createWorkflowRuntime(parsed.data, {
    workflowVersionId: 'workflow-version-1',
    configResolver,
  })
  const transition = runtime.start({
    runId: 'run-1',
    input: {
      question: '你好',
    },
    systemVariables: {
      user_id: 'user-1',
      app_id: 'app-1',
      workflow_id: parsed.data.id,
      workflow_run_id: 'run-1',
      timestamp: Date.now(),
    },
  })

  return { ok: true as const, runtime, transition }
}

export function applyValidatedNodeResult(
  runtime: import('@ai-workflow/runtime').WorkflowRuntime,
  state: import('@ai-workflow/runtime').RuntimeState,
  rawResult: unknown,
) {
  const result = parseExecuteNodeResult(rawResult)
  return runtime.applyNodeResult(state, result)
}
```

实际 Server 还必须在调用 `applyValidatedNodeResult()` 前完成 Inbox 幂等、Run 串行锁或 revision CAS、
NodeRun attempt 和 leaseToken 校验。Runtime 故意不访问这些持久化信息。

## 7. `DISPATCH_NODE` 到 Protocol Command 的字段映射

Server 后续实现时按下面关系组装，不需要 Runtime 预先知道数据库与租约字段：

| Protocol Command 字段      | 来源                                         |
| -------------------------- | -------------------------------------------- |
| `protocolVersion`          | Server 使用当前支持版本 `'1'`                |
| `commandId`                | Server 每次 Outbox 消息生成                  |
| `idempotencyKey`           | Server 按 NodeRun/attempt 的业务幂等策略生成 |
| `runId`                    | `DispatchNodeEffect.runId`                   |
| `nodeRunId`                | Server 创建 `WorkflowNodeRun` 后取得         |
| `nodeId`、`nodeType`       | `DispatchNodeEffect`                         |
| `executionKey`、`attempt`  | `DispatchNodeEffect`                         |
| `leaseToken`、`deadlineAt` | Server 当前租约和超时策略                    |
| `inputs`、`config`         | `DispatchNodeEffect` 中已解析 JSON 对象      |

Result 回来时，Server 先用 Protocol parser 校验消息，再校验 `commandId`、`nodeRunId`、`attempt` 与
`leaseToken`，最后只把通过关联检查的 Result 交给 Runtime。

## 8. 第一阶段明确不包含的内容

- Loop Scope、嵌套 Scope 和迭代 execution location；
- Sub Workflow 的宿主 Effect；
- Secret Gateway 或短期凭证 Pointer；
- 节点业务自动重试、取消、Heartbeat、Delta 和流式输出；
- Server 持久化、Outbox/Inbox、RabbitMQ Publisher/Consumer 和租约恢复；
- Go Worker、Registry、业务 Executor；
- HTTP/Condition/Loop Config 的显式 projector 示例；
- Core 的 Start/End、可达性、Workflow outputs 和 Config 引用静态规则补丁。

这些能力没有用空字段预埋进第一阶段 State 或 Protocol。新增能力时应扩展对应判别联合、State
Schema 版本和恢复迁移，而不是修改已持久化的 v1 含义。

## 9. 落地顺序

1. 先补 Protocol 三份 JSON Schema、TS parser 和 Go codec；生成文件由 Schema 产出并提交。
2. 删除或替换当前 Runtime 草稿，不从草稿继续推导公共类型。
3. 落地 Runtime Error、State Schema、ExecutionPlan 和动态输入校验。
4. 落地变量解析、显式 Config resolver 和根 DAG Scheduler。
5. 落地 `createWorkflowRuntime()` 与根入口导出。
6. Server 先只开放 Config 能安全投影、Go Registry 也已支持的节点集合。
7. 完成 Server 的 State revision、Outbox、Inbox 和 lease 后，再接 Go Worker。
8. 根 DAG 的乱序、重复消息和恢复语义稳定后，再设计 State Schema v2 的 Loop Scope。

## 10. 代码审查检查表

- Runtime 是否只从 `@ai-workflow/core` 根入口导入领域类型；
- 是否出现了新的 `RuntimeValue`、`RuntimeObject`、系统变量 Key 表或节点输出定义副本；
- Protocol 是否完全不依赖 Core；
- 所有 MQ 入站消息是否先通过 Schema parser；
- `buildExecutionPlan()` 是否只建索引，没有第二套 Validator；
- 是否对任意 Config 做了递归变量猜测；
- Start/End 是否仍在 Runtime 本地推进；
- 是否通过显式 execution 记录查 nodeId/scopeKey，而不是拆 executionKey；
- RuntimeState 恢复是否同时检查 Schema 和身份；
- Runtime Error 是否在持久化前转成纯 JSON `RuntimeErrorData`；
- Runtime Effect 是否不含 Prisma、RabbitMQ 或 HTTP DTO；
- 是否把未支持的 Loop、Sub Workflow、Secret 和节点类型在创建 Run 前拒绝。
