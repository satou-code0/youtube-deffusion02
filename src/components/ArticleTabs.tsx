import React from 'react';
import { FileText, Instagram, Twitter, Copy, Download, Save } from 'lucide-react';
import { ArticleType, ArticleContent } from '../types';

interface ArticleTabsProps {
  activeTab: ArticleType;
  onTabChange: (tab: ArticleType) => void;
  content: ArticleContent | null;
  loading: boolean;
  onSave: () => void;
}

export const ArticleTabs: React.FC<ArticleTabsProps> = ({
  activeTab,
  onTabChange,
  content,
  loading,
  onSave,
}) => {
  const tabs = [
    { id: 'blog', label: 'ブログ記事', icon: FileText, color: 'text-blue-600' },
    { id: 'instagram', label: 'Instagram', icon: Instagram, color: 'text-pink-600' },
    { id: 'twitter', label: 'X (Twitter)', icon: Twitter, color: 'text-blue-400' },
  ] as const;

  const convertMarkdownToHTML = (markdown: string): string => {
    return markdown
      // Headers
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Links (including timestamp links)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // List items
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/^✅ (.*$)/gm, '<li>✅ $1</li>')
      // Paragraphs - wrap non-header, non-list content
      .split('\n')
      .map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<h') || trimmed.startsWith('<li') || trimmed.startsWith('<strong>')) {
          return trimmed;
        }
        return `<p>${trimmed}</p>`;
      })
      .filter(line => line)
      .join('\n');
  };

  const handleCopy = async () => {
    if (!content || !content[activeTab]) return;
    
    try {
      let copyContent = content[activeTab];
      
      // ブログ記事の場合はHTMLに変換
      if (activeTab === 'blog') {
        copyContent = convertMarkdownToHTML(content[activeTab]);
      }
      
      await navigator.clipboard.writeText(copyContent);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    if (!content || !content[activeTab]) return;

    let downloadContent = content[activeTab];
    let fileExtension = 'txt';

    // ブログ記事の場合はHTMLに変換
    if (activeTab === 'blog') {
      downloadContent = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ブログ記事</title>
    <style>
        body {
            font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
        }
        h1 {
            color: #2c3e50;
            border-bottom: 3px solid #e74c3c;
            padding-bottom: 10px;
            margin-bottom: 30px;
        }
        h2 {
            color: #34495e;
            border-left: 4px solid #e74c3c;
            padding-left: 15px;
            margin-top: 30px;
            margin-bottom: 20px;
        }
        h3 {
            color: #5d6d7e;
            margin-top: 25px;
            margin-bottom: 15px;
        }
        p {
            margin-bottom: 15px;
            text-align: justify;
        }
        a {
            color: #e74c3c;
            text-decoration: none;
            font-weight: 500;
        }
        a:hover {
            text-decoration: underline;
        }
        strong {
            color: #2c3e50;
        }
        li {
            margin-bottom: 8px;
        }
        ul {
            padding-left: 0;
            list-style: none;
        }
        li:before {
            content: "• ";
            color: #e74c3c;
            font-weight: bold;
            margin-right: 8px;
        }
    </style>
</head>
<body>
${convertMarkdownToHTML(content[activeTab])}
</body>
</html>`;
      fileExtension = 'html';
    }

    const blob = new Blob([downloadContent], { 
      type: activeTab === 'blog' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8' 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeTab}_article.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getCurrentContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <div className="spinner w-8 h-8"></div>
          <p className="text-gray-600">記事を生成中...</p>
        </div>
      );
    }

    if (!content || !content[activeTab]) {
      return (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">記事を生成してください</p>
        </div>
      );
    }

    // Render markdown for blog posts, plain text for others
    if (activeTab === 'blog') {
      return (
        <div className="prose prose-lg max-w-none">
          <div 
            className="markdown-content"
            dangerouslySetInnerHTML={{ 
              __html: formatMarkdownToHTML(content[activeTab]) 
            }}
          />
        </div>
      );
    }

    return (
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
          {content[activeTab]}
        </pre>
      </div>
    );
  };

  const formatMarkdownToHTML = (markdown: string): string => {
    return markdown
      // Headers
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-gray-900 mb-6 mt-8">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-semibold text-gray-800 mb-4 mt-6">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-medium text-gray-700 mb-3 mt-4">$1</h3>')
      // Bold text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
      // Links (including timestamp links)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-youtube-red hover:text-red-700 underline font-medium">$1</a>')
      // List items
      .replace(/^- (.*$)/gm, '<li class="mb-1">$1</li>')
      .replace(/^✅ (.*$)/gm, '<li class="mb-2 flex items-start"><span class="text-green-500 mr-2">✅</span>$1</li>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p class="mb-4">')
      // Wrap in paragraph tags
      .replace(/^(?!<[h|l|s])(.+)$/gm, '<p class="mb-4">$1</p>')
      // Clean up empty paragraphs
      .replace(/<p class="mb-4"><\/p>/g, '')
      // Wrap lists
      .replace(/(<li.*?<\/li>)/gs, '<ul class="list-none space-y-1 mb-4">$1</ul>')
      // Line breaks
      .replace(/\n/g, '<br>');
  };

  const getTabGradient = (tabId: ArticleType) => {
    switch (tabId) {
      case 'instagram':
        return 'bg-instagram-gradient';
      case 'twitter':
        return 'bg-twitter-blue';
      default:
        return 'bg-blue-600';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
      {/* Tab Headers */}
      <div className="flex border-b border-gray-200 bg-gray-50">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-4 px-6 font-medium transition-all duration-200 relative ${
                activeTab === tab.id
                  ? 'text-white bg-gradient-to-r from-gray-800 to-gray-700'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="hidden sm:inline">{tab.label}</span>
              {activeTab === tab.id && (
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${getTabGradient(tab.id)}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="p-6">
        <div className="min-h-[400px] max-h-[600px] overflow-y-auto">
          {getCurrentContent()}
        </div>

        {/* Action Buttons */}
        {content && content[activeTab] && (
          <div className="flex justify-end space-x-2 mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Copy className="w-4 h-4" />
              <span>コピー</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>ダウンロード</span>
            </button>
            <button
              onClick={onSave}
              className="flex items-center space-x-2 px-4 py-2 bg-youtube-red text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>保存</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};