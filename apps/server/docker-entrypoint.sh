#!/bin/sh
set -eu

secrets_directory="${AI_WORKFLOW_SECRETS_DIR:-/run/ai-workflow-secrets}"
postgres_password="$(cat "$secrets_directory/postgres_password")"
rabbitmq_password="$(cat "$secrets_directory/rabbitmq_password")"

DATABASE_URL="postgresql://${POSTGRES_USER:-ai_workflow}:${postgres_password}@postgres:5432/${POSTGRES_DB:-ai_workflow}"
RABBITMQ_URL="amqp://${RABBITMQ_USER:-ai_workflow}:${rabbitmq_password}@rabbitmq:5672/${RABBITMQ_VHOST:-ai_workflow}"
JWT_SECRET="$(cat "$secrets_directory/jwt_secret")"
MODEL_CREDENTIAL_ENCRYPTION_KEY="$(cat "$secrets_directory/model_key")"
EXECUTOR_INTERNAL_AUTH_TOKEN="$(cat "$secrets_directory/executor_token")"
OPENSEARCH_PASSWORD="$(cat "$secrets_directory/opensearch_password")"
export DATABASE_URL RABBITMQ_URL JWT_SECRET MODEL_CREDENTIAL_ENCRYPTION_KEY
export EXECUTOR_INTERNAL_AUTH_TOKEN OPENSEARCH_PASSWORD

./node_modules/.bin/prisma migrate deploy
exec node dist/main.js
