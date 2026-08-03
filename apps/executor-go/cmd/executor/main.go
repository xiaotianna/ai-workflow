package main

import (
	"context"
	"errors"
	"log"
	"os"
	"os/signal"
	"syscall"

	"node-executor-go/internal/executor"
	"node-executor-go/internal/executors"
	workflowmq "node-executor-go/internal/mq"
)

const defaultRabbitMQURL = "amqp://ai_workflow:ai_workflow_dev@127.0.0.1:5672/ai_workflow"

func main() {
	logger := log.New(os.Stdout, "executor-go ", log.LstdFlags|log.LUTC)
	registry := executor.NewRegistry()
	executors.RegisterBuiltins(registry, logger)
	rabbitMQURL := os.Getenv("RABBITMQ_URL")
	if rabbitMQURL == "" {
		rabbitMQURL = defaultRabbitMQURL
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	worker := workflowmq.NewWorker(rabbitMQURL, registry, logger)
	logger.Printf("workflow command worker starting queue=%s", workflowmq.CommandQueue)
	if err := worker.Run(ctx); err != nil && !errors.Is(err, context.Canceled) {
		logger.Fatalf("workflow command worker stopped: %v", err)
	}
}
