#!/usr/bin/env bash
# Install the repo's git hooks. Run once per clone — .git/hooks is not tracked.
set -euo pipefail
cd "$(dirname "$0")/.."
git config core.hooksPath scripts/hooks
chmod +x scripts/hooks/*
echo "✓ hooks installed (core.hooksPath = scripts/hooks)"
echo "  pre-commit — blocks any commit that changes code or the database"
echo "               without updating BUILD/CHANGELOG.md"
