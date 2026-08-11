#!/bin/sh
set -eu

OPENSEARCH_INITIAL_ADMIN_PASSWORD="$(cat /run/ai-workflow-secrets/opensearch_password)"
export OPENSEARCH_INITIAL_ADMIN_PASSWORD

exec ./opensearch-docker-entrypoint.sh "$@"
