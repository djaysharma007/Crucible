#!/usr/bin/env bash
# Crucible Local Demo Tunnel using Cloudflare Quick Tunnel (cloudflared)
# Exposes local web frontend (http://localhost:3000) via a free temporary public trycloudflare.com URL.
# Zero cost, zero account, zero domain required.

set -e

echo -e "\033[0;36m=== Crucible Quick Tunnel (Cloudflare) ===\033[0m"

if ! command -v cloudflared &> /dev/null; then
    echo -e "\033[0;33mcloudflared CLI not found in PATH.\033[0m"
    echo "Install options:"
    echo "  brew install cloudflared"
    echo "  sudo apt-get install cloudflared"
    echo "  or download from: https://github.com/cloudflare/cloudflared/releases"
    exit 1
fi

echo -e "\033[0;32mStarting Cloudflare quick tunnel to http://localhost:3000...\033[0m"
echo -e "\033[0;36mLook for the public URL below (ending with .trycloudflare.com):\033[0m"
echo -e "\033[0;33mShare this URL with mock candidate or open on mobile to test WebRTC / collaborative coding.\033[0m"
echo -e "\033[0;90mPress Ctrl+C to stop the tunnel.\033[0m"
echo ""

cloudflared tunnel --url http://localhost:3000

