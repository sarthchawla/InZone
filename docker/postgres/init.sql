-- InZone PostgreSQL initialization script
-- This script runs when the container is first created

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE inzone TO inzone;
