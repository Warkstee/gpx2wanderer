#!/bin/bash

# End-to-end test: Komoot → gpx2wanderer → Wanderer
# Downloads a route from Komoot, processes it through the pipeline, and uploads to Wanderer
#
# Usage: ./komoot-e2e-test.sh <route-id>
# Example: ./komoot-e2e-test.sh 51916450

set -e

# Check if route ID is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <komoot-route-id>"
  echo "Example: $0 51916450"
  exit 1
fi

KOMOOT_ROUTE_ID="$1"

echo "=== Komoot End-to-End Test ==="
echo "Route ID: ${KOMOOT_ROUTE_ID}"
echo ""

# Build the project
echo "Building project..."
npm run build
echo "✓ Build successful"
echo ""

# Run the pipeline with Komoot download and upload
echo "Running pipeline with Komoot download and upload to Wanderer..."
echo "Command: node dist/index.js --komoot ${KOMOOT_ROUTE_ID} -v --post-simplify --turn-threshold 120 --upload"
echo ""

node dist/index.js --komoot "$KOMOOT_ROUTE_ID" -v --post-simplify --turn-threshold 120 --upload

echo ""
echo "=== Komoot End-to-End Test Complete ==="
