package executor

import (
	"context"

	protocol "workflow-protocol"
)

// 节点执行器统一调用接口（相当于类必须实现某一方法，具体使用在具体某一节点的executor.go中）
type NodeExecutor interface {
	Execute(context.Context, protocol.ExecuteNodeCommand) (protocol.ExecuteNodeResult, error)
}

// 将nestjs需要的数据，按照规定格式返回
func ResultIdentity(command protocol.ExecuteNodeCommand) protocol.ResultIdentity {
	return protocol.ResultIdentity{
		ProtocolVersion: command.ProtocolVersion,
		CommandID:       command.CommandID,
		NodeRunID:       command.NodeRunID,
		ExecutionKey:    command.ExecutionKey,
		LeaseToken:      command.LeaseToken,
	}
}
