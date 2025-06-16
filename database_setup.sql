-- =====================================================
-- YouTube記事ジェネレーター - データベース完全セットアップSQL
-- =====================================================
-- このファイル1つで現在の構成を完全に再現できます
-- 実行方法: Supabase SQL Editor で実行、またはマイグレーションとして適用

-- =====================================================
-- 1. usersテーブルの作成
-- =====================================================

-- 既存テーブルがある場合は削除（開発環境のみ）
-- DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE IF NOT EXISTS users (
    -- 基本フィールド
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- APIキー管理（現在は使用していないが、互換性のため保持）
    openai_api_key TEXT,
    youtube_api_key TEXT,
    
    -- 利用制限管理
    used_count INTEGER NOT NULL DEFAULT 0,
    is_paid BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Stripe決済管理
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT
);

-- =====================================================
-- 2. インデックスの作成
-- =====================================================

-- 基本インデックス（自動作成されるもの）
-- CREATE UNIQUE INDEX IF NOT EXISTS users_pkey ON users USING btree (id);
-- CREATE UNIQUE INDEX IF NOT EXISTS users_email_key ON users USING btree (email);

-- Stripe関連のパフォーマンス向上インデックス
CREATE INDEX IF NOT EXISTS idx_users_stripe_customer_id ON users USING btree (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_stripe_subscription_id ON users USING btree (stripe_subscription_id);

-- =====================================================
-- 3. コメントの追加（ドキュメント化）
-- =====================================================

COMMENT ON TABLE users IS 'ユーザー情報とStripe決済情報を管理するテーブル';
COMMENT ON COLUMN users.id IS 'ユーザーの一意識別子（UUID）';
COMMENT ON COLUMN users.email IS 'ユーザーのメールアドレス（認証用）';
COMMENT ON COLUMN users.openai_api_key IS 'OpenAI APIキー（現在はサーバーサイドで管理）';
COMMENT ON COLUMN users.youtube_api_key IS 'YouTube APIキー（現在はサーバーサイドで管理）';
COMMENT ON COLUMN users.used_count IS '無料プランでの記事生成利用回数（上限3回）';
COMMENT ON COLUMN users.is_paid IS '有料プラン加入状態（TRUE=有料会員）';
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for payment processing';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Stripe subscription ID for recurring payments';
COMMENT ON COLUMN users.created_at IS 'ユーザー作成日時';

-- =====================================================
-- 4. 利用回数増加関数の作成
-- =====================================================

CREATE OR REPLACE FUNCTION increment_used_count(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 利用回数を1増加
    UPDATE users 
    SET used_count = used_count + 1
    WHERE id = user_id;
    
    -- ユーザーが存在しない場合はエラー
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found: %', user_id;
    END IF;
END;
$$;

-- 関数にコメント追加
COMMENT ON FUNCTION increment_used_count(UUID) IS '指定ユーザーの記事生成利用回数を1増加させる関数';

-- =====================================================
-- 5. RLS (Row Level Security) の設定
-- =====================================================

-- RLSを有効化
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のレコードのみ参照可能
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- ユーザーは自分のレコードのみ更新可能
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- 新規ユーザー登録時の挿入を許可
CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- =====================================================
-- 6. 権限設定
-- =====================================================

-- 認証済みユーザーに基本権限を付与
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- 匿名ユーザーには権限なし（RLSで制御）
REVOKE ALL ON users FROM anon;

-- サービスロールには全権限（Edge Functions用）
GRANT ALL ON users TO service_role;

-- =====================================================
-- 7. 初期データ（オプション）
-- =====================================================

-- テスト用ユーザーデータ（開発環境のみ）
-- INSERT INTO users (id, email, used_count, is_paid) VALUES 
-- ('00000000-0000-0000-0000-000000000001', 'test@example.com', 0, FALSE)
-- ON CONFLICT (email) DO NOTHING;

-- =====================================================
-- 8. 設定確認クエリ
-- =====================================================

-- 以下のクエリで設定が正しく適用されているか確認できます：

/*
-- テーブル構造確認
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- インデックス確認
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'users' AND schemaname = 'public';

-- RLSポリシー確認
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'users' AND schemaname = 'public';

-- 関数確認
SELECT proname, pg_get_function_arguments(oid) as args, prosrc 
FROM pg_proc 
WHERE proname = 'increment_used_count';
*/

-- =====================================================
-- セットアップ完了
-- =====================================================

-- 成功メッセージ
DO $$
BEGIN
    RAISE NOTICE '✅ YouTube記事ジェネレーター データベースセットアップが完了しました！';
    RAISE NOTICE '📋 作成されたオブジェクト:';
    RAISE NOTICE '   - users テーブル（9カラム）';
    RAISE NOTICE '   - インデックス（4個）';
    RAISE NOTICE '   - increment_used_count 関数';
    RAISE NOTICE '   - RLSポリシー（3個）';
    RAISE NOTICE '🔐 セキュリティ: RLS有効、適切な権限設定済み';
    RAISE NOTICE '🚀 次のステップ: Edge Functions のデプロイ';
END $$; 