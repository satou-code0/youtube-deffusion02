# Supabase Edge Function 認証問題 トラブルシューティングガイド

## 📋 概要

YouTube記事ジェネレーターのSupabase Edge Function実装において、認証機能で発生した問題とその解決方法を詳細に記録したドキュメントです。

## 🚨 発生した問題

### 症状
- Webアプリケーションから Edge Function を呼び出すと **HTTP 401 Unauthorized** エラーが発生
- エラーメッセージ: `"Edge Function returned a non-2xx status code"`
- クライアントサイドではセッション情報は正常に取得できている

### エラーログ
```javascript
POST https://xladdkgeitntoepavmru.supabase.co/functions/v1/generate-articles 401 (Unauthorized)
FunctionsHttpError: Edge Function returned a non-2xx status code
```

## 🔍 問題の調査プロセス

### 1. セッション情報の確認
まず、クライアントサイドでセッション情報が正常に取得できているかを確認しました。

**デバッグ機能を追加:**
```typescript
export async function debugSessionInfo(): Promise<void> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  console.log('=== セッション情報 ===');
  console.log('Has Session:', !!session);
  console.log('User ID:', session.user.id);
  console.log('User Email:', session.user.email);
  console.log('Access Token (first 50 chars):', session.access_token.substring(0, 50) + '...');
  console.log('Expires At:', new Date(session.expires_at * 1000).toISOString());
}
```

**結果:** セッション情報は正常に取得できており、アクセストークンも有効期限内でした。

### 2. curlコマンドによる直接テスト
生成されたアクセストークンを使用してcurlで直接Edge Functionをテストしました。

**テストコマンド:**
```bash
curl -X POST 'https://xladdkgeitntoepavmru.supabase.co/functions/v1/generate-articles' \
  -H 'Authorization: Bearer [ACCESS_TOKEN]' \
  -H 'Content-Type: application/json' \
  -d '{"testMode": false, "message": "Hello from curl!"}'
```

**結果:** curlでも同様に401エラーが発生し、レスポンスは以下でした：
```json
{
  "error": "認証が必要です",
  "details": "Auth session missing!",
  "authErrorCode": 400
}
```

## 🎯 根本原因の特定

### 問題の原因
Edge Function内でのSupabaseクライアントの認証処理に問題がありました。

**問題のあったコード:**
```typescript
// ❌ 問題のあった実装
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: { Authorization: authHeader },
  },
});

const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
```

**問題点:**
1. **Anon Key使用**: Edge Function内でAnon Keyを使用してJWTトークンを検証しようとしていた
2. **セッション依存**: `getUser()`メソッドがセッション情報に依存していたが、Edge Function環境ではセッションが利用できない
3. **認証方式の不一致**: クライアントサイドとサーバーサイドで異なる認証方式を使用していた

## ✅ 解決方法

### 1. Service Role Keyの使用
Edge Function内では**Service Role Key**を使用してJWTトークンを直接検証するように変更しました。

**修正後のコード:**
```typescript
// ✅ 修正後の実装
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Service Role Keyを使用してクライアントを初期化
const supabaseClient = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });
```

### 2. JWTトークンの直接検証
セッションに依存せず、JWTトークンを直接検証するように変更しました。

```typescript
// ✅ JWTトークンの直接検証
if (supabaseServiceRoleKey) {
  // Service Role Keyを使用してJWTトークンを検証
  const jwt = authHeader.replace('Bearer ', '');
  const { data, error } = await supabaseClient.auth.getUser(jwt);
  user = data.user;
  authError = error;
} else {
  // フォールバック: 通常の方法
  const { data: { user: userData }, error } = await supabaseClient.auth.getUser();
  user = userData;
  authError = error;
}
```

### 3. 環境変数の確認
Service Role Keyが正しく設定されているかを確認するログを追加しました。

```typescript
console.log('Environment check:', {
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  hasServiceRoleKey: !!supabaseServiceRoleKey
});
```

## 🔧 実装の詳細

### Edge Function側の完全な認証処理
```typescript
// 環境変数取得
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// 認証ヘッダー確認
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(
    JSON.stringify({ error: '認証ヘッダーが必要です' }),
    { status: 401, headers: corsHeaders }
  );
}

// Supabaseクライアント初期化（Service Role Key優先）
const supabaseClient = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey)
  : createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

// JWTトークン検証
let user, authError;
if (supabaseServiceRoleKey) {
  const jwt = authHeader.replace('Bearer ', '');
  const { data, error } = await supabaseClient.auth.getUser(jwt);
  user = data.user;
  authError = error;
} else {
  const { data: { user: userData }, error } = await supabaseClient.auth.getUser();
  user = userData;
  authError = error;
}

// 認証結果確認
if (authError || !user) {
  return new Response(
    JSON.stringify({ 
      error: '認証が必要です', 
      details: authError?.message 
    }),
    { status: 401, headers: corsHeaders }
  );
}
```

### クライアント側の認証処理
```typescript
// セッション取得
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (!session) {
  throw new Error('認証が必要です。ログインしてください。');
}

// Edge Function呼び出し
const { data, error } = await supabase.functions.invoke('generate-articles', {
  body: { /* リクエストデータ */ },
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  },
});
```

## 📚 学んだポイント

### 1. Edge Function環境の特徴
- **セッションレス**: Edge Function環境ではブラウザセッションが利用できない
- **JWTトークン検証**: JWTトークンを直接検証する必要がある
- **Service Role Key**: サーバーサイドでの認証にはService Role Keyが推奨

### 2. 認証方式の使い分け
| 環境 | 使用するKey | 認証方式 |
|------|-------------|----------|
| クライアントサイド | Anon Key | セッションベース |
| Edge Function | Service Role Key | JWTトークン直接検証 |

### 3. デバッグ手法
- **段階的テスト**: 最小構成から段階的に機能を追加
- **ログ出力**: 各段階で詳細なログを出力
- **直接テスト**: curlコマンドでの直接テスト
- **セッション情報確認**: クライアントサイドでのセッション状態確認

## 🚀 解決後の動作確認

### 成功時のレスポンス
```json
{
  "success": true,
  "message": "認証成功！ユーザー情報を取得しました",
  "timestamp": "2025-06-15T09:08:53.472Z",
  "user": {
    "id": "c484e4c8-e8b0-4352-8a3c-800de66be6bc",
    "email": "test@test.com"
  },
  "receivedData": {
    "testMode": false,
    "message": "Hello from curl!",
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }
}
```

### テスト方法
1. **Webアプリケーション**: 「🔐 認証付きテスト」ボタンで確認
2. **curlコマンド**: 直接Edge Functionを呼び出して確認
3. **セッション情報**: 「🔍 セッション情報」ボタンでトークン状態を確認

## 🔮 今後の展開

この認証基盤が完成したことで、次の段階に進むことができます：

1. **第2段階**: ユーザーデータベース連携（利用回数管理、APIキー取得）
2. **第3段階**: YouTube API連携（動画情報・字幕取得）
3. **第4段階**: OpenAI API連携（記事生成）
4. **第5段階**: 利用回数インクリメント

## 📝 まとめ

**問題**: Edge Function内でのSupabase認証が失敗
**原因**: Anon Keyとセッションベース認証の使用
**解決**: Service Role KeyとJWTトークン直接検証への変更

この問題解決により、セキュアで信頼性の高いEdge Function認証システムが構築できました。初心者の方も、この手順に従うことで同様の問題を解決できるはずです。

---

**作成日**: 2025年6月15日  
**プロジェクト**: YouTube記事ジェネレーター  
**技術スタック**: Supabase Edge Functions, TypeScript, React 