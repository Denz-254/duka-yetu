#!/bin/bash

echo "🚀 Setting up Duka Yetu with Docker..."

# Build and start containers
docker compose up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database..."
sleep 5

# Run migrations
echo "📊 Running migrations..."
docker compose run --rm api alembic revision --autogenerate -m "Initial schema"
docker compose run --rm api alembic upgrade head

# Check status
echo "✅ Setup complete!"
echo ""
echo "📊 Services running:"
docker compose ps
echo ""
echo "🔗 API available at: http://localhost:8000"
echo "🔗 API docs at: http://localhost:8000/docs"
echo "🐘 PostgreSQL at: localhost:5432 (user: postgres, password: postgres)"