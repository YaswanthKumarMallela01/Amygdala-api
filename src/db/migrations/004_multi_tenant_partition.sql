ALTER TABLE users ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES api_clients(id) ON DELETE SET NULL;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_client ON users (COALESCE(client_id, '00000000-0000-0000-0000-000000000000'), email);

CREATE TABLE IF NOT EXISTS tenant_login_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES api_clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_email TEXT NOT NULL,
    user_name TEXT,
    ip_address INET,
    device_info TEXT,
    logged_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked')),
    family_id UUID
);

CREATE INDEX IF NOT EXISTS idx_tenant_sessions_client ON tenant_login_sessions (client_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_user ON tenant_login_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_sessions_client_status ON tenant_login_sessions (client_id, status);

ALTER TABLE login_attempts ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES api_clients(id) ON DELETE SET NULL;
