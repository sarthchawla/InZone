#!/bin/bash
# Fix permissions on mounted volumes
# Named volumes are created root-owned, but the node user needs write access
# This runs with sudo and is safe to run in any environment (idempotent)

set -e

echo "Checking and fixing volume permissions..."

# Fix ownership of node_modules directories
for dir in /InZone-App/node_modules /InZone-App/apps/web/node_modules /InZone-App/apps/api/node_modules; do
    if [ -d "$dir" ]; then
        # Check if already owned by node
        owner=$(stat -c '%U' "$dir" 2>/dev/null || stat -f '%Su' "$dir" 2>/dev/null)
        if [ "$owner" != "node" ]; then
            echo "  Fixing permissions on $dir (owner: $owner -> node)"
            chown -R node:node "$dir"
        else
            echo "  $dir already owned by node"
        fi
    else
        echo "  Creating and fixing permissions on $dir"
        mkdir -p "$dir"
        chown -R node:node "$dir"
    fi
done

echo "Volume permissions check complete."
