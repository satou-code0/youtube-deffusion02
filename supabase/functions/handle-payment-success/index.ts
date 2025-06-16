import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

// 環境変数の型定義
interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  STRIPE_SECRET_KEY: string;
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
    console.log('🎉 Payment success handling started');

    // 環境変数チェック
    const env = Deno.env.toObject() as Env;
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    // リクエスト解析
    console.log('📋 Payment success request details:', {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    });

    const requestBody = await req.text();
    console.log('📝 Payment success request body length:', requestBody.length);
    console.log('📝 Payment success request body:', requestBody);
    console.log('📝 Payment success request body type:', typeof requestBody);

    // 空のリクエストボディをチェック
    if (!requestBody || requestBody.trim() === '') {
      console.error('❌ Payment success request body is empty or whitespace only');
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

    const { sessionId } = body;

    if (!sessionId) {
      throw new Error('Missing sessionId');
    }

    // JWT認証
    const authHeader = req.headers.get('authorization');
    console.log('🔐 Auth header present:', !!authHeader);
    console.log('🔐 Auth header preview:', authHeader?.substring(0, 20) + '...');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ Missing or invalid authorization header');
      throw new Error('Authorization header is required');
    }

    const jwt = authHeader.replace('Bearer ', '');
    console.log('🔐 JWT length:', jwt.length);
    console.log('🔐 JWT preview:', jwt.substring(0, 50) + '...');

    // Supabaseクライアントでユーザー認証
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔐 Attempting to get user with JWT...');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(jwt);
    
    console.log('🔐 Auth result:', {
      user: user ? { id: user.id, email: user.email } : null,
      error: authError ? { message: authError.message, status: authError.status } : null
    });

    if (authError || !user) {
      console.error('❌ Authentication failed:', authError);
      throw new Error(`Authentication failed: ${authError?.message || 'User not found'}`);
    }

    console.log('✅ User authenticated:', user.id);

    // Stripe初期化
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // Stripe Checkout Sessionを取得して確認
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      throw new Error('Checkout session not found');
    }

    console.log('📋 Session details:', {
      id: session.id,
      payment_status: session.payment_status,
      customer: session.customer,
      client_reference_id: session.client_reference_id
    });

    // 決済が完了していることを確認
    if (session.payment_status !== 'paid') {
      throw new Error(`Payment not completed. Status: ${session.payment_status}`);
    }

    // セッションのユーザーIDと認証ユーザーIDが一致することを確認
    const sessionUserId = session.client_reference_id || session.metadata?.user_id;
    if (sessionUserId !== user.id) {
      throw new Error('Session user ID does not match authenticated user');
    }

    // ユーザーの現在の状態を確認
    console.log('📊 Fetching current user data...');
    const { data: userData, error: userDataError } = await supabaseClient
      .from('users')
      .select('is_paid, stripe_customer_id, stripe_subscription_id')
      .eq('id', user.id)
      .single();

    if (userDataError) {
      console.error('❌ Failed to fetch user data:', userDataError);
      console.error('❌ User data error details:', {
        message: userDataError.message,
        details: userDataError.details,
        hint: userDataError.hint,
        code: userDataError.code
      });
      throw new Error(`Failed to fetch user data: ${userDataError.message}`);
    }

    console.log('👤 Current user data:', userData);

    // まだ有料プランに更新されていない場合は更新
    if (!userData.is_paid) {
      console.log('💳 Updating user to paid plan...');
      
      const updateData = {
        is_paid: true,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string
      };
      
      console.log('📝 Update data:', updateData);
      
      const { data: updateResult, error: updateError } = await supabaseClient
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select();

      if (updateError) {
        console.error('❌ Failed to update user to paid plan:', updateError);
        console.error('❌ Update error details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code
        });
        throw new Error(`Failed to update user to paid plan: ${updateError.message}`);
      }

      console.log('✅ User update result:', updateResult);
      console.log('✅ User updated to paid plan:', user.id);
    } else {
      console.log('ℹ️ User already on paid plan');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment confirmed and user upgraded to paid plan',
        data: {
          sessionId: session.id,
          paymentStatus: session.payment_status,
          isPaid: true
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Payment success handling error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        stage: 'payment_success_handling_failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
}); 