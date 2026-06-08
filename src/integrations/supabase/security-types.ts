/**
 * Security table types — extend generated Database types until next codegen.
 */
export type UserSecuritySettings = {
  user_id: string;
  totp_secret_encrypted: string | null;
  totp_key_version: number;
  totp_enabled: boolean;
  totp_verified_at: string | null;
  backup_code_hashes: string[] | null;
  failed_login_count: number;
  locked_until: string | null;
  passkey_count: number;
  created_at: string;
  updated_at: string;
};

export type UserRole =
  | "SUPER_ADMIN"
  | "ORG_ADMIN"
  | "SITE_MANAGER"
  | "ANALYST"
  | "VIEWER";
