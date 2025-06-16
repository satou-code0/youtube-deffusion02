#!/bin/bash

# YouTube記事ジェネレーター - 自動デプロイスクリプト
# 使用方法: ./deploy.sh [PROJECT_ID]

set -e  # エラー時に停止

# 色付きログ用の関数
log_info() {
    echo -e "\033[32m[INFO]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $1"
}

# プロジェクトIDの確認
if [ -z "$1" ]; then
    log_error "プロジェクトIDを指定してください"
    echo "使用方法: ./deploy.sh YOUR_PROJECT_ID"
    exit 1
fi

PROJECT_ID=$1
log_info "プロジェクトID: $PROJECT_ID でデプロイを開始します"

# Supabase CLIの確認
if ! command -v supabase &> /dev/null; then
    log_error "Supabase CLI がインストールされていません"
    echo "インストール方法: https://supabase.com/docs/guides/cli"
    exit 1
fi

# ログイン確認
log_info "Supabase ログイン状態を確認中..."
if ! supabase projects list &> /dev/null; then
    log_warn "Supabase にログインしていません"
    log_info "ログインを実行します..."
    supabase login
fi

# プロジェクトリンク
log_info "プロジェクトとリンク中..."
supabase link --project-ref $PROJECT_ID

# データベースセットアップ
log_info "データベースセットアップを実行中..."
log_info "オプション1: 一発セットアップSQL使用"
echo "  supabase sql --file database_setup.sql"
log_info "オプション2: 既存マイグレーション使用"
echo "  supabase db push"
log_warn "どちらかを選択して実行してください（推奨: オプション1）"

# 既存マイグレーションを使用する場合
# supabase db push

# 一発セットアップSQLを使用する場合（推奨）
if [ -f "database_setup.sql" ]; then
    log_info "一発セットアップSQLを実行します..."
    supabase sql --file database_setup.sql
else
    log_warn "database_setup.sql が見つかりません。既存マイグレーションを使用します..."
    supabase db push
fi

# Edge Functions デプロイ
log_info "Edge Functions をデプロイ中..."
supabase functions deploy generate-articles
supabase functions deploy create-checkout-session  
supabase functions deploy stripe-webhook
supabase functions deploy handle-payment-success

log_info "✅ デプロイが完了しました！"
echo ""
log_warn "次の手順を忘れずに実行してください："
echo "1. 環境変数の設定 (DEPLOYMENT_GUIDE.md の「5. 環境変数の設定」を参照)"
echo "2. Stripe Webhook の設定 (DEPLOYMENT_GUIDE.md の「6. Stripe Webhook の設定」を参照)"
echo "3. フロントエンド .env ファイルの作成"
echo "4. 動作確認テスト"
echo ""
log_info "詳細な手順は DEPLOYMENT_GUIDE.md を参照してください" 