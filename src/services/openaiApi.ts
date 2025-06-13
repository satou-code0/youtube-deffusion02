import { ArticleContent, VideoInfo, TranscriptSegment } from '../types';
import { createTimestampUrl, formatTimestamp } from '../utils/youtube';

export class OpenAIApiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async callOpenAI(prompt: string, maxTokens: number): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: 'あなたは優秀な日本語ライターです。YouTube動画から魅力的で読みやすい記事を作成してください。マークダウン形式で構造化し、タイムスタンプリンクを適切に配置してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      let errorMessage = 'OpenAI APIの呼び出しに失敗しました';
      
      try {
        const errorData = await response.json();
        
        if (response.status === 401) {
          errorMessage = 'OpenAI APIキーが無効です。設定を確認してください。';
        } else if (response.status === 429) {
          errorMessage = 'OpenAI APIの利用制限に達しました。しばらく待ってから再試行してください。';
        } else if (response.status === 400) {
          errorMessage = `リクエストが無効です: ${errorData.error?.message || '不明なエラー'}`;
        } else if (response.status === 500) {
          errorMessage = 'OpenAI APIサーバーでエラーが発生しました。しばらく待ってから再試行してください。';
        } else {
          errorMessage = `OpenAI API エラー (${response.status}): ${errorData.error?.message || '不明なエラー'}`;
        }
      } catch (parseError) {
        errorMessage = `OpenAI API エラー (${response.status}): レスポンスの解析に失敗しました`;
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async generateBlogArticle(videoInfo: VideoInfo, transcript: TranscriptSegment[], videoUrl: string): Promise<string> {
    const transcriptText = transcript.map(t => t.text).join(' ');
    
    const prompt = `
以下のYouTube動画から詳細なブログ記事を作成してください。

【入力情報】
- タイトル: ${videoInfo.title}
- URL: ${videoUrl}
- チャンネル: ${videoInfo.channelTitle}
- 公開日: ${videoInfo.publishedAt}
- 文字起こし: ${transcriptText}

【出力要件】
- 文字数: 3000-5000文字
- 形式: マークダウン形式
- 構造: H1(1個) → H2(3-5個) → H3(各H2に2-3個)
- タイムスタンプリンク: [MM:SS](${videoUrl}&t=XXXs) 形式で重要ポイントに必ず付与
- SEOを意識した自然な日本語
- 読者の関心を引く導入文
- まとめセクションを含む

【マークダウン構造例】
# ${videoInfo.title}から学ぶ[メインテーマ]

## はじめに
動画の概要と重要ポイントの紹介

## [メインポイント1] - [00:30](${videoUrl}&t=30s)
### [詳細解説1-1]
### [詳細解説1-2] - [02:15](${videoUrl}&t=135s)

## [メインポイント2] - [05:45](${videoUrl}&t=345s)
### [詳細解説2-1]
### [詳細解説2-2] - [08:20](${videoUrl}&t=500s)

## [メインポイント3] - [12:10](${videoUrl}&t=730s)
### [詳細解説3-1]
### [詳細解説3-2]

## まとめ
重要ポイントの再確認と次のアクション

**動画情報:**
- チャンネル: ${videoInfo.channelTitle}
- 公開日: ${new Date(videoInfo.publishedAt).toLocaleDateString('ja-JP')}
- 動画URL: ${videoUrl}

【重要】タイムスタンプリンクは実際の動画の重要な場面に対応させ、[MM:SS](URL&t=秒数s)の形式で必ず含めてください。

記事を作成してください：
    `;

    return await this.callOpenAI(prompt, 4000);
  }

  async generateInstagramPost(videoInfo: VideoInfo, transcript: TranscriptSegment[], videoUrl: string): Promise<string> {
    const transcriptText = transcript.map(t => t.text).join(' ');
    
    const prompt = `
以下の動画からInstagram投稿用テキストを作成してください。

【入力情報】
- タイトル: ${videoInfo.title}
- URL: ${videoUrl}
- チャンネル: ${videoInfo.channelTitle}
- 文字起こし: ${transcriptText}

【出力要件】
- 文字数: 1800-2000文字以内
- 絵文字: 控えめに使用（重要な箇所のみ）
- 改行: 読みやすさを重視
- ハッシュタグ: 7-10個（関連性重視）
- CTA: エンゲージメントを促す質問
- タイムスタンプリンク: 2-3箇所の重要ポイントで [MM:SS] ${videoUrl}&t=XXXs 形式

【構成テンプレート】
💡 [キャッチーな導入文]

📝 **重要ポイント:**
✅ [ポイント1] - [00:30] ${videoUrl}&t=30s
✅ [ポイント2] - [03:15] ${videoUrl}&t=195s  
✅ [ポイント3] - [07:45] ${videoUrl}&t=465s

[詳細解説文章]

🎯 **特に注目すべき部分:**
[MM:SS] ${videoUrl}&t=XXXs で説明されている[具体的内容]

[感想・考察]

💬 **質問:** [エンゲージメントを促す質問]

📺 動画: ${videoUrl}
🎬 チャンネル: ${videoInfo.channelTitle}

#ハッシュタグ1 #ハッシュタグ2 #ハッシュタグ3 #ハッシュタグ4 #ハッシュタグ5 #ハッシュタグ6 #ハッシュタグ7

【重要】タイムスタンプは実際の動画の重要な場面に対応させ、必ずURLと組み合わせてください。

投稿を作成してください：
    `;

    return await this.callOpenAI(prompt, 1000);
  }

  async generateTwitterPost(videoInfo: VideoInfo, transcript: TranscriptSegment[], videoUrl: string): Promise<string> {
    const transcriptText = transcript.map(t => t.text).join(' ');
    
    const prompt = `
280文字以内の魅力的なX投稿を作成してください。

【入力情報】
- タイトル: ${videoInfo.title}
- URL: ${videoUrl}
- チャンネル: ${videoInfo.channelTitle}
- 文字起こし: ${transcriptText}

【要件】
- 文字数: 250-280文字
- 核心的なメッセージ1つに集中
- タイムスタンプリンク: 1箇所で [MM:SS] ${videoUrl}&t=XXXs 形式
- ハッシュタグ: 2-3個
- リツイートを促す要素
- 簡潔で印象的な表現

【テンプレート】
💡[核心メッセージ]

🎯重要ポイント: [MM:SS] ${videoUrl}&t=XXXs

[感想・考察]

#ハッシュタグ1 #ハッシュタグ2

【重要】タイムスタンプは実際の動画の最も重要な場面に対応させ、必ずURLと組み合わせてください。文字数制限を厳守してください。

投稿を作成してください：
    `;

    return await this.callOpenAI(prompt, 300);
  }

  async generateAllArticles(videoInfo: VideoInfo, transcript: TranscriptSegment[], videoUrl: string): Promise<ArticleContent> {
    const [blog, instagram, twitter] = await Promise.all([
      this.generateBlogArticle(videoInfo, transcript, videoUrl),
      this.generateInstagramPost(videoInfo, transcript, videoUrl),
      this.generateTwitterPost(videoInfo, transcript, videoUrl),
    ]);

    return { blog, instagram, twitter };
  }
}