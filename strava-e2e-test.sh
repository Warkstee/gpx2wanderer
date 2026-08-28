#!/bin/bash

# End-to-end test: Strava → gpx2wanderer → Wanderer
# Downloads a route from Strava, processes it through the pipeline, and uploads to Wanderer
#
# Usage: ./strava-e2e-test.sh <route-id>
# Example: ./strava-e2e-test.sh 3391683196004765610

set -e

# Check if route ID is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <strava-route-id>"
  echo "Example: $0 3391683196004765610"
  exit 1
fi

STRAVA_ROUTE_ID="$1"

echo "=== Strava End-to-End Test ==="
echo "Route ID: ${STRAVA_ROUTE_ID}"
echo ""

# Build the project
echo "Building project..."
npm run build
echo "✓ Build successful"
echo ""

# Run the pipeline with Strava download and upload
echo "Running pipeline with Strava download and upload to Wanderer..."
echo "Command: node dist/index.js --strava ${STRAVA_ROUTE_ID} -v --post-simplify --turn-threshold 120 --upload"
echo ""

node dist/index.js --strava "$STRAVA_ROUTE_ID" -v --post-simplify --turn-threshold 120 --upload

echo ""
echo "=== Strava End-to-End Test Complete ==="
