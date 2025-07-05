#!/usr/bin/env bash

# Start subgraph-server.ts with optional .env file
# Usage: ./scripts/start-subgraph.sh [path/to/.env]

set -euo pipefail

ENV_FILE="${1:-.env}"

if [ -f "$ENV_FILE" ]; then
  set -o allexport
  source "$ENV_FILE"
  set +o allexport
else
  if [ -n "${1:-}" ]; then
    echo "Environment file '$ENV_FILE' not found" >&2
    exit 1
  fi
fi

exec npx ts-node scripts/subgraph-server.ts
