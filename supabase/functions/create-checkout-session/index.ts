import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

// 環境変数の型定義
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
}

// CORS設定
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req: Request) => {
  // CORS preflight対応
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🚀 Stripe checkout session creation started');

    // 環境変数チェック
    const env = Deno.env.toObject() as Env;
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    // リクエスト解析
    console.log('📋 Request details:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    });

    const requestBody = await req.text();
    console.log('📝 Request body length:', requestBody.length);
    console.log('📝 Request body:', requestBody);
    console.log('📝 Request body type:', typeof requestBody);

    // 空のリクエストボディをチェック
    if (!requestBody || requestBody.trim() === '') {
      console.error('❌ Request body is empty or whitespace only');
      throw new Error('Request body is empty');
    }

    let body;
    try {
      body = JSON.parse(requestBody);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Raw request body:', JSON.stringify(requestBody));
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }

    // bodyがnullまたはundefinedの場合をチェック
    if (!body || typeof body !== 'object') {
      throw new Error('Request body must be a valid JSON object');
    }

    const { priceId, successUrl, cancelUrl } = body;

    if (!priceId || !successUrl || !cancelUrl) {
      throw new Error('Missing required fields: priceId, successUrl, cancelUrl');
    }

    // JWT認証
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid Authorization header');
    }

    const jwt = authHeader.replace('Bearer ', '');

    // Supabaseクライアント初期化（Service Role Keyを使用）
    const supabaseClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // JWTトークン検証とユーザー取得（Service Role Keyで検証）
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    
    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      throw new Error(`Authentication failed: ${userError?.message || 'Unknown error'}`);
    }

    console.log('✅ User authenticated:', user.id);

    // Stripe初期化
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // Stripe Checkout Session作成
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription', // または 'payment' (一回払いの場合)
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      client_reference_id: user.id, // ユーザーIDを保存
      metadata: {
        user_id: user.id,
        user_email: user.email || '',
      },
      customer_email: user.email,
      allow_promotion_codes: true,
    });

    console.log('✅ Stripe session created:', session.id);

    return new Response(
      JSON.stringify({
        success: true,
        url: session.url,
        sessionId: session.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Checkout session creation error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        stage: 'checkout_session_creation_failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}); 