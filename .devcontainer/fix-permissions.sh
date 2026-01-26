#!/bin/bash
# Fix permissions on mounted volumes in CI environments
# Named volumes are created root-owned, but the node user needs write access

set -e

# Only run in CI environments
if [ -z "$CI" ]; then
    exit 0
fi

echo "Fixing volume permissions for CI environment..."

# Fix ownership of node_modules directories if they exist
for dir in /InZone-App/node_modules /InZone-App/apps/web/node_modules /InZone-App/apps/api/node_modules; do
    if [ -d "$dir" ]; then
        sudo chown -R node:node "$dir" 2>/dev/null || true
    fi
done

echo "Volume permissions fixed."
