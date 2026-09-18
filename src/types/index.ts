export interface User {
  id: string;
  email: string;
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
  api_key_hash: string;
  allowed_origins: string[];
  created_at: Date;
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
