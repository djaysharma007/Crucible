# Crucible Local Demo Tunnel using Cloudflare Quick Tunnel (cloudflared)
# Exposes local web frontend (http://localhost:3000) via a free temporary public trycloudflare.com URL.
# Zero cost, zero account, zero domain required.

Write-Host "=== Crucible Quick Tunnel (Cloudflare) ===" -ForegroundColor Cyan
Write-Host "Checking if cloudflared is installed..."

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
    Write-Host "cloudflared CLI not found in PATH." -ForegroundColor Yellow
    Write-Host "Install options:"
    Write-Host "  winget install Cloudflare.cloudflared"
    Write-Host "  choco install cloudflared"
    Write-Host "  or download from: https://github.com/cloudflare/cloudflared/releases"
    exit 1
}

Write-Host "Starting Cloudflare quick tunnel to http://localhost:3000..." -ForegroundColor Green
Write-Host "Look for the public URL below (ending with .trycloudflare.com):" -ForegroundColor Cyan
Write-Host "Share this URL with mock candidate or open on mobile to test WebRTC / collaborative coding." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the tunnel." -ForegroundColor Gray
Write-Host ""

cloudflared tunnel --url http://localhost:3000

