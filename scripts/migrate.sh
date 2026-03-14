#!/bin/bash
# migrate.sh - Runs prisma migrations

echo "Running database migrations..."
docker compose exec web npx prisma migrate deploy
echo "Migrations completed."
