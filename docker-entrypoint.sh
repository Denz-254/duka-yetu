#!/bin/sh
set -e

echo "🚀 Starting Duka Yetu..."

# Wait for database
echo "⏳ Waiting for database..."
python -c "
import time
import os
import psycopg2
from psycopg2 import OperationalError

db_url = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@db:5432/duka_yetu')
max_attempts = 30

for attempt in range(max_attempts):
    try:
        conn = psycopg2.connect(db_url)
        conn.close()
        print('✅ Database is ready!')
        exit(0)
    except OperationalError:
        print(f'⏳ Waiting for database... (attempt {attempt + 1}/{max_attempts})')
        time.sleep(2)

print('❌ Database not available after 30 attempts')
exit(1)
"

# Run database migrations
echo "📊 Running database migrations..."
alembic upgrade head

# Start the application
echo "🎯 Starting application..."
exec "$@"
