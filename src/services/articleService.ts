import { supabase } from '../utils/supabaseClient';

export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    maxres: string;
  };
  duration: string;
  publishedAt: string;
  channelTitle: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface ArticleContent {
  blog: string;
  instagram: string;
  twitter: string;
}

export interface GenerateArticlesResponse {
  success: boolean;
  data: {
    videoInfo: VideoInfo;
    articles: ArticleContent;
  };
  error?: string;
}

/**
 * Supabase Edge Functionを使用して記事を生成
 */
export async function generateArticles(videoUrl: string): Promise<GenerateArticlesResponse> {
  try {
    // 認証状態確認とトークン更新
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      throw new Error(`セッションエラー: ${sessionError.message}`);
    }
    
    if (!session) {
      throw new Error('認証が必要です');
    }

    // トークンの有効期限チェック（5分前にリフレッシュ）
    const now = Math.floor(Date.now() / 1000);
    const expiresAt = session.expires_at || 0;
    const shouldRefresh = (expiresAt - now) < 300; // 5分以内に期限切れ

    let currentSession = session;

    // トークンをリフレッシュ
    if (shouldRefresh && session.refresh_token) {
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
        refresh_token: session.refresh_token
      });

      if (refreshError) {
        console.warn('Token refresh failed:', refreshError.message);
        // リフレッシュに失敗した場合は既存のセッションを使用
      } else if (refreshData.session) {
        currentSession = refreshData.session;
      }
    }

    // リクエストデータ
    const requestData = { videoUrl };

    // fetchを使った直接的なHTTPリクエスト
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-articles`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentSession.access_token}`,
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      try {
        const errorJson = JSON.parse(errorText);
        const errorMessage = errorJson.error + (errorJson.details ? ': ' + errorJson.details : '');
        throw new Error(errorMessage);
      } catch (jsonError) {
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    }

    const data = await response.json();

    if (!data) {
      throw new Error('Edge Functionからレスポンスが返されませんでした');
    }

    if (!data.success) {
      throw new Error(data.error || '記事生成に失敗しました');
    }

    return data;

  } catch (error) {
    console.error('Article generation error:', error);
    
    // エラーメッセージを分析して適切なメッセージを返す
    let errorMessage = '記事生成中にエラーが発生しました';
    
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // 特定のエラーパターンに対する追加情報
    if (errorMessage.includes('APIキーが設定されていません')) {
      errorMessage += '\n設定画面でOpenAI APIキーとYouTube APIキーを設定してください。';
    } else if (errorMessage.includes('認証')) {
      errorMessage += '\nログインし直してください。';
    } else if (errorMessage.includes('利用回数')) {
      errorMessage += '\n有料プランにアップグレードしてください。';
    }

    throw new Error(errorMessage);
  }
}

/**
 * YouTube動画URLからビデオIDを抽出
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
} 