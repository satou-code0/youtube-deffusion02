# プロジェクト概要

## 現状の機能
- YouTube動画URLを入力し、OpenAI APIとYouTube Data APIを用いて
  - ブログ記事
  - Instagram投稿文
  - X（Twitter）投稿文
  の3種類の記事を自動生成するWebアプリ
- ユーザーは自身のOpenAI APIキー・YouTube APIキーをローカルストレージに保存して利用
- UIはReact（Vite）+ Tailwind CSS
- 記事やAPIキーの保存はローカルストレージのみ
- 認証・課金・会員管理機能は未実装

## 新しい利用フロー
- 会員登録（メール認証）
- 無料会員は「記事生成機能」を3回まで利用可能
- 3回を超えると有料プラン購入を案内
- 有料プラン購入後は無制限で記事生成機能を利用可能
- バックエンドにはSupabase Edge Functionを利用

## 技術スタック
- フロントエンド: React, Vite, TypeScript, Tailwind CSS
- API連携: OpenAI, YouTube Data API
- 状態管理: useState, useEffect（React標準）
- ストレージ: Supabase管理
- バックエンド: Supabase Edge Function
- Lint/Format: ESLint, Prettier
- テスト: 未導入

## データベース設計（シンプル構成例）
- usersテーブル
  - id（UUID, PK）
  - email
  - openai_api_key（暗号化保存）
  - youtube_api_key（暗号化保存）
  - used_count
  - is_paid（有料会員フラグ, boolean）
  - created_at

## 今後の構成方針
- Supabaseによるユーザー認証・会員管理
- Stripeによる有料プラン決済
- 有料会員のみが記事生成機能を利用可能に
- APIキーはユーザーごとに安全に保存・管理（Supabase DBで暗号化保存）
- 利用履歴や生成記事の保存もSupabaseで管理

// 変更内容解説：
// ・ユーザーごとのOpenAI APIキーとYouTube APIキーもSupabase上に保存する設計を追記
// ・api_keysテーブルをデータベース設計例に追加
// ・APIキーの安全な管理方針を明記
// ・利用フローを「無料3回→有料無制限」に変更し、Supabase Edge Function利用を明記
// ・シンプルなDB設計例（usersのみで対応）
// ・今後の構成方針は大枠を維持しつつ、上記フローに沿うよう微修正 