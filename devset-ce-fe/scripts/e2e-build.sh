#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

STATIC_DIR="../devset-ce-be/src/main/resources/static"

if [ ! -d node_modules ]; then
  echo "[e2e-build] node_modules missing, running npm ci..."
  npm ci --no-audit --no-fund
fi

npm run build
rm -rf "$STATIC_DIR"
mkdir -p "$STATIC_DIR"
cp -r dist/. "$STATIC_DIR/"

cd ../devset-ce-be && ./gradlew bootJar