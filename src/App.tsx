import React, { useState, useEffect } from 'react';
import { Settings, Youtube } from 'lucide-react';
import { UrlInput } from './components/UrlInput';
import { SettingsPanel } from './components/SettingsPanel';
import { VideoPreview } from './components/VideoPreview';
import { ArticleTabs } from './components/ArticleTabs';
import { ProgressIndicator } from './components/ProgressIndicator';
import { YouTubeApiService } from './services/youtubeApi';
import { OpenAIApiService } from './services/openaiApi';
import { extractVideoId } from './utils/youtube';
import { loadApiKeys, saveArticle } from './utils/storage';
import { VideoInfo, ArticleContent, ApiKeys, GenerationProgress, ArticleType, SavedArticle } from './types';

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

  useEffect(() => {
    const keys = loadApiKeys();
    setApiKeys(keys);
    
    // Show settings if no API keys are configured
    if (!keys.openai || !keys.youtube) {
      setShowSettings(true);
    }
  }, []);

  const handleApiKeysSave = (keys: ApiKeys) => {
    setApiKeys(keys);
    setError(''); // Clear any previous errors when API keys are updated
  };

  const handleGenerateArticles = async () => {
    if (!apiKeys.openai || !apiKeys.youtube) {
      setShowSettings(true);
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) return;

    setLoading(true);
    setError('');
    setProgress({ step: 'analyzing', progress: 20, message: 'YouTube URLを解析中...' });

    try {
      // Initialize services
      const youtubeService = new YouTubeApiService(apiKeys.youtube);
      const openaiService = new OpenAIApiService(apiKeys.openai);

      // Get video info
      setProgress({ step: 'analyzing', progress: 30, message: '動画情報を取得中...' });
      const videoData = await youtubeService.getVideoInfo(videoId);
      setVideoInfo(videoData);

      // Get transcript
      setProgress({ step: 'transcribing', progress: 40, message: '字幕を取得中...' });
      const transcript = await youtubeService.getTranscript(videoId);

      // Generate articles
      setProgress({ step: 'generating-blog', progress: 50, message: 'ブログ記事を生成中...' });
      const blogArticle = await openaiService.generateBlogArticle(videoData, transcript, url);

      setProgress({ step: 'generating-instagram', progress: 70, message: 'Instagram投稿を生成中...' });
      const instagramPost = await openaiService.generateInstagramPost(videoData, transcript, url);

      setProgress({ step: 'generating-twitter', progress: 90, message: 'X投稿を生成中...' });
      const twitterPost = await openaiService.generateTwitterPost(videoData, transcript, url);

      const content: ArticleContent = {
        blog: blogArticle,
        instagram: instagramPost,
        twitter: twitterPost,
      };

      setArticleContent(content);
      setProgress({ step: 'complete', progress: 100, message: '記事生成が完了しました！' });

      // Auto-hide progress after a delay
      setTimeout(() => {
        setProgress({ step: 'idle', progress: 0, message: '' });
      }, 2000);

    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : '記事生成中にエラーが発生しました';
      setError(errorMessage);
      setProgress({ step: 'idle', progress: 0, message: '' });
      
      // Auto-open settings if it's an API key related error
      if (errorMessage.includes('APIキーが無効') || errorMessage.includes('API key')) {
        setShowSettings(true);
      }
    }

    setLoading(false);
  };

  const handleSaveArticle = () => {
    if (!videoInfo || !articleContent) return;

    const savedArticle: SavedArticle = {
      id: Date.now().toString(),
      videoId: videoInfo.id,
      title: videoInfo.title,
      thumbnail: videoInfo.thumbnails.high,
      content: articleContent,
      createdAt: new Date().toISOString(),
    };

    saveArticle(savedArticle);
    // You could add a success notification here
  };

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
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
              title="API設定"
            >
              <Settings className="w-6 h-6" />
            </button>
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
        {(articleContent || loading) && (
          <div className="mb-8">
            <ArticleTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              content={articleContent}
              loading={loading}
              onSave={handleSaveArticle}
            />
          </div>
        )}
      </main>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleApiKeysSave}
      />
    </div>
  );
}

export default App;