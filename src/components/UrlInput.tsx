import React, { useState } from 'react';
import { Search, AlertCircle, Sparkles, Zap, FileText, Instagram, Twitter } from 'lucide-react';
import { isValidYouTubeUrl } from '../utils/youtube';

interface UrlInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export const UrlInput: React.FC<UrlInputProps> = ({ value, onChange, onSubmit, loading }) => {
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!value.trim()) {
      setError('YouTube URLを入力してください');
      return;
    }

    if (!isValidYouTubeUrl(value)) {
      setError('正しいYouTube URLを入力してください');
      return;
    }

    setError('');
    onSubmit();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (error && newValue.trim()) {
      setError('');
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-youtube-red via-pink-500 to-purple-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition-opacity duration-300"></div>
          <div className="relative">
            <input
              type="url"
              value={value}
              onChange={handleChange}
              placeholder="YouTube URLを入力してください (例: https://www.youtube.com/watch?v=...)"
              className={`w-full px-6 py-5 pr-14 text-lg border-2 rounded-2xl transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-youtube-red/20 bg-white/90 backdrop-blur-sm ${
                error
                  ? 'border-red-500 bg-red-50/90 shadow-red-100 shadow-lg'
                  : value && isValidYouTubeUrl(value)
                  ? 'border-green-500 bg-green-50/90 shadow-green-100 shadow-lg'
                  : 'border-gray-300 hover:border-gray-400 shadow-lg hover:shadow-xl'
              }`}
              disabled={loading}
            />
            <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
              {loading ? (
                <div className="w-6 h-6 border-2 border-youtube-red border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Search className="text-gray-400 w-6 h-6 group-hover:text-youtube-red transition-colors duration-200" />
              )}
            </div>
          </div>
        </div>
        
        {error && (
          <div className="flex items-center space-x-3 text-red-600 animate-slide-up bg-red-50 p-4 rounded-xl border border-red-200">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading || !value.trim() || !isValidYouTubeUrl(value)}
          className="w-full relative overflow-hidden bg-gradient-to-r from-youtube-red via-red-600 to-pink-600 text-white py-5 px-8 rounded-2xl font-bold text-lg transition-all duration-300 hover:from-red-600 hover:via-red-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl hover:shadow-3xl group"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transform -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
          
          {loading ? (
            <div className="flex items-center justify-center space-x-3">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              <span>AI記事生成中...</span>
              <Sparkles className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <div className="flex items-center justify-center space-x-3">
              <Zap className="w-6 h-6 group-hover:animate-pulse" />
              <span>🚀 AI記事生成開始</span>
              <Sparkles className="w-5 h-5 group-hover:animate-bounce" />
            </div>
          )}
        </button>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-800">ブログ記事</span>
            </div>
            <p className="text-sm text-gray-600">SEO最適化された詳細記事</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center">
                <Instagram className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-800">Instagram投稿</span>
            </div>
            <p className="text-sm text-gray-600">エンゲージメント重視の投稿</p>
          </div>
          
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-blue-400 rounded-lg flex items-center justify-center">
                <Twitter className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-gray-800">X投稿</span>
            </div>
            <p className="text-sm text-gray-600">簡潔で印象的なツイート</p>
          </div>
        </div>
      </form>
    </div>
  );
};