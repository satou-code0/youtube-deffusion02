import React, { useState, useEffect } from 'react';
import { Settings, Youtube } from 'lucide-react';
import { UrlInput } from './components/UrlInput';
import { SettingsPanel } from './components/SettingsPanel';
import { VideoPreview } from './components/VideoPreview';
import { ArticleTabs } from './components/ArticleTabs';
import { ProgressIndicator } from './components/ProgressIndicator';
import { extractVideoId } from './utils/youtube';
import { VideoInfo, ArticleContent, ApiKeys, GenerationProgress, ArticleType, SavedArticle } from './types';
import AuthForm from './components/AuthForm';
import { supabase } from './utils/supabaseClient';
import { getCurrentUserStatus, getApiKeys } from './services/authService';
import { generateArticles } from './services/articleService';
import { createStripeCheckoutSession } from './services/stripeService';
import { PaymentSuccess } from './components/PaymentSuccess';
import { PaymentCancel } from './components/PaymentCancel';

function App() {
  const [url, setUrl] = useState('');
  const [apiKeys, setApiKeys] = useState<ApiKeys>({ openai: '', youtube: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [articleContent, setArticleContent] = useState<ArticleContent | null>(null);
  const [activeTab, setActiveTab] = useState<ArticleType>('blog');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [progress, setProgress] = useState<GenerationProgress>({ 
    step: 'idle', 
    progress: 0, 
    message: '' 
  });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userStatus, setUserStatus] = useState<{used_count: number|null, is_paid: boolean|null, error: string|null}>({used_count: null, is_paid: null, error: null});
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  // URLパラメータを確認して決済画面を表示
  const urlParams = new URLSearchParams(window.location.search);
  const isPaymentSuccess = window.location.pathname === '/success';
  const isPaymentCancel = window.location.pathname === '/cancel';
  const sessionId = urlParams.get('session_id');
  const shouldShowLogin = urlParams.get('login') === 'true';

  // APIキー取得
  const fetchApiKeys = async () => {
    const keys = await getApiKeys();
    if (!keys.error) {
      setApiKeys({ openai: keys.openai, youtube: keys.youtube });
      // Show settings if no API keys are configured
      if (!keys.openai || !keys.youtube) {
        setShowSettings(true);
      }
    }
  };

  // 認証状態の監視（Supabaseのauth状態を利用）
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      const wasAuthenticated = isAuthenticated;
      setIsAuthenticated(!!session?.user);
      
      if (session?.user) {
        fetchUserStatus();
        fetchApiKeys();
        // ログイン成功時にログイン画面を閉じる
        if (!wasAuthenticated) {
          setShowLogin(false);
          
          // 決済セッションIDがある場合は決済成功画面にリダイレクト
          const urlParams = new URLSearchParams(window.location.search);
          const pendingSessionId = urlParams.get('session_id');
          if (pendingSessionId) {
            // URLを決済成功画面に変更
            const newUrl = new URL(window.location.href);
            newUrl.pathname = '/success';
            newUrl.searchParams.set('session_id', pendingSessionId);
            newUrl.searchParams.delete('login');
            window.history.replaceState({}, '', newUrl.toString());
          }
        }
      }
    });
    
    // 初回ロード時の認証状態確認
    supabase.auth.getUser().then(({data}) => {
      setIsAuthenticated(!!data.user);
      if (data.user) {
        fetchUserStatus();
        fetchApiKeys();
      } else if (shouldShowLogin) {
        // URLパラメータでログインが要求されている場合
        setShowLogin(true);
      }
    });
    
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [isAuthenticated, shouldShowLogin]); // shouldShowLoginを依存配列に追加

  const handleApiKeysChange = (keys: ApiKeys) => {
    setApiKeys(keys);
    setError(''); // Clear any previous errors when API keys are updated
  };

  const fetchUserStatus = async () => {
    const status = await getCurrentUserStatus();
    setUserStatus(status);
    if (status.used_count !== null && !status.is_paid && status.used_count >= 3) {
      setShowUpgrade(true);
    } else {
      setShowUpgrade(false);
    }
  };

  const handleGenerateArticles = async () => {
    // 未ログインの場合はログイン画面を表示
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }
    
    // APIキーチェックは不要（サーバーサイドで管理）
    if (!userStatus.is_paid && userStatus.used_count !== null && userStatus.used_count >= 3) {
      setShowUpgrade(true);
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) return;

    setLoading(true);
    setError('');
    
    // プログレスを0%から開始
    setProgress({ step: 'analyzing', progress: 0, message: 'YouTube URLを解析中...' });

    try {
      // 段階的にプログレスを更新しながらAPI処理を実行
      setProgress({ step: 'analyzing', progress: 10, message: '動画情報を取得中...' });
      
      // 少し待機してからプログレス更新（視覚的な進行感を演出）
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress({ step: 'transcribing', progress: 20, message: '字幕を取得中...' });
      
      await new Promise(resolve => setTimeout(resolve, 500));
      setProgress({ step: 'generating-blog', progress: 30, message: 'ブログ記事を生成中...' });
      
      // 実際のAPI処理を開始
      const result = await generateArticles(url);
      
      // API処理完了後、残りのプログレスを更新
      setProgress({ step: 'generating-instagram', progress: 70, message: 'Instagram投稿を生成中...' });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setProgress({ step: 'generating-twitter', progress: 85, message: 'X投稿を生成中...' });
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // 結果を設定
      setVideoInfo(result.data.videoInfo);
      setArticleContent(result.data.articles);
      setProgress({ step: 'complete', progress: 100, message: '記事生成が完了しました！' });

      // UI即時反映
      await fetchUserStatus();

      // Auto-hide progress after a delay
      setTimeout(() => {
        setProgress({ step: 'idle', progress: 0, message: '' });
      }, 2000);

    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : '記事生成中にエラーが発生しました';
      setError(errorMessage);
      setProgress({ step: 'idle', progress: 0, message: '' });
      
      // APIキー未設定エラーの場合は設定画面を開く
      if (errorMessage.includes('APIキーが設定されていません')) {
        setShowSettings(true);
      }
    }

    setLoading(false);
  };

  // 有料プラン購入処理
  const handlePurchasePremium = async () => {
    try {
      setLoading(true);
      await createStripeCheckoutSession();
    } catch (error) {
      console.error('Purchase failed:', error);
      const errorMessage = error instanceof Error ? error.message : '決済処理でエラーが発生しました';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ログイン画面表示
  if (showLogin) {
    return <AuthForm onBack={() => setShowLogin(false)} />;
  }

  // 決済成功画面
  if (isPaymentSuccess && sessionId) {
    return (
      <PaymentSuccess 
        sessionId={sessionId} 
        onBackToHome={() => {
          window.history.pushState({}, '', '/');
          window.location.reload();
        }} 
      />
    );
  }

  // 決済キャンセル画面
  if (isPaymentCancel) {
    return (
      <PaymentCancel 
        onBackToHome={() => {
          window.history.pushState({}, '', '/');
          window.location.reload();
        }}
        onRetryPayment={handlePurchasePremium}
      />
    );
  }

  if (showUpgrade) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header - ナビゲーション表示 */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-youtube-red to-red-600 rounded-xl flex items-center justify-center">
                  <Youtube className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold gradient-text">
                    YouTube記事ジェネレーター
                  </h1>
                  <p className="text-sm text-gray-600">
                    YouTube動画から3種類の記事を自動生成
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* 利用回数表示 */}
                {isAuthenticated && userStatus.used_count !== null && (
                  <div className="text-sm text-gray-600">
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-medium">
                      利用回数: {userStatus.used_count}/3 (上限達成)
                    </span>
                  </div>
                )}
                {/* 設定ボタン（ログイン時のみ表示） */}
                {isAuthenticated && (
                  <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                    title="API設定"
                  >
                    <Settings className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold mb-4 text-youtube-red">無料利用回数の上限に達しました</h2>
                <p className="text-gray-600 mb-6">
                  無料会員は記事生成を3回までご利用いただけます。<br/>
                  無制限でご利用いただくには有料プランへのアップグレードが必要です。
                </p>
              </div>
              
              <div className="space-y-3">
                <button 
                  onClick={handlePurchasePremium}
                  className="w-full bg-gradient-to-r from-youtube-red to-pink-600 text-white px-6 py-3 rounded-lg font-bold text-lg hover:from-red-600 hover:to-pink-700 transition-all"
                >
                  有料プランを購入
                </button>
                
                <button 
                  onClick={() => setShowUpgrade(false)}
                  className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  トップページに戻る
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Settings Panel */}
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          keys={apiKeys}
          onKeysChange={handleApiKeysChange}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-youtube-red to-red-600 rounded-xl flex items-center justify-center">
                <Youtube className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold gradient-text">
                  YouTube記事ジェネレーター
                </h1>
                <p className="text-sm text-gray-600">
                  YouTube動画から3種類の記事を自動生成
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* 利用回数表示 */}
              {isAuthenticated && userStatus.used_count !== null && (
                <div className="text-sm text-gray-600">
                  {userStatus.is_paid ? (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium">
                      有料会員（無制限）
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                      利用回数: {userStatus.used_count}/3
                    </span>
                  )}
                </div>
              )}
              {/* 未ログイン時のログインボタン */}
              {!isAuthenticated && (
                <button
                  onClick={() => setShowLogin(true)}
                  className="bg-youtube-red text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors"
                >
                  ログイン
                </button>
              )}
              {/* 設定ボタン（ログイン時のみ表示） */}
              {isAuthenticated && (
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
                  title="API設定"
                >
                  <Settings className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* URL Input */}
        <div className="mb-8">
          <UrlInput
            value={url}
            onChange={setUrl}
            onSubmit={handleGenerateArticles}
            loading={loading}
          />
          {/* 未ログイン時の案内 */}
          {!isAuthenticated && (
            <div className="mt-4 text-center">
              <p className="text-gray-600 text-sm">
                記事生成にはログインが必要です。上記ボタンをクリックするとログイン画面に移動します。
              </p>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  エラーが発生しました
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setShowSettings(true)}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200 transition-colors"
                  >
                    API設定を確認
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <ProgressIndicator progress={progress} />

        {/* Video Preview */}
        {videoInfo && (
          <div className="mb-8">
            <VideoPreview videoInfo={videoInfo} videoUrl={url} />
          </div>
        )}

        {/* Article Tabs */}
        {articleContent && (
                      <ArticleTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              content={articleContent}
              loading={loading}
            />
        )}
      </main>

      {/* Settings Panel */}
              <SettingsPanel
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          keys={apiKeys}
          onKeysChange={handleApiKeysChange}
        />
    </div>
  );
}

export default App;