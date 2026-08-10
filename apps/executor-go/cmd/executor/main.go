package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	"node-executor-go/internal/executor"
	"node-executor-go/internal/executorlease"
	"node-executor-go/internal/executorprofile"
	"node-executor-go/internal/executors"
	workflowmq "node-executor-go/internal/mq"
)

const defaultRabbitMQURL = "amqp://ai_workflow:ai_workflow_dev@127.0.0.1:5672/ai_workflow"
const defaultModelResolverURL = "http://127.0.0.1:3000/internal/executor/models/resolve"
const defaultCommandLeaseURL = "http://127.0.0.1:3000/internal/executor/commands/lease"
const defaultPluginArtifactResolverURL = "http://127.0.0.1:3000/internal/executor/plugin-artifacts/resolve"
const defaultKnowledgeRetrieverURL = "http://127.0.0.1:3000/internal/executor/knowledge/retrieve"

func main() {
	logger := log.New(os.Stdout, "executor-go ", log.LstdFlags|log.LUTC)
	profile, err := executorprofile.Parse(os.Getenv("EXECUTOR_PROFILE"))
	if err != nil {
		logger.Fatalf("executor profile invalid: %v", err)
	}
	commandRoute, err := workflowmq.CommandRouteForProfile(profile)
	if err != nil {
		logger.Fatalf("executor command route invalid: %v", err)
	}
	// 实例化注册方法（类似new NewRegistry()）
	registry := executor.NewRegistry()
	modelResolverURL := os.Getenv("MODEL_RUNTIME_RESOLVER_URL")
	if modelResolverURL == "" {
		modelResolverURL = defaultModelResolverURL
	}
	internalAuthToken := os.Getenv("EXECUTOR_INTERNAL_AUTH_TOKEN")
	pluginArtifactResolverURL := os.Getenv("PLUGIN_ARTIFACT_RESOLVER_URL")
	if pluginArtifactResolverURL == "" {
		pluginArtifactResolverURL = defaultPluginArtifactResolverURL
	}
	knowledgeRetrieverURL := os.Getenv("KNOWLEDGE_RUNTIME_RETRIEVER_URL")
	if knowledgeRetrieverURL == "" {
		knowledgeRetrieverURL = defaultKnowledgeRetrieverURL
	}
	requireInternalAuth, err := environmentBool("EXECUTOR_REQUIRE_INTERNAL_AUTH")
	if err != nil {
		logger.Fatalf("executor internal auth configuration invalid: %v", err)
	}
	if requireInternalAuth && strings.TrimSpace(internalAuthToken) == "" {
		logger.Fatal("EXECUTOR_REQUIRE_INTERNAL_AUTH 已启用，但未配置内部认证令牌")
	}
	if err := executors.RegisterProfile(
		registry,
		profile,
		logger,
		modelResolverURL,
		knowledgeRetrieverURL,
		pluginArtifactResolverURL,
		internalAuthToken,
	); err != nil {
		logger.Fatalf("executor profile registration failed: %v", err)
	}
	rabbitMQURL := os.Getenv("RABBITMQ_URL")
	if rabbitMQURL == "" {
		rabbitMQURL = defaultRabbitMQURL
	}
	commandLeaseURL := os.Getenv("COMMAND_RUNTIME_LEASE_URL")
	if commandLeaseURL == "" {
		commandLeaseURL = defaultCommandLeaseURL
	}
	// 监听进程退出
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	// 启动mq worker，开始监听传来执行节点
	leaseChecker := executorlease.NewServerChecker(
		http.DefaultClient,
		commandLeaseURL,
		internalAuthToken,
	)
	worker := workflowmq.NewWorker(
		rabbitMQURL,
		profile.String(),
		commandRoute,
		registry,
		leaseChecker,
		logger,
	)
	logger.Printf(
		"workflow command worker starting profile=%s queue=%s",
		profile,
		commandRoute.Queue,
	)
	if err := worker.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		logger.Fatalf("workflow command worker stopped: %v", err)
	}
}

func environmentBool(key string) (bool, error) {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return false, nil
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return false, errors.New(key + " 必须是布尔值")
	}
	return parsed, nil
}
