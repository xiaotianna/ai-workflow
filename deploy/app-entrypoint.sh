#!/bin/sh
set -eu

case "${1:-}" in
  web)
    exec nginx -g 'daemon off;'
    ;;
  server)
    cd /workspace/apps/server
    exec sh ./docker-entrypoint.sh
    ;;
  executor)
    exec sh /workspace/apps/executor-go/docker-entrypoint.sh
    ;;
  agent-runtime)
    AGENT_RUNTIME_INTERNAL_AUTH_TOKEN="$(cat "${AI_WORKFLOW_SECRETS_DIR:-/run/ai-workflow-secrets}/agent_token")"
    export AGENT_RUNTIME_INTERNAL_AUTH_TOKEN
    exec node /workspace/apps/agent-runtime/dist/main.js
    ;;
  *)
    echo 'usage: app-entrypoint.sh {web|server|executor|agent-runtime}' >&2
    exit 64
    ;;
esac
