#!/usr/bin/env bash
# scripts/run_all.sh
# "Regular" script to install deps, start ASR demo (background), and launch the app.
# Usage: ./scripts/run_all.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[run_all] Installing root dependencies (npm install)..."
npm install

if [ -d "src" ]; then
  echo "[run_all] Installing UI/runtime dependencies in src (three, ws)..."
  (cd src && npm install three ws)
else
  echo "[run_all] Warning: src/ directory not found"
fi

mkdir -p logs

# Start ASR demo in background
if command -v node >/dev/null 2>&1; then
  echo "[run_all] Starting ASR demo server in background (logs/asr.log)..."
  nohup node scripts/asr_ws_demo.js > logs/asr.log 2>&1 &
  ASR_PID=$!
  echo "[run_all] ASR demo started with PID ${ASR_PID}"
  echo "[run_all] To stop ASR demo: kill ${ASR_PID} or pkill -f asr_ws_demo.js"
else
  echo "[run_all] Node not found in PATH; skipping ASR demo start"
fi

# Start the app (foreground)
echo "[run_all] Launching the app (npm start). App logs will be written to logs/app.log"
# Use tee to copy output to logs while showing in terminal
npm start 2>&1 | tee logs/app.log
