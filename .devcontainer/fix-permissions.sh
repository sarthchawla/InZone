#!/bin/bash
# Fix permissions on mounted volumes in CI environments
# Named volumes are created root-owned, but the node user needs write access
#
# This script should be run via sudo in CI: sudo /usr/local/bin/fix-permissions.sh

set -e

# Only run in CI environments
if [ -z "$CI" ]; then
    echo "Not in CI environment, skipping fix-permissions"
    exit 0
fi

echo "Fixing volume permissions for CI environment..."

# Fix ownership of node_modules directories
for dir in /InZone-App/node_modules /InZone-App/apps/web/node_modules /InZone-App/apps/api/node_modules; do
    if [ -d "$dir" ]; then
        echo "  Fixing permissions on $dir"
        chown -R node:node "$dir"
    else
        echo "  Creating and fixing permissions on $dir"
        mkdir -p "$dir"
        chown -R node:node "$dir"
    fi
done

echo "Volume permissions fixed."
