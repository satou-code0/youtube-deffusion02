import { VideoInfo, TranscriptSegment } from '../types';
import { getBestThumbnail } from '../utils/youtube';

export class YouTubeApiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getVideoInfo(videoId: string): Promise<VideoInfo> {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${this.apiKey}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('YouTube APIの呼び出しに失敗しました');
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      throw new Error('動画が見つかりませんでした');
    }

    const video = data.items[0];
    const snippet = video.snippet;
    
    // サムネイル情報を安全に取得
    const thumbnails = snippet.thumbnails || {};
    
    return {
      id: videoId,
      title: snippet.title,
      description: snippet.description,
      thumbnails: {
        default: thumbnails.default?.url || `https://img.youtube.com/vi/${videoId}/default.jpg`,
        medium: thumbnails.medium?.url || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`,
        high: thumbnails.high?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        maxres: thumbnails.maxres?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      },
      duration: video.contentDetails.duration,
      publishedAt: snippet.publishedAt,
      channelTitle: snippet.channelTitle,
    };
  }

  async getTranscript(videoId: string): Promise<TranscriptSegment[]> {
    try {
      // Try to get transcript using YouTube's auto-generated captions via a different approach
      const transcript = await this.fetchTranscriptFromYouTube(videoId);
      if (transcript.length > 0) {
        return transcript;
      }
      
      // If no transcript is available, return empty array
      console.warn('No transcript available for this video');
      return [];
    } catch (error) {
      console.error('Transcript fetch error:', error);
      // Return empty array instead of throwing error to allow the app to continue
      return [];
    }
  }

  private async fetchTranscriptFromYouTube(videoId: string): Promise<TranscriptSegment[]> {
    try {
      // First, check if captions are available
      const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${this.apiKey}`;
      const captionsResponse = await fetch(captionsUrl);
      
      if (!captionsResponse.ok) {
        throw new Error('字幕情報の取得に失敗しました');
      }

      const captionsData = await captionsResponse.json();
      
      if (!captionsData.items || captionsData.items.length === 0) {
        throw new Error('この動画には字幕がありません');
      }

      // Since we can't download captions without OAuth, we'll try an alternative approach
      // using the video's description as a fallback or indicate that manual transcript is needed
      const videoInfo = await this.getVideoInfo(videoId);
      
      if (videoInfo.description && videoInfo.description.trim().length > 100) {
        // Use description as a basic transcript alternative
        return [{
          text: videoInfo.description,
          start: 0,
          duration: 0,
        }];
      }

      // If no substantial description, return a message indicating transcript unavailability
      return [{
        text: `この動画の字幕を自動取得することができませんでした。YouTube Data APIの制限により、字幕の取得にはOAuth認証が必要です。\n\n動画タイトル: ${videoInfo.title}\nチャンネル: ${videoInfo.channelTitle}\n\n手動で字幕をコピーして貼り付けるか、動画の説明欄の内容を参考にしてください。`,
        start: 0,
        duration: 0,
      }];

    } catch (error) {
      console.error('Error fetching transcript:', error);
      throw error;
    }
  }
}