// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from '@supabase/supabase-js'

console.log("Hello from Functions!")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  console.log('Function called with method:', req.method);
  console.log('Request URL:', req.url);
  
  // CORS対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 環境変数確認
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    console.log('Environment check:', {
      hasUrl: !!supabaseUrl,
      hasAnonKey: !!supabaseAnonKey,
      hasServiceRoleKey: !!supabaseServiceRoleKey
    });

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase環境変数が設定されていません');
    }

    // リクエストボディ取得
    let requestBody = {};
    
    try {
      const bodyText = await req.text();
      console.log('Raw request body:', bodyText);
      
      if (bodyText && bodyText.trim() !== '') {
        requestBody = JSON.parse(bodyText);
      }
      
      console.log('Parsed request body:', requestBody);
    } catch (e) {
      console.error('Failed to parse request body:', e);
      return new Response(
        JSON.stringify({ 
          error: 'リクエストボディの解析に失敗しました',
          details: e.message 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { videoUrl } = requestBody;

    // 認証ヘッダー確認
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header check:', {
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length,
      authHeaderPrefix: authHeader?.substring(0, 20) + '...'
    });
    
    if (!authHeader) {
      console.log('Missing auth header - returning 401');
      return new Response(
        JSON.stringify({ error: '認証ヘッダーが必要です' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Supabaseクライアント初期化
    console.log('Initializing Supabase client...');
    
    // Service Role Keyを使用してクライアントを初期化（JWTトークン検証用）
    const supabaseClient = supabaseServiceRoleKey 
      ? createClient(supabaseUrl, supabaseServiceRoleKey)
      : createClient(supabaseUrl, supabaseAnonKey, {
          global: {
            headers: { Authorization: authHeader },
          },
        });

    // JWTトークンからユーザー情報を取得
    console.log('Getting user from JWT token...');
    
    // Service Role Keyがある場合は、JWTトークンを直接検証
    let user;
    let authError;
    
    if (supabaseServiceRoleKey) {
      // Service Role Keyを使用してJWTトークンを検証
      try {
        const jwt = authHeader.replace('Bearer ', '');
        console.log('JWT token length:', jwt.length);
        console.log('JWT token prefix:', jwt.substring(0, 50) + '...');
        
        const { data, error } = await supabaseClient.auth.getUser(jwt);
        user = data.user;
        authError = error;
        
        console.log('JWT verification result:', {
          hasUser: !!user,
          userId: user?.id,
          userEmail: user?.email,
          errorMessage: error?.message,
          errorStatus: error?.status,
          errorCode: error?.code
        });
        
      } catch (error) {
        console.error('JWT verification exception:', error);
        authError = error;
      }
    } else {
      // 通常の方法でユーザー情報を取得
      console.log('Using anon key with auth header');
      const { data: { user: userData }, error } = await supabaseClient.auth.getUser();
      user = userData;
      authError = error;
      
      console.log('Anon key auth result:', {
        hasUser: !!user,
        userId: user?.id,
        userEmail: user?.email,
        errorMessage: error?.message
      });
    }
    
    console.log('Final auth check result:', { 
      hasUser: !!user, 
      userId: user?.id,
      userEmail: user?.email,
      authError: authError?.message,
      authErrorCode: authError?.status,
      authErrorName: authError?.name,
      usingServiceRole: !!supabaseServiceRoleKey
    });
    
    if (authError || !user) {
      console.log('Auth failed - detailed error info:', {
        errorType: typeof authError,
        errorConstructor: authError?.constructor?.name,
        errorKeys: authError ? Object.keys(authError) : [],
        fullError: authError
      });
      
      return new Response(
        JSON.stringify({ 
          error: '認証が必要です', 
          details: authError?.message || 'ユーザー情報を取得できませんでした',
          authErrorCode: authError?.status,
          authErrorName: authError?.name,
          stage: 'authentication',
          debugInfo: {
            hasServiceRole: !!supabaseServiceRoleKey,
            authHeaderPresent: !!authHeader,
            authHeaderLength: authHeader?.length
          }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 認証成功レスポンス（第1段階）
    console.log('Auth successful - returning success response');
    
    // 第2段階：ユーザーデータベース連携
    console.log('Stage 2: Fetching user data from database...');
    
    // ユーザー情報取得（利用回数・有料フラグ・APIキー）
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('used_count, is_paid, openai_api_key, youtube_api_key')
      .eq('id', user.id)
      .single();

    console.log('User data fetch result:', { 
      hasUserData: !!userData, 
      userError: userError?.message,
      usedCount: userData?.used_count,
      isPaid: userData?.is_paid,
      hasOpenaiKey: !!userData?.openai_api_key,
      hasYoutubeKey: !!userData?.youtube_api_key
    });

    if (userError) {
      console.log('User data fetch failed - returning 500');
      return new Response(
        JSON.stringify({ 
          error: 'ユーザー情報の取得に失敗しました',
          details: userError.message,
          stage: 'database_fetch'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userData) {
      console.log('User data not found - returning 404');
      return new Response(
        JSON.stringify({ 
          error: 'ユーザーデータが見つかりません',
          details: 'データベースにユーザー情報が登録されていません',
          stage: 'database_fetch'
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 利用回数制御
    console.log('Checking usage limits...');
    if (!userData.is_paid && userData.used_count >= 3) {
      console.log('Usage limit exceeded - returning 403');
      return new Response(
        JSON.stringify({ 
          error: '無料利用回数の上限に達しました',
          details: '有料プランにアップグレードしてください',
          usedCount: userData.used_count,
          maxCount: 3,
          stage: 'usage_limit'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // APIキー確認
    console.log('Checking API keys...');
    if (!userData.openai_api_key || !userData.youtube_api_key) {
      console.log('API keys missing - returning 400');
      return new Response(
        JSON.stringify({ 
          error: 'APIキーが設定されていません',
          details: '設定画面でOpenAI APIキーとYouTube APIキーを設定してください',
          missingKeys: {
            openai: !userData.openai_api_key,
            youtube: !userData.youtube_api_key
          },
          stage: 'api_keys'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 第2段階成功レスポンス
    console.log('Stage 2 successful - user data validated');
    
    // 第3段階：YouTube API連携
    console.log('Stage 3: YouTube API integration...');
    
    // YouTube動画URL検証
    if (!videoUrl) {
      console.log('Video URL missing - returning 400');
      return new Response(
        JSON.stringify({ 
          error: 'videoUrlが必要です',
          details: 'YouTube動画のURLを指定してください',
          stage: 'url_validation'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // YouTube動画ID抽出
    console.log('Extracting video ID from URL:', videoUrl);
    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      console.log('Invalid YouTube URL - returning 400');
      return new Response(
        JSON.stringify({ 
          error: '有効なYouTube URLではありません',
          details: 'YouTube動画のURLを正しく入力してください',
          providedUrl: videoUrl,
          stage: 'url_validation'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Video ID extracted:', videoId);

    try {
      // YouTube API で動画情報取得
      console.log('Fetching video info from YouTube API...');
      const videoInfo = await getVideoInfo(videoId, userData.youtube_api_key);
      console.log('Video info fetched:', {
        title: videoInfo.title,
        channelTitle: videoInfo.channelTitle,
        duration: videoInfo.duration
      });
      
      // 字幕取得
      console.log('Fetching transcript from YouTube API...');
      const transcript = await getTranscript(videoId, userData.youtube_api_key);
      console.log('Transcript fetched:', {
        segmentCount: transcript.length,
        totalLength: transcript.reduce((sum, seg) => sum + seg.text.length, 0)
      });

      // 第3段階成功レスポンス
      console.log('Stage 3 successful - YouTube API integration completed');
      
      // 第4段階：OpenAI API連携
      console.log('Stage 4: OpenAI API integration...');
      
      try {
        // OpenAI で記事生成
        console.log('Generating articles with OpenAI...');
        const articles = await generateAllArticles(videoInfo, transcript, videoUrl, userData.openai_api_key);
        console.log('Articles generated:', {
          blogLength: articles.blog.length,
          instagramLength: articles.instagram.length,
          twitterLength: articles.twitter.length
        });

        // 利用回数インクリメント
        console.log('Incrementing usage count...');
        const { error: incrementError } = await supabaseClient.rpc('increment_used_count', { 
          user_id: user.id 
        });
        
        if (incrementError) {
          console.warn('Failed to increment usage count:', incrementError.message);
        } else {
          console.log('Usage count incremented successfully');
        }

        // 第4段階成功レスポンス（最終成功）
        console.log('Stage 4 successful - Article generation completed');
        return new Response(
          JSON.stringify({
            success: true,
            message: '🎉 記事生成が完了しました！',
            timestamp: new Date().toISOString(),
            stage: 'article_generation_complete',
            data: {
              videoInfo: {
                id: videoInfo.id,
                title: videoInfo.title,
                channelTitle: videoInfo.channelTitle,
                duration: videoInfo.duration,
                publishedAt: videoInfo.publishedAt,
                thumbnails: videoInfo.thumbnails
              },
              articles: {
                blog: articles.blog,
                instagram: articles.instagram,
                twitter: articles.twitter
              }
            },
            user: {
              id: user.id,
              email: user.email
            }
          }),
          { 
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (openaiError) {
        console.error('OpenAI API error:', openaiError);
        return new Response(
          JSON.stringify({
            success: false,
            error: 'OpenAI API連携でエラーが発生しました',
            details: openaiError.message,
            stage: 'openai_api',
            videoInfo: {
              id: videoInfo.id,
              title: videoInfo.title
            }
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

    } catch (error) {
      console.error('YouTube API error:', error);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'YouTube API連携でエラーが発生しました',
          details: error.message,
          stage: 'youtube_api',
          videoId: videoId
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Function error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})

// YouTube動画ID抽出
function extractVideoId(url: string): string | null {
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

// YouTube API で動画情報取得
async function getVideoInfo(videoId: string, apiKey: string): Promise<any> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${apiKey}`;
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API呼び出しに失敗しました: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.items || data.items.length === 0) {
    throw new Error('動画が見つかりませんでした');
  }

  const video = data.items[0];
  const snippet = video.snippet;
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

// 字幕取得
async function getTranscript(videoId: string, apiKey: string): Promise<any[]> {
  try {
    const captionsUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
    const captionsResponse = await fetch(captionsUrl);
    
    if (!captionsResponse.ok) {
      throw new Error('字幕情報の取得に失敗しました');
    }

    const captionsData = await captionsResponse.json();
    
    if (!captionsData.items || captionsData.items.length === 0) {
      // 字幕がない場合は動画説明を使用
      const videoInfo = await getVideoInfo(videoId, apiKey);
      if (videoInfo.description && videoInfo.description.trim().length > 100) {
        return [{
          text: videoInfo.description,
          start: 0,
          duration: 0,
        }];
      }
      
      return [{
        text: `この動画の字幕を自動取得することができませんでした。動画タイトル: ${videoInfo.title}`,
        start: 0,
        duration: 0,
      }];
    }

    // 実際の字幕取得は制限があるため、説明文を使用
    const videoInfo = await getVideoInfo(videoId, apiKey);
    return [{
      text: videoInfo.description || '字幕情報が取得できませんでした',
      start: 0,
      duration: 0,
    }];

  } catch (error) {
    console.error('Error fetching transcript:', error);
    return [{
      text: '字幕の取得に失敗しました',
      start: 0,
      duration: 0,
    }];
  }
}

// OpenAI API連携関数群
async function generateAllArticles(
  videoInfo: any,
  transcript: any,
  videoUrl: string,
  openaiApiKey: string
) {
  console.log('Starting article generation with OpenAI...');
  
  // 字幕テキストを結合
  const transcriptText = Array.isArray(transcript) 
    ? transcript.map(seg => seg.text).join(' ')
    : transcript;
  
  console.log('Transcript length:', transcriptText.length);
  
  // 各記事タイプを並行生成
  const [blog, instagram, twitter] = await Promise.all([
    generateBlogArticle(videoInfo, transcriptText, videoUrl, openaiApiKey),
    generateInstagramPost(videoInfo, transcriptText, videoUrl, openaiApiKey),
    generateTwitterPost(videoInfo, transcriptText, videoUrl, openaiApiKey)
  ]);
  
  return { blog, instagram, twitter };
}

async function generateBlogArticle(
  videoInfo: any,
  transcriptText: string,
  videoUrl: string,
  openaiApiKey: string
): Promise<string> {
  const prompt = `以下のYouTube動画の内容を基に、SEOに最適化された魅力的なブログ記事を作成してください。

動画情報：
- タイトル: ${videoInfo.title}
- チャンネル: ${videoInfo.channelTitle}
- 公開日: ${videoInfo.publishedAt}
- URL: ${videoUrl}

動画の内容：
${transcriptText.substring(0, 3000)}

要件：
- 2000-3000文字程度
- SEOキーワードを自然に含める
- 読みやすい構成（見出し、段落分け）
- 動画の要点を分かりやすく解説
- 読者にとって価値のある情報を提供

記事形式：
# [魅力的なタイトル]

## はじめに
[導入文]

## [メインコンテンツの見出し1]
[内容]

## [メインコンテンツの見出し2]
[内容]

## まとめ
[まとめ]

元動画: ${videoUrl}`;

  return await callOpenAI(prompt, openaiApiKey, 'ブログ記事');
}

async function generateInstagramPost(
  videoInfo: any,
  transcriptText: string,
  videoUrl: string,
  openaiApiKey: string
): Promise<string> {
  const prompt = `以下のYouTube動画の内容を基に、Instagram投稿用のキャプションを作成してください。

動画情報：
- タイトル: ${videoInfo.title}
- チャンネル: ${videoInfo.channelTitle}
- URL: ${videoUrl}

動画の内容：
${transcriptText.substring(0, 1500)}

要件：
- 魅力的で親しみやすい文章
- 適切なハッシュタグ（10-15個）
- エモジを効果的に使用
- 2200文字以内
- エンゲージメントを促す内容

投稿形式：
[魅力的な導入文] ✨

[メインコンテンツ]

[行動を促すメッセージ]

#ハッシュタグ1 #ハッシュタグ2 #ハッシュタグ3...

元動画: ${videoUrl}`;

  return await callOpenAI(prompt, openaiApiKey, 'Instagram投稿');
}

async function generateTwitterPost(
  videoInfo: any,
  transcriptText: string,
  videoUrl: string,
  openaiApiKey: string
): Promise<string> {
  const prompt = `以下のYouTube動画の内容を基に、X（Twitter）投稿用のツイートを作成してください。

動画情報：
- タイトル: ${videoInfo.title}
- チャンネル: ${videoInfo.channelTitle}
- URL: ${videoUrl}

動画の内容：
${transcriptText.substring(0, 1000)}

要件：
- 280文字以内
- 魅力的で興味を引く内容
- 適切なハッシュタグ（2-3個）
- エモジを効果的に使用
- リツイートされやすい内容

ツイート形式：
[魅力的なメッセージ] 🔥

[要点や気づき]

#ハッシュタグ1 #ハッシュタグ2

${videoUrl}`;

  return await callOpenAI(prompt, openaiApiKey, 'X投稿');
}

async function callOpenAI(
  prompt: string,
  apiKey: string,
  contentType: string
): Promise<string> {
  console.log(`Calling OpenAI API for ${contentType}...`);
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'あなたは優秀なコンテンツライターです。与えられた動画の内容を基に、魅力的で価値のあるコンテンツを作成してください。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: contentType === 'ブログ記事' ? 4000 : 
                   contentType === 'Instagram投稿' ? 1000 : 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error(`OpenAI API error for ${contentType}:`, response.status, errorData);
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log(`${contentType} generated successfully`);
    
    return data.choices[0]?.message?.content || `${contentType}の生成に失敗しました`;
    
  } catch (error) {
    console.error(`Error generating ${contentType}:`, error);
    throw new Error(`${contentType}の生成中にエラーが発生しました: ${error.message}`);
  }
}

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/generate-articles' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
