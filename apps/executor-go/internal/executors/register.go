package executors

import (
	"log"

	"node-executor-go/internal/executor"
	"node-executor-go/internal/executorprofile"
	codeexecutor "node-executor-go/internal/executors/code"
	conditionexecutor "node-executor-go/internal/executors/condition"
	httpexecutor "node-executor-go/internal/executors/http"
	llmexecutor "node-executor-go/internal/executors/llm"
	pluginsandboxexecutor "node-executor-go/internal/executors/pluginsandbox"
	ragexecutor "node-executor-go/internal/executors/rag"
)

func RegisterProfile(
	registry *executor.Registry,
	profile executorprofile.Profile,
	logger *log.Logger,
	modelResolverURL string,
	pluginArtifactResolverURL string,
	internalAuthToken string,
) error {
	switch profile {
	case executorprofile.Legacy:
		registry.Register(
			llmexecutor.NodeType,
			llmexecutor.New(logger, modelResolverURL, internalAuthToken),
		)
		registry.Register(ragexecutor.NodeType, ragexecutor.New(logger))
		if err := registerCode(registry, logger); err != nil {
			return err
		}
		registerHTTP(registry, logger)
		registry.Register(conditionexecutor.NodeType, conditionexecutor.New(logger))
		if err := registerPluginSandbox(registry, logger, pluginArtifactResolverURL, internalAuthToken); err != nil {
			return err
		}
	case executorprofile.Compute:
		registry.Register(conditionexecutor.NodeType, conditionexecutor.New(logger))
	case executorprofile.Model:
		registry.Register(
			llmexecutor.NodeType,
			llmexecutor.New(logger, modelResolverURL, internalAuthToken),
		)
		registry.Register(ragexecutor.NodeType, ragexecutor.New(logger))
	case executorprofile.HTTP:
		registerHTTP(registry, logger)
	case executorprofile.Sandbox:
		if err := registerCode(registry, logger); err != nil {
			return err
		}
		if err := registerPluginSandbox(registry, logger, pluginArtifactResolverURL, internalAuthToken); err != nil {
			return err
		}
	}
	return nil
}

func registerPluginSandbox(
	registry *executor.Registry,
	logger *log.Logger,
	artifactResolverURL string,
	internalAuthToken string,
) error {
	nodeExecutor, err := pluginsandboxexecutor.New(logger, artifactResolverURL, internalAuthToken)
	if err != nil {
		return err
	}
	registry.Register(pluginsandboxexecutor.NodeType, nodeExecutor)
	return nil
}

func registerCode(registry *executor.Registry, logger *log.Logger) error {
	nodeExecutor, err := codeexecutor.New(logger)
	if err != nil {
		return err
	}
	registry.Register(codeexecutor.NodeType, nodeExecutor)
	return nil
}

func registerHTTP(registry *executor.Registry, logger *log.Logger) {
	registry.Register(httpexecutor.NodeType, httpexecutor.New(logger))
}
