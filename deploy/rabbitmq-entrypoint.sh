#!/bin/sh
set -eu

RABBITMQ_DEFAULT_PASS="$(cat /run/ai-workflow-secrets/rabbitmq_password)"
export RABBITMQ_DEFAULT_PASS

exec docker-entrypoint.sh "$@"
