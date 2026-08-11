#!/bin/sh
set -eu

secrets_directory="${AI_WORKFLOW_SECRETS_DIR:-/run/ai-workflow-secrets}"
rabbitmq_password="$(cat "$secrets_directory/rabbitmq_password")"

RABBITMQ_URL="amqp://${RABBITMQ_USER:-ai_workflow}:${rabbitmq_password}@rabbitmq:5672/${RABBITMQ_VHOST:-ai_workflow}"
EXECUTOR_INTERNAL_AUTH_TOKEN="$(cat "$secrets_directory/executor_token")"
export RABBITMQ_URL EXECUTOR_INTERNAL_AUTH_TOKEN

exec /workspace/executor
