package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"node-executor-go/internal/executor"
	"node-executor-go/internal/executorlease"
	"node-executor-go/internal/executors"
	workflowmq "node-executor-go/internal/mq"
)

const defaultRabbitMQURL = "amqp://ai_workflow:ai_workflow_dev@127.0.0.1:5672/ai_workflow"
const defaultModelResolverURL = "http://127.0.0.1:3000/internal/executor/models/resolve"
const defaultCommandLeaseURL = "http://127.0.0.1:3000/internal/executor/commands/lease"

func main() {
	logger := log.New(os.Stdout, "executor-go ", log.LstdFlags|log.LUTC)
	// 实例化注册方法（类似new NewRegistry()）
	registry := executor.NewRegistry()
	modelResolverURL := os.Getenv("MODEL_RUNTIME_RESOLVER_URL")
	if modelResolverURL == "" {
		modelResolverURL = defaultModelResolverURL
	}
	// 调用注册所有node
	executors.RegisterBuiltins(registry, logger, modelResolverURL)
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
	leaseChecker := executorlease.NewServerChecker(http.DefaultClient, commandLeaseURL)
	worker := workflowmq.NewWorker(rabbitMQURL, registry, leaseChecker, logger)
	logger.Printf("workflow command worker starting queue=%s", workflowmq.CommandQueue)
	if err := worker.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		logger.Fatalf("workflow command worker stopped: %v", err)
	}
}
