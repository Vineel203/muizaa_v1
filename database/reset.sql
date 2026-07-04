-- Wipe all application tables and recreate an empty public schema.
-- Destructive: all data is permanently deleted.

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;

GRANT ALL ON SCHEMA public TO PUBLIC;

-- Cloud SQL application users (no-op if role does not exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'apiaccess') THEN
    GRANT ALL ON SCHEMA public TO apiaccess;
    GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO apiaccess;
    GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO apiaccess;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO apiaccess;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO apiaccess;
  END IF;
END $$;
