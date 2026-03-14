#!/bin/bash
# seed.sh - Runs the prisma seed script

echo "Seeding the database..."
docker compose exec web npx prisma db seed
echo "Seeding completed."
