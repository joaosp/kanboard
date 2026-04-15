#!/usr/bin/env bash
set -e

git config core.hooksPath scripts/hooks
chmod +x scripts/hooks/pre-push

echo "Git hooks installed (core.hooksPath -> scripts/hooks)."
