#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=== Python Pipeline Checks ==="
(
  cd "$ROOT_DIR/pipeline"
  uv run ruff check .
  uv run ruff format --check .
  uv run pyrefly check
  uv run pytest
)

echo "=== Web Frontend Checks ==="
(
  cd "$ROOT_DIR/web"
  pnpm lint
  pnpm format:check
  pnpm test
  pnpm check
  pnpm build
)

echo "All CI checks passed!"
