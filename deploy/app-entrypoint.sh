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
  *)
    echo 'usage: app-entrypoint.sh {web|server|executor}' >&2
    exit 64
    ;;
esac
