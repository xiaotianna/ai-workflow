// Code generated from schemas/execute-node-command.schema.json. DO NOT EDIT.

import type { ProtocolJsonValue } from "./json-value.generated";

export interface ExecuteNodeCommand {
  protocolVersion: "1" | "2";
  commandId: string;
  idempotencyKey: string;
  runId: string;
  nodeRunId: string;
  nodeId: string;
  nodeType: string;
  /** v2 使用的稳定执行适配器类型；v1 继续使用 nodeType 选择执行器。 */
  executorType?: string;
  /** 只有第三方 sandbox-js 执行命令携带的不可变制品引用。 */
  sandboxArtifact?: {
    pluginVersionId: string;
    artifactDigest: string;
    artifactPath: string;
    networkPolicy: "none" | "public";
    errorHandlingField?: string;
  };
  executionKey: string;
  attempt: number;
  leaseToken: string;
  deadlineAt: string;
  inputs: Record<string, ProtocolJsonValue>;
  config: Record<string, ProtocolJsonValue>;
}
