#!/bin/bash

# Smoke test for gpx2wanderer pipeline
# This script processes a real GPX file end-to-end

set -e

echo "=== Smoke Test: End-to-End Pipeline ==="
echo ""

# Check if test GPX file exists
TEST_FILE="src/__tests__/__data__/Wanderer-Test-Track-01.gpx"
if [ ! -f "$TEST_FILE" ]; then
    echo "❌ Test GPX file not found: $TEST_FILE"
    exit 1
fi

echo "✓ Test GPX file found: $TEST_FILE"
echo ""

# Build the project
echo "Building project..."
npm run build
echo "✓ Build successful"
echo ""

# Run the pipeline with upload and source ID
echo "Running pipeline with upload to Wanderer..."
echo "Command: node dist/index.js $TEST_FILE -v --post-simplify --turn-threshold 120 --upload --source-id test-001"
echo ""

node dist/index.js "$TEST_FILE" -v --post-simplify --turn-threshold 120 --upload --source-id test-001

echo ""
echo "=== Smoke Test Complete ==="
