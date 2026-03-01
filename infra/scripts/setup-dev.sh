#!/bin/bash
set -e

echo "🏆 S-Rank Agent — Dev Setup"
echo "=========================="

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required. Install: https://nodejs.org"; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "📦 Installing pnpm..."; npm install -g pnpm; }
command -v docker >/dev/null 2>&1 || { echo "⚠️  Docker not found. Local DB won't work."; }

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Setup env
if [ ! -f .env ]; then
  echo "📄 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Please fill in your credentials in .env"
fi

# Start local DB
if command -v docker >/dev/null 2>&1; then
  echo "🐘 Starting local PostgreSQL + Redis..."
  docker compose -f infra/docker-compose.dev.yml up -d
  sleep 3
fi

# Push DB schema
echo "🗄️  Pushing database schema..."
pnpm db:push 2>/dev/null || echo "⚠️  DB push skipped (check DATABASE_URL in .env)"

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Fill in credentials in .env"
echo "  2. Run: pnpm dev"
echo "  3. Open: http://localhost:3000"
echo ""
