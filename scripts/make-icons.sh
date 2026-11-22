#!/usr/bin/env bash
# Renders the installable-app icons (public/icons/*.png) from the SVG sources.
# Uses librsvg from the flake's pinned nixpkgs — nothing is installed globally.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

if ! command -v rsvg-convert >/dev/null; then
  exec nix --extra-experimental-features 'nix-command flakes' shell --inputs-from . nixpkgs#librsvg \
    --command bash "$0" "$@"
fi

mkdir -p public/icons
rsvg-convert -w 192 -h 192 public/favicon.svg -o public/icons/icon-192.png
rsvg-convert -w 512 -h 512 public/favicon.svg -o public/icons/icon-512.png
rsvg-convert -w 512 -h 512 public/icons/maskable.svg -o public/icons/maskable-512.png
# iOS fills transparency with black, so the touch icon uses the full-bleed artwork.
rsvg-convert -w 180 -h 180 public/icons/maskable.svg -o public/icons/apple-touch-icon.png
echo "icons written to public/icons/"
