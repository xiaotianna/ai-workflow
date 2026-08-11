#!/bin/sh
set -eu

umask 077
secrets_root="${AI_WORKFLOW_SECRET_ROOT:-/secrets}"

random_hex() {
  od -An -N32 -tx1 /dev/urandom | tr -d ' \n'
}

random_base64() {
  head -c 32 /dev/urandom | base64 | tr -d '\n'
}

sync_secret() {
  kind="$1"
  override="$2"
  shift 2

  source_file=''
  for target_file in "$@"; do
    if [ -s "$target_file" ]; then
      source_file="$target_file"
      break
    fi
  done

  if [ -z "$source_file" ]; then
    source_file="/tmp/$kind"
    if [ -n "$override" ]; then
      printf '%s' "$override" >"$source_file"
    else
      case "$kind" in
        opensearch_password)
          printf 'Aw9!%s' "$(random_hex)" >"$source_file"
          ;;
        model_key)
          random_base64 >"$source_file"
          ;;
        *)
          random_hex >"$source_file"
          ;;
      esac
    fi
  fi

  for target_file in "$@"; do
    target_directory="${target_file%/*}"
    mkdir -p "$target_directory"
    temporary_file="$target_file.tmp"
    cp "$source_file" "$temporary_file"
    chmod 0444 "$temporary_file"
    mv "$temporary_file" "$target_file"
  done
}

sync_secret postgres_password "${POSTGRES_PASSWORD:-}" \
  "$secrets_root/server/postgres_password" \
  "$secrets_root/postgres/postgres_password"

sync_secret rabbitmq_password "${RABBITMQ_PASSWORD:-}" \
  "$secrets_root/server/rabbitmq_password" \
  "$secrets_root/executor/rabbitmq_password" \
  "$secrets_root/rabbitmq/rabbitmq_password"

sync_secret opensearch_password "${OPENSEARCH_INITIAL_ADMIN_PASSWORD:-}" \
  "$secrets_root/server/opensearch_password" \
  "$secrets_root/opensearch/opensearch_password"

sync_secret jwt_secret "${JWT_SECRET:-}" \
  "$secrets_root/server/jwt_secret"

sync_secret executor_token "${EXECUTOR_INTERNAL_AUTH_TOKEN:-}" \
  "$secrets_root/server/executor_token" \
  "$secrets_root/executor/executor_token"

sync_secret model_key "${MODEL_CREDENTIAL_ENCRYPTION_KEY:-}" \
  "$secrets_root/server/model_key"
