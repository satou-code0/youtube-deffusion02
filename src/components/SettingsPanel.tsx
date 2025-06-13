import React, { useState, useEffect } from 'react';
import { X, Key, Save, Eye, EyeOff } from 'lucide-react';
import { ApiKeys } from '../types';
import { saveApiKeys, loadApiKeys } from '../utils/storage';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: ApiKeys) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose, onSave }) => {
  const [keys, setKeys] = useState<ApiKeys>({ openai: '', youtube: '' });
  const [showKeys, setShowKeys] = useState({ openai: false, youtube: false });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedKeys = loadApiKeys();
      setKeys(savedKeys);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      saveApiKeys(keys);
      onSave(keys);
      onClose();
    } catch (error) {
      console.error('Failed to save API keys:', error);
    }
    setLoading(false);
  };

  const handleKeyChange = (type: keyof ApiKeys, value: string) => {
    setKeys(prev => ({ ...prev, [type]: value }));
  };

  const toggleShowKey = (type: keyof ApiKeys) => {
    setShowKeys(prev => ({ ...prev, [type]: !prev[type] }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
            <Key className="w-5 h-5 text-youtube-red" />
            <span>API設定</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showKeys.openai ? 'text' : 'password'}
                value={keys.openai}
                onChange={(e) => handleKeyChange('openai', e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-youtube-red/20 focus:border-youtube-red transition-colors"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('openai')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys.openai ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              YouTube Data API Key
            </label>
            <div className="relative">
              <input
                type={showKeys.youtube ? 'text' : 'password'}
                value={keys.youtube}
                onChange={(e) => handleKeyChange('youtube', e.target.value)}
                placeholder="AIza..."
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-youtube-red/20 focus:border-youtube-red transition-colors"
              />
              <button
                type="button"
                onClick={() => toggleShowKey('youtube')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showKeys.youtube ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>取得方法:</strong><br />
              • OpenAI: <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">platform.openai.com</a><br />
              • YouTube: <a href="https://console.developers.google.com" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a>
            </p>
          </div>
        </div>

        <div className="flex space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !keys.openai.trim() || !keys.youtube.trim()}
            className="flex-1 px-4 py-2 bg-youtube-red text-white rounded-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
          >
            {loading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>保存</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};