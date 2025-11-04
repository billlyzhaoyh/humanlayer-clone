#!/bin/bash
# Generate metadata for research documents
# Usage: ${CLAUDE_PLUGIN_ROOT}/scripts/spec_metadata.sh

echo "date: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "git_commit: $(git rev-parse HEAD 2>/dev/null || echo 'unknown')"
echo "branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "repository: $(basename $(git rev-parse --show-toplevel 2>/dev/null) || echo 'unknown')"
