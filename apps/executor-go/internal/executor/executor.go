package executor

import (
	"context"

	protocol "workflow-protocol"
)

// NodeExecutor is the stable boundary between the transport and business node implementations.
type NodeExecutor interface {
	Execute(context.Context, protocol.ExecuteNodeCommand) (protocol.ExecuteNodeResult, error)
}

func ResultIdentity(command protocol.ExecuteNodeCommand) protocol.ResultIdentity {
	return protocol.ResultIdentity{
		ProtocolVersion: command.ProtocolVersion,
		CommandID:       command.CommandID,
		NodeRunID:       command.NodeRunID,
		ExecutionKey:    command.ExecutionKey,
		LeaseToken:      command.LeaseToken,
	}
}
