-- PostgreSQL Initialization Script for US Credit Law & Dispute Platform

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure database permissions
GRANT ALL PRIVILEGES ON DATABASE credit_law_db TO credit_admin;
