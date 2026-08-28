#!/bin/bash

# End-to-end test: Komoot → gpx2wanderer → Wanderer
# Downloads a route from Komoot, processes it through the pipeline, and uploads to Wanderer

set -e

# Hardcoded Komoot route ID for testing
KOMOOT_ROUTE_ID="51916450"  # Schwäglalp Pass Round Trip v1

echo "=== Komoot End-to-End Test ==="
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
