#!/usr/bin/env bash
set -eo pipefail

# Detect package manager (default to pnpm)
if [ -f package.json ]; then
  if [ -f pnpm-lock.yaml ]; then
    echo "pnpm-lock.yaml exists, skipping install."
  else
    echo "Generating pnpm-lock.yaml..."
    pnpm install --frozen-lockfile || pnpm install
    git add pnpm-lock.yaml
    git commit -m "chore: add pnpm-lock.yaml for CI build stability"
  fi
else
  echo "ERROR: No package.json found. Cannot generate lockfile."
  exit 1
fi