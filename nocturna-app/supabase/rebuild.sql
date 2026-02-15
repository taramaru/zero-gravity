-- =====================================================
-- NOCTURNA — 完全リセット & 再構築（トリガーなし版）
-- Supabase SQL Editor で実行する（1ファイルで完結）
--
-- ⚠ 既存データは全て削除される
-- ⚠ トリガーは使わない。agents作成はAPIルートで行う。
-- =====================================================

-- STEP 0: 完全クリーンアップ
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.increment_respect_count(UUID);
DROP FUNCTION IF EXISTS public.decrement_respect_count(UUID);
DROP TABLE IF EXISTS respects CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- auth.users の壊れたレコードを全削除
DELETE FROM auth.users;

-- =============================================
-- STEP 1: agents テーブル（FK無し）
-- =============================================
CREATE TABLE agents (
  id UUID PRIMARY KEY,
  codename TEXT NOT NULL UNIQUE,
  rank TEXT NOT NULL DEFAULT 'ROOKIE WALKER',
  total_xp BIGINT NOT NULL DEFAULT 0,
  main_sector TEXT NOT NULL DEFAULT 'UNKNOWN',
  agent_class TEXT NOT NULL DEFAULT 'UNCLASSED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agents_select_all"
  ON agents FOR SELECT USING (true);

-- INSERTはservice_role（APIルート）から実行するのでRLSバイパス
-- ただし万が一の直接INSERT用にも許可
CREATE POLICY "agents_insert_any"
  ON agents FOR INSERT WITH CHECK (true);

CREATE POLICY "agents_update_own"
  ON agents FOR UPDATE USING (auth.uid() = id);

-- =============================================
-- STEP 2: transactions テーブル
-- =============================================
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  sector TEXT NOT NULL,
  vendor TEXT,
  cast_alias TEXT,
  investment BIGINT NOT NULL CHECK (investment > 0),
  grade TEXT NOT NULL DEFAULT 'B',
  tags TEXT[] DEFAULT '{}',
  private_note TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  xp_earned BIGINT NOT NULL DEFAULT 0,
  respect_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tx_crud_own"
  ON transactions FOR ALL USING (auth.uid() = agent_id);

CREATE POLICY "tx_select_public"
  ON transactions FOR SELECT USING (is_public = true);

-- =============================================
-- STEP 3: respects テーブル
-- =============================================
CREATE TABLE respects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  from_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(transaction_id, from_agent_id)
);

ALTER TABLE respects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "respects_insert_own"
  ON respects FOR INSERT WITH CHECK (auth.uid() = from_agent_id);

CREATE POLICY "respects_select_all"
  ON respects FOR SELECT USING (true);

-- =============================================
-- STEP 4: インデックス
-- =============================================
CREATE INDEX idx_agents_xp ON agents(total_xp DESC);
CREATE INDEX idx_tx_agent ON transactions(agent_id);
CREATE INDEX idx_tx_date ON transactions(transaction_date DESC);
CREATE INDEX idx_tx_sector ON transactions(sector);
CREATE INDEX idx_tx_public ON transactions(is_public) WHERE is_public = true;
CREATE INDEX idx_respects_tx ON respects(transaction_id);
CREATE INDEX idx_respects_from ON respects(from_agent_id);

-- =============================================
-- STEP 5: RPC関数（Respect用）
-- =============================================
CREATE OR REPLACE FUNCTION increment_respect_count(target_transaction_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE transactions SET respect_count = respect_count + 1
  WHERE id = target_transaction_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrement_respect_count(target_transaction_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE transactions SET respect_count = GREATEST(respect_count - 1, 0)
  WHERE id = target_transaction_id;
END;
$$;

-- =============================================
-- 完了
-- =============================================
DO $$ BEGIN RAISE NOTICE '✅ NOCTURNA DB rebuild complete (no triggers). Use API route for user registration.'; END $$;
