#!/bin/zsh
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
node scripts/setup-llm.mjs
printf '\nPress Enter to close this window.'
read
