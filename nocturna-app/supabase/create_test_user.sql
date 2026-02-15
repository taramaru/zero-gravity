-- =====================================================
-- NOCTURNA — テストユーザー作成（メール送信完全バイパス）
-- Supabase SQL Editor で実行する
-- =====================================================

-- pgcrypto拡張の有効化（既に有効なら無害）
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- テスト用RPC関数: メール送信ゼロでユーザー+エージェントを一括作成
CREATE OR REPLACE FUNCTION create_nocturna_user(
  user_email TEXT,
  user_password TEXT,
  user_codename TEXT
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  hashed_password TEXT;
BEGIN
  -- パスワードハッシュ生成（extensions スキーマの pgcrypto を使用）
  hashed_password := extensions.crypt(user_password, extensions.gen_salt('bf'));

  -- auth.users に直接INSERT（GoTrueバイパス、メール送信なし）
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    aud,
    role,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    hashed_password,
    now(),
    'authenticated',
    'authenticated',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('codename', user_codename),
    now(),
    now()
  );

  -- auth.identities に必須レコード作成
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    created_at,
    updated_at,
    last_sign_in_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    new_user_id::text,
    'email',
    jsonb_build_object('sub', new_user_id::text, 'email', user_email, 'email_verified', true),
    now(),
    now(),
    now()
  );

  -- agents レコード作成
  INSERT INTO agents (id, codename)
  VALUES (new_user_id, user_codename)
  ON CONFLICT (id) DO NOTHING;

  RETURN new_user_id;
END;
$$;

-- =====================================================
-- テストユーザー作成
-- =====================================================
SELECT create_nocturna_user(
  'test@nocturna.io',
  'password123',
  'ZERO'
);
