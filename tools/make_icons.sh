#!/bin/sh
# Eksportuje logo i ikonki do assets/ z tools/logo.html (wymaga działającego serwera na :8123 i Chrome).
# Użycie: sh tools/make_icons.sh
cd "$(dirname "$0")/.." || exit 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
URL="http://localhost:8123/tools/logo.html"
shot() { # nazwa, parametry, rozmiar
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --virtual-time-budget=4000 --window-size="$3,$3" --screenshot="assets/$1" "$URL?$2&px=$3" >/dev/null 2>&1
  echo "assets/$1: $(sips -g pixelWidth -g pixelHeight "assets/$1" | awk '/pixel/ {printf "%s ", $2}')"
}
shot logo.png "what=logo" 1080
shot icon-1024.png "what=icon" 1024
shot icon-512.png "what=icon" 512
shot icon-192.png "what=icon" 192
shot icon-180.png "what=icon" 180
shot icon-32.png "what=icon&smooth=1" 32
