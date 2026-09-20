-- Migration 005: Multi-Tenant OAuth Isolation
-- Allows the same OAuth identity (Google/GitHub account) to exist independently across multiple API client tenants.

-- Add client_id to oauth_identities table
ALTER TABLE oauth_identities ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES api_clients(id) ON DELETE CASCADE;

-- Drop global unique constraint on (provider, provider_user_id)
ALTER TABLE oauth_identities DROP CONSTRAINT IF EXISTS oauth_identities_provider_provider_user_id_key;

-- Recreate unique index scoped by client_id (COALESCE handles NULL for master Amygdala platform accounts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_oauth_identities_client_provider 
ON oauth_identities (COALESCE(client_id, '00000000-0000-0000-0000-000000000000'), provider, provider_user_id);

-- Index for fast tenant lookups
CREATE INDEX IF NOT EXISTS idx_oauth_identities_client ON oauth_identities(client_id);
