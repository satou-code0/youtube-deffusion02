# YouTube記事ジェネレーター - Supabase設定手順書

## 概要
このドキュメントは、YouTube記事ジェネレーターを新しいSupabaseプロジェクトにデプロイする際の設定手順を説明します。

## 前提条件
- Supabase CLI がインストールされていること
- Node.js 18以上がインストールされていること
- Stripe アカウントが作成済みであること
- OpenAI API キーが取得済みであること
- YouTube Data API v3 キーが取得済みであること

## 1. Supabaseプロジェクトの作成

### 1.1 新しいプロジェクトを作成
1. [Supabase Dashboard](https://supabase.com/dashboard) にアクセス
2. "New project" をクリック
3. プロジェクト名、データベースパスワードを設定
4. リージョンを選択（推奨: Asia Northeast (Tokyo)）
5. プロジェクトが作成されるまで待機（約2分）

### 1.2 プロジェクト情報の取得
作成後、以下の情報を控えておく：
- Project URL
- Project ID
- API Keys (anon/public, service_role)

## 2. ローカル環境の設定

### 2.1 Supabase CLI でログイン
```bash
supabase login
```

### 2.2 プロジェクトとリンク
```bash
supabase link --project-ref YOUR_PROJECT_ID
```

## 3. データベースの設定

### 3.1 一発セットアップSQL（推奨）
```bash
# 現在の構成を完全に再現する一発セットアップ
supabase sql --file database_setup.sql
```

このSQLファイルには以下がすべて含まれています：
- `users` テーブル作成（9カラム）
- インデックス作成（4個）
- `increment_used_count` 関数
- RLSポリシー設定（3個）
- 権限設定
- コメント・ドキュメント

## 4. Edge Functions のデプロイ

### 4.1 全Edge Functionsをデプロイ
```bash
# 全ての関数を一括デプロイ
supabase functions deploy

# または個別にデプロイ
supabase functions deploy generate-articles
supabase functions deploy create-checkout-session
supabase functions deploy stripe-webhook
supabase functions deploy handle-payment-success
```

## 5. 環境変数の設定

### 5.1 Supabase Secrets の設定
```bash

# Stripe Keys
supabase secrets set STRIPE_SECRET_KEY=xxx
supabase secrets set STRIPE_PUBLISHABLE_KEY=xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=xxx

# Supabase Service Role Key (Edge Functions用)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx
```

## 6. Stripe Webhook の設定

### 6.1 Webhook エンドポイントの追加
1. [Stripe Dashboard](https://dashboard.stripe.com/) にログイン
2. "Developers" → "Webhooks" に移動
3. "Add endpoint" をクリック
4. エンドポイントURL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
5. 以下のイベントを選択：
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`

### 6.2 Webhook Secret の取得
1. 作成したWebhookをクリック
2. "Signing secret" をコピー
3. 上記の環境変数設定で `STRIPE_WEBHOOK_SECRET` に設定

## 7. フロントエンド環境変数の設定

### 7.1 .env ファイルの作成
```bash
# プロジェクトルートに .env ファイルを作成
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```


## 9. デプロイ後の確認

### 9.1 Edge Functions の動作確認
```bash
# 各関数のログを確認
supabase functions logs generate-articles
supabase functions logs create-checkout-session
supabase functions logs stripe-webhook
supabase functions logs handle-payment-success
```

### 9.2 データベース接続確認
```bash
# データベースに接続してテーブル確認
supabase db connect
\dt  -- テーブル一覧表示
```


## 11. セキュリティチェックリスト

- [ ] RLS ポリシーが正しく設定されている
- [ ] Service Role Key が適切に保護されている
- [ ] Stripe Webhook Secret が正しく設定されている
- [ ] 本番環境でのデバッグログが無効化されている
- [ ] CORS 設定が適切に行われている

## 12. 本番環境での推奨設定

### 12.1 パフォーマンス最適化
- データベースインデックスの確認
- Edge Functions のメモリ制限設定
- API レート制限の設定

### 12.2 監視設定
- Supabase Dashboard でのメトリクス監視
- Edge Functions のエラーログ監視
- Stripe Dashboard での決済監視

---

## 設定完了後の確認項目

1. ✅ ユーザー登録・ログインが正常に動作する
2. ✅ YouTube URL から記事生成が正常に動作する
3. ✅ 無料利用回数制限が正常に動作する
4. ✅ Stripe決済が正常に動作する
5. ✅ 決済完了後に有料プランに切り替わる
6. ✅ Webhook が正常に受信される

すべての項目が確認できれば、デプロイ完了です！ 

## 📋 納品時のSupabase設定 - 完全ガイド

### 🎯 **最も簡単な設定方法**

**1. 自動デプロイスクリプト使用（推奨）**
```bash
# 1回のコマンドでデプロイ
./deploy.sh YOUR_PROJECT_ID
```

**2. 環境変数設定**
```bash
# Supabase Secrets（サーバーサイド）
supabase secrets set STRIPE_SECRET_KEY=xxx
supabase secrets set STRIPE_PUBLISHABLE_KEY=xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=xxx
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=xxx

# フロントエンド環境変数
cp env.example .env
# .envファイルを編集して実際の値を設定
```

### 🔧 **Stripe設定（おっしゃる通り、これだけです）**

**1. Webhook設定**
- URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/stripe-webhook`
- イベント: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`

**2. APIキー設定**
- Secret Key → Supabase Secrets
- Publishable Key → フロントエンド .env
- Webhook Secret → Supabase Secrets

### 📁 **作成したファイル**

1. **`DEPLOYMENT_GUIDE.md`** - 詳細な設定手順書（12セクション）
2. **`deploy.sh`** - 自動デプロイスクリプト
3. **`env.example`** - 環境変数テンプレート

### ⚡ **設定の特徴**

- **自動化**: 1コマンドでデータベース + Edge Functions デプロイ
- **セキュア**: APIキーはすべてサーバーサイドで管理
- **シンプル**: 必要最小限の設定のみ
- **エラーハンドリング**: 詳細なトラブルシューティングガイド付き

### 🎉 **納品時の手順（超簡単版）**

```bash
# 1. プロジェクト作成（Supabase Dashboard）
# 2. 自動デプロイ
./deploy.sh YOUR_PROJECT_ID

# 3. 環境変数設定（5分）
supabase secrets set OPENAI_API_KEY=xxx
supabase secrets set YOUTUBE_API_KEY=xxx
supabase secrets set STRIPE_SECRET_KEY=xxx
# ... 他のキー

# 4. Stripe Webhook設定（2分）
# 5. フロントエンド .env 作成（1分）
# 6. 完了！ 