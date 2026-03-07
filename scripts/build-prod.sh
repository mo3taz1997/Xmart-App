#!/bin/bash
set -e

echo "Building server..."
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=server_dist

echo "Pushing database schema..."
npx drizzle-kit push --force

echo "Build complete!"
