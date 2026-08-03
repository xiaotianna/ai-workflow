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
