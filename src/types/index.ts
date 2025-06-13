export interface VideoInfo {
  id: string;
  title: string;
  description: string;
  thumbnails: {
    default: string;
    medium: string;
    high: string;
    maxres?: string;
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

export interface SavedArticle {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  content: ArticleContent;
  createdAt: string;
}

export interface ApiKeys {
  openai: string;
  youtube: string;
}

export interface GenerationProgress {
  step: 'idle' | 'analyzing' | 'transcribing' | 'generating-blog' | 'generating-instagram' | 'generating-twitter' | 'complete';
  progress: number;
  message: string;
}

export type ArticleType = 'blog' | 'instagram' | 'twitter';