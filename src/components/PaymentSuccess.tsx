import React, { useEffect, useState } from 'react';
import { CheckCircle, Home, LogIn } from 'lucide-react';
import { handlePaymentSuccess } from '../services/stripeService';
import { supabase } from '../utils/supabaseClient';

interface PaymentSuccessProps {
  sessionId: string;
  onBackToHome: () => void;
}

export const PaymentSuccess: React.FC<PaymentSuccessProps> = ({ sessionId, onBackToHome }) => {
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthError, setIsAuthError] = useState(false);

  useEffect(() => {
    const processPayment = async () => {
      try {
        // まず認証状態を確認
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('認証エラー:', sessionError);
          setIsAuthError(true);
          setError('ログインが必要です。再度ログインしてから決済を確認してください。');
          setProcessing(false);
          return;
        }

        console.log('✅ User authenticated, processing payment success...');
        await handlePaymentSuccess(sessionId);
        setProcessing(false);
      } catch (error) {
        console.error('Payment processing error:', error);
        const errorMessage = error instanceof Error ? error.message : '決済処理でエラーが発生しました';
        
        // 認証エラーかどうかを判定
        if (errorMessage.includes('認証') || errorMessage.includes('Authentication')) {
          setIsAuthError(true);
        }
        
        setError(errorMessage);
        setProcessing(false);
      }
    };

    if (sessionId) {
      processPayment();
    }
  }, [sessionId]);

  const handleLogin = () => {
    // ログイン画面にリダイレクト（セッションIDを保持）
    const currentUrl = new URL(window.location.href);
    currentUrl.pathname = '/';
    currentUrl.searchParams.set('login', 'true');
    currentUrl.searchParams.set('session_id', sessionId);
    window.location.href = currentUrl.toString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
        {processing ? (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-green-600">決済処理中...</h2>
            <p className="text-gray-600 mb-6">
              決済の確認を行っています。しばらくお待ちください。
            </p>
          </>
        ) : error ? (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-4 text-red-600">
              {isAuthError ? 'ログインが必要です' : '決済処理エラー'}
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <div className="space-y-3">
              {isAuthError ? (
                <button
                  onClick={handleLogin}
                  className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-all flex items-center justify-center space-x-2"
                >
                  <LogIn className="w-5 h-5" />
                  <span>ログインして決済を確認</span>
                </button>
              ) : (
                <button
                  onClick={onBackToHome}
                  className="w-full bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 transition-all flex items-center justify-center space-x-2"
                >
                  <Home className="w-5 h-5" />
                  <span>ホームに戻る</span>
                </button>
              )}
              <button
                onClick={onBackToHome}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-300 transition-all flex items-center justify-center space-x-2"
              >
                <Home className="w-5 h-5" />
                <span>ホームに戻る</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-4 text-green-600">決済完了！</h2>
            <p className="text-gray-600 mb-6">
              有料プランへのアップグレードが完了しました。<br/>
              これで無制限に記事生成をご利用いただけます。
            </p>
            <button
              onClick={onBackToHome}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-all flex items-center justify-center space-x-2"
            >
              <Home className="w-5 h-5" />
              <span>記事生成を開始</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}; 