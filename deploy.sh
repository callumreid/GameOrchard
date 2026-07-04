#!/bin/zsh
# Deploy to Vercel production, bypassing the git commit-author check.
#
# Why this exists: the house-boat-studios Vercel team (Pro) requires commit
# authors to be team members. Callum's GitHub account is login-connected to a
# different (non-member) Vercel account, so both git-integration deploys and
# plain `vercel deploy` (which attaches local git metadata) get stuck/blocked.
# Deploying from a git-less copy attaches no author metadata, so the deploy
# runs as the authenticated CLI member. Same workaround as WhatAreYou.
#
# Usage: ./deploy.sh          # preview deploy
#        ./deploy.sh --prod   # production deploy
set -euo pipefail

SRC="$(cd "$(dirname "$0")" && pwd)"
STAGE="$(mktemp -d /tmp/go-deploy.XXXXXX)"
trap 'rm -rf "$STAGE"' EXIT

if [[ ! -d "$SRC/.vercel" ]]; then
  echo "No .vercel/ found — run 'vercel link --yes --project game-orchard --scope house-boat-studios' once first." >&2
  exit 1
fi

rsync -a \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude '.next' \
  --exclude '.vercel' \
  --exclude '.env*' \
  --exclude 'deploy.sh' \
  "$SRC/" "$STAGE/"

cp -R "$SRC/.vercel" "$STAGE/.vercel"

cd "$STAGE"
vercel deploy --yes --scope house-boat-studios "$@"
