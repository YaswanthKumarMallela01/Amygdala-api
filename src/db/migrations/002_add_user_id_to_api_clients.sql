ALTER TABLE api_clients ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_api_clients_user_id ON api_clients(user_id);
