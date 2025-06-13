export const extractVideoId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

export const isValidYouTubeUrl = (url: string): boolean => {
  return extractVideoId(url) !== null;
};

export const formatTimestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const createTimestampUrl = (videoUrl: string, seconds: number): string => {
  const baseUrl = videoUrl.split('&t=')[0];
  return `${baseUrl}&t=${Math.floor(seconds)}s`;
};

export const getBestThumbnail = (thumbnails: any): string => {
  // 優先順位: maxres > high > medium > default
  if (thumbnails.maxres) {
    return thumbnails.maxres;
  }
  if (thumbnails.high) {
    return thumbnails.high;
  }
  if (thumbnails.medium) {
    return thumbnails.medium;
  }
  if (thumbnails.default) {
    return thumbnails.default;
  }
  
  // フォールバック: YouTube の直接URL（動画IDが必要）
  return thumbnails.high || thumbnails.medium || thumbnails.default;
};

// サムネイルURLの検証とフォールバック
export const validateThumbnailUrl = async (url: string, videoId: string): Promise<string> => {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (response.ok) {
      return url;
    }
  } catch (error) {
    console.warn('Thumbnail validation failed:', error);
  }
  
  // フォールバック: YouTube の直接URL
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};

// 複数のサムネイル解像度を試行
export const getReliableThumbnail = async (thumbnails: any, videoId: string): Promise<string> => {
  const candidates = [
    thumbnails.maxres,
    thumbnails.high,
    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
    `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    thumbnails.medium,
    `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
    thumbnails.default,
    `https://img.youtube.com/vi/${videoId}/default.jpg`,
  ].filter(Boolean);

  for (const url of candidates) {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      if (response.ok) {
        return url;
      }
    } catch (error) {
      continue;
    }
  }

  // 最終フォールバック
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
};