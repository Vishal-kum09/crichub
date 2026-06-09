-- ============================================================================
-- auth_schema.sql — Phase 2 additive schema changes (approved by user).
-- Non-destructive: new clubs + otp_verifications tables, new account_role enum,
-- and additive auth columns on the existing users table.
-- Idempotent: guards on every object so it is safe to re-run.
-- ============================================================================

-- 6-value role for the JWT payload (kept separate from platform_role).
DO $$ BEGIN
  CREATE TYPE account_role AS ENUM
    ('Viewer', 'Player', 'Scorer', 'Analyst', 'Club_Admin', 'Super_Admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Clubs / organisations.
CREATE TABLE IF NOT EXISTS clubs (
  clubs_id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR NOT NULL,
  home_ground      VARCHAR,
  contact_number   VARCHAR,
  email            VARCHAR,
  country          VARCHAR,
  display_initials VARCHAR,
  logo_url         TEXT,
  owner_name       VARCHAR,
  is_approved      BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- OTP verifications (phone-based, 10-minute expiry enforced in app).
CREATE TABLE IF NOT EXISTS otp_verifications (
  otp_verifications_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone                VARCHAR NOT NULL,
  code                 VARCHAR(6) NOT NULL,
  expires_at           TIMESTAMPTZ NOT NULL,
  verified             BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_phone ON otp_verifications(phone);

-- Auth columns on the existing users table (additive).
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone         VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS club_id       UUID REFERENCES clubs(clubs_id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_approved   BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_role  account_role NOT NULL DEFAULT 'Viewer';

-- A unique email is required for login lookups; enforce it if not already.
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_email ON users(email);
