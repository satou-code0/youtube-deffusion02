import React, { useState } from 'react';
import { signUpWithEmail, signInWithEmail, signOut } from '../services/authService';

// 認証フォームコンポーネント
// サインアップ・サインイン切替、バリデーション、認証状態で表示切替
interface AuthFormProps {
  onBack?: () => void; // 戻るボタン用のコールバック（オプション）
}

const AuthForm: React.FC<AuthFormProps> = ({ onBack }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false); // サインアップ成功フラグ

  // 入力バリデーション
  const validate = () => {
    if (!email || !password) return 'メールアドレスとパスワードを入力してください';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return '正しいメールアドレスを入力してください';
    if (password.length < 6) return 'パスワードは6文字以上で入力してください';
    return null;
  };

  // サインアップ/サインイン処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setLoading(true);
    if (mode === 'signup') {
      const { data, error } = await signUpWithEmail(email, password);
      if (error) {
        setError(error.message);
      } else {
        setSignupSuccess(true); // サインアップ成功
      }
    } else {
      const { data, error } = await signInWithEmail(email, password);
      if (error) {
        setError(error.message);
      }
    }
    setLoading(false);
  };

  // サインアウト処理を削除
  // const handleSignOut = async () => {
  //   setLoading(true);
  //   await signOut();
  //   setUser(null);
  //   setLoading(false);
  // };

  // サインアップ成功時の表示
  if (signupSuccess) {
    return (
      <div className="p-4 border rounded bg-white max-w-md mx-auto mt-8">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">登録完了</h2>
          <p className="text-gray-600 mb-4">
            確認メールを送信しました。<br/>
            メール内のリンクをクリックして認証を完了してください。
          </p>
          <button
            onClick={() => {
              setSignupSuccess(false);
              setMode('signin');
            }}
            className="text-blue-500 underline"
          >
            ログイン画面に戻る
          </button>
        </div>
      </div>
    );
  }

  // サインイン/サインアップフォーム
  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 border rounded bg-white max-w-md mx-auto mt-8 flex flex-col gap-4"
    >
      {/* 戻るボタン */}
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="self-start text-gray-600 hover:text-gray-800 mb-2"
        >
          ← トップページに戻る
        </button>
      )}
      
      <h2 className="text-xl font-bold mb-2 text-center">
        {mode === 'signup' ? '新規登録' : 'ログイン'}
      </h2>
      <input
        type="email"
        placeholder="メールアドレス"
        value={email}
        onChange={e => setEmail(e.target.value)}
        className="border px-3 py-2 rounded"
        autoComplete="email"
      />
      <input
        type="password"
        placeholder="パスワード（6文字以上）"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="border px-3 py-2 rounded"
        autoComplete="current-password"
      />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button
        type="submit"
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        disabled={loading}
      >
        {loading ? '処理中...' : mode === 'signup' ? '新規登録' : 'ログイン'}
      </button>
      <div className="text-center text-sm">
        {mode === 'signup' ? (
          <>
            アカウントをお持ちの方は{' '}
            <button
              type="button"
              className="text-blue-500 underline"
              onClick={() => setMode('signin')}
            >
              ログイン
            </button>
          </>
        ) : (
          <>
            アカウントをお持ちでない方は{' '}
            <button
              type="button"
              className="text-blue-500 underline"
              onClick={() => setMode('signup')}
            >
              新規登録
            </button>
          </>
        )}
      </div>
    </form>
  );
};

export default AuthForm;

// ---
// 変更内容解説：
// - Supabaseメール認証に対応したサインアップ/サインインフォームを実装
// - Tailwind CSSでスタイリング、バリデーション付き
// - 認証状態で表示を切り替え、サインアウトも可能
// - 各処理に用途説明コメントを付与 