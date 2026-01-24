#!/usr/bin/env bash
set -eu

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
LOG_DIR="$ROOT_DIR/logs"
mkdir -p "$LOG_DIR"

# Kill processes on ports if any
kill_port() {
  local port=$1
  pids=$(lsof -tiTCP:$port -sTCP:LISTEN || true)
  if [ -n "$pids" ]; then
    echo "Killing processes on port $port: $pids"
    kill -9 $pids || true
    sleep 0.5
  fi
}

kill_port 3000
kill_port 5173

# Start server (nodemon) and client (vite)
echo "Starting server dev (nodemon) -> $LOG_DIR/server_dev.log"
nohup npm --prefix "$ROOT_DIR/server" run dev > "$LOG_DIR/server_dev.log" 2>&1 &
server_pid=$!

sleep 0.5

echo "Starting client dev (vite) -> $LOG_DIR/client_dev.log"
nohup npm --prefix "$ROOT_DIR/client" run dev > "$LOG_DIR/client_dev.log" 2>&1 &
client_pid=$!

sleep 1

cat <<EOF
Started processes:
  server pid: $server_pid (http://localhost:3000)
  client pid: $client_pid (http://localhost:5173)
Logs: $LOG_DIR
Tailing client log (first 200 lines):
EOF

sleep 0.5

sed -n '1,200p' "$LOG_DIR/client_dev.log" || true

echo "\nIf the page doesn't appear in your browser, try opening http://localhost:5173/ or run 'tail -f $LOG_DIR/client_dev.log' and 'tail -f $LOG_DIR/server_dev.log' to watch logs." 
