# Backup and recovery

Local SQLite data resides in `backend/rz_dev.db` when launched from the backend directory and should be treated as disposable development state. Production PostgreSQL backup cadence, point-in-time recovery, object-storage versioning, retention, and restore drills must be configured with the selected providers. No production backup is configured by this repository.
