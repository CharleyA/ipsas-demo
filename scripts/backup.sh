#!/bin/bash
# backup.sh - Database and uploads backup script

# Configuration
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RETENTION_DAYS=7

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

echo "Starting backup: $TIMESTAMP"

# 1. Database backup
DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$TIMESTAMP.sql"
echo "Backing up database..."
docker compose exec -T db pg_dump -U postgres accounting > "$DB_BACKUP_FILE"

if [ $? -eq 0 ]; then
    gzip "$DB_BACKUP_FILE"
    echo "Database backup completed: ${DB_BACKUP_FILE}.gz"
else
    echo "Database backup failed!"
    exit 1
fi

# 2. Uploads backup
UPLOADS_BACKUP_FILE="$BACKUP_DIR/uploads_backup_$TIMESTAMP.tar.gz"
echo "Backing up uploads..."
# Since uploads_data is a volume, we use a temporary container to tar it
docker run --rm \
  --volumes-from accounting-web \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine tar -czf "/backup/uploads_backup_$TIMESTAMP.tar.gz" -C /data/uploads .

if [ $? -eq 0 ]; then
    echo "Uploads backup completed: $UPLOADS_BACKUP_FILE"
else
    echo "Uploads backup failed!"
    exit 1
fi

# 3. Cleanup old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup process finished."
