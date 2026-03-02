#!/bin/bash
# Deploy VPS API server + install Office libs
# Run from repo root: bash infra/scripts/deploy-vps-api.sh

VPS="46.225.103.230"
VPS_USER="root"

echo "=== Deploying VPS API to $VPS ==="

# 1. Copy the new server.js
scp -o StrictHostKeyChecking=no infra/scripts/vps-api-server.js ${VPS_USER}@${VPS}:/opt/srank-api/server.js

# 2. Install Office libraries
ssh -o StrictHostKeyChecking=no ${VPS_USER}@${VPS} << 'REMOTECMD'
# Install Python Office libraries
pip3 install python-docx openpyxl python-pptx 2>/dev/null || pip install python-docx openpyxl python-pptx 2>/dev/null

# Create required directories
mkdir -p /home/agent/apps /home/agent/uploads /home/agent/users

# Initialize crons.json if not exists
[ -f /opt/srank-api/crons.json ] || echo '[]' > /opt/srank-api/crons.json

# Restart the API service
cd /opt/srank-api
pm2 restart srank-api 2>/dev/null || pm2 start server.js --name srank-api 2>/dev/null || {
  # Fallback: kill old and start new
  pkill -f "node server.js" 2>/dev/null
  nohup node server.js > /opt/srank-api/server.log 2>&1 &
}

echo "=== VPS API deployed + Office libs installed ==="
REMOTECMD
