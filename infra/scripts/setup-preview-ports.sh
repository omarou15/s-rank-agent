#!/bin/bash
# Setup preview ports on VPS for live app preview
# Run on VPS: bash setup-preview-ports.sh

echo "Opening ports 8080-8090 for app preview..."

# Create apps directory
mkdir -p /home/agent/apps

# Open firewall ports
if command -v ufw &>/dev/null; then
  ufw allow 8080:8090/tcp
  ufw reload
elif command -v iptables &>/dev/null; then
  for port in $(seq 8080 8090); do
    iptables -A INPUT -p tcp --dport $port -j ACCEPT
  done
  iptables-save > /etc/iptables/rules.v4 2>/dev/null
fi

echo "✓ Ports 8080-8090 open"
echo "✓ /home/agent/apps/ directory created"
