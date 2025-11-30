#!/bin/sh
# Runtime environment variable injection for Next.js

set -e

echo "Starting frontend with environment variable injection..."

# Replace placeholder in built files with actual environment variables
if [ -n "$NEXT_PUBLIC_BACKEND_URL" ]; then
  echo "Injecting NEXT_PUBLIC_BACKEND_URL: $NEXT_PUBLIC_BACKEND_URL"
  find /app/.next -type f \( -name "*.js" -o -name "*.json" \) 2>/dev/null | while read file; do
    sed -i "s|http://localhost:7210|$NEXT_PUBLIC_BACKEND_URL|g" "$file" || true
  done
fi

if [ -n "$NEXT_PUBLIC_WEBSOCKET_URL" ]; then
  echo "Injecting NEXT_PUBLIC_WEBSOCKET_URL: $NEXT_PUBLIC_WEBSOCKET_URL"
  find /app/.next -type f \( -name "*.js" -o -name "*.json" \) 2>/dev/null | while read file; do
    sed -i "s|ws://localhost:7210|$NEXT_PUBLIC_WEBSOCKET_URL|g" "$file" || true
  done
fi

echo "Environment injection complete. Starting server..."

# Start the Next.js server as nextjs user
exec su-exec nextjs:nodejs node server.js
