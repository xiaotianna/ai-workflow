#!/bin/sh
set -eu

RABBITMQ_DEFAULT_PASS="$(cat /run/ai-workflow-secrets/rabbitmq_password)"
export RABBITMQ_DEFAULT_PASS

if [ "$#" -eq 0 ]; then
  set -- rabbitmq-server
fi

exec docker-entrypoint.sh "$@"
