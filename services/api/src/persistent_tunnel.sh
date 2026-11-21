#!/usr/bin/env bash
while true; do
  echo "[Serveo] Starting persistent tunnel on port 5173..."
  ssh -o StrictHostKeyChecking=no -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -R 80:localhost:5173 serveo.net
  echo "[Serveo] Tunnel disconnected. Reconnecting in 3 seconds..."
  sleep 3
done
