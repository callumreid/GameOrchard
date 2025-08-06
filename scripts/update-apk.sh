#!/bin/bash

set -e  # exit on first failure

echo "🐷 Setting APK mode..."
./scripts/set-apk-mode.sh

echo "📦 Building static site..."
npm run build

echo "🔄 Syncing with Android project..."
npx cap sync android

echo "📱 Running on Android..."
npx cap run android

echo "🐷 Reverting back to dev mode..."
./scripts/set-dev-mode.sh

echo "✅ All done!"
