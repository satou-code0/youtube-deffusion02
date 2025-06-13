import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, Clock, User } from 'lucide-react';
import { VideoInfo } from '../types';
import { getBestThumbnail, getReliableThumbnail } from '../utils/youtube';

interface VideoPreviewProps {
  videoInfo: VideoInfo;
  videoUrl: string;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({ videoInfo, videoUrl }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string>('');
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const loadThumbnail = async () => {
      try {
        const reliableUrl = await getReliableThumbnail(videoInfo.thumbnails, videoInfo.id);
        setThumbnailUrl(reliableUrl);
      } catch (error) {
        console.error('Failed to load thumbnail:', error);
        setThumbnailUrl(getBestThumbnail(videoInfo.thumbnails));
      }
    };

    loadThumbnail();
  }, [videoInfo]);

  const handleImageError = () => {
    if (!imageError) {
      setImageError(true);
      // フォールバックサムネイルを設定
      const fallbackUrl = `https://img.youtube.com/vi/${videoInfo.id}/hqdefault.jpg`;
      setThumbnailUrl(fallbackUrl);
    }
  };

  const handleDownloadThumbnail = async () => {
    try {
      const response = await fetch(thumbnailUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}_thumbnail.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download thumbnail:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden animate-fade-in">
      <div className="relative group">
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={videoInfo.title}
            className="w-full h-64 object-cover"
            onError={handleImageError}
            loading="lazy"
          />
        ) : (
          <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
            <div className="text-gray-500">サムネイル読み込み中...</div>
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
            <button
              onClick={handleDownloadThumbnail}
              className="bg-white/90 text-gray-800 p-3 rounded-full hover:bg-white transition-colors shadow-lg"
              title="サムネイルをダウンロード"
            >
              <Download className="w-5 h-5" />
            </button>
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-youtube-red/90 text-white p-3 rounded-full hover:bg-youtube-red transition-colors shadow-lg"
              title="YouTubeで開く"
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-3 line-clamp-2">
          {videoInfo.title}
        </h3>

        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-1">
            <User className="w-4 h-4" />
            <span>{videoInfo.channelTitle}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>{formatDate(videoInfo.publishedAt)}</span>
          </div>
        </div>

        {videoInfo.description && (
          <p className="text-gray-700 text-sm line-clamp-3">
            {videoInfo.description}
          </p>
        )}
      </div>
    </div>
  );
};