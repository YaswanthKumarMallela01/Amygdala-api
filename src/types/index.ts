export interface User {
  id: string;
  email: string;
  client_id: string | null;
  name: string | null;
  password_hash: string | null;
  email_verified: boolean;
  mfa_secret: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface OAuthIdentity {
  id: string;
  user_id: string;
  client_id: string | null;
  provider: string;
  provider_user_id: string;
  created_at: Date;
}

export interface RefreshTokenRecord {
  id: string;
  user_id: string;
  token_hash: string;
  family_id: string;
  expires_at: Date;
  revoked: boolean;
  device_info: string | null;
  created_at: Date;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export interface LoginAttempt {
  id: string;
  email: string;
  ip_address: string;
  success: boolean;
  attempted_at: Date;
}

export interface ApiClient {
  id: string;
  name: string;
  user_id: string;
  api_key_hash: string;
  allowed_origins: string[];
  created_at: Date;
}

export interface TenantLoginSession {
  id: string;
  client_id: string;
  user_id: string;
  user_email: string;
  user_name: string | null;
  ip_address: string | null;
  device_info: string | null;
  logged_in_at: Date;
  last_active_at: Date;
  status: 'active' | 'expired' | 'revoked';
  family_id: string | null;
}

// Express request extensions
declare global {
  namespace Express {
    interface Request {
      apiClient?: ApiClient;
      user?: { sub: string; email: string; name?: string; mfa_verified?: boolean };
    }
  }
}
