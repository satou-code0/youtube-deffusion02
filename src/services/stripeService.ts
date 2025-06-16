import { supabase } from '../utils/supabaseClient';

/**
 * Stripe決済セッションを作成してリダイレクト
 */
export async function createStripeCheckoutSession(): Promise<void> {
  try {
    // 認証状態確認
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('認証が必要です');
    }

    // リクエストデータ
    const requestData = {
      priceId: 'price_1QZJJhGJJJJJJJJJJJJJJJJJ', // 実際のPrice IDに置き換え
      successUrl: `${window.location.origin}/success`,
      cancelUrl: `${window.location.origin}/cancel`
    };

    // fetchを使った直接的なHTTPリクエスト
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

    if (data.success && data.url) {
      // Stripe決済画面にリダイレクト
      window.location.href = data.url;
    } else {
      throw new Error(data.error || '決済セッションの作成に失敗しました');
    }

  } catch (error) {
    console.error('Stripe checkout session creation error:', error);
    throw error;
  }
}

/**
 * 決済成功後の処理
 */
export async function handlePaymentSuccess(sessionId: string): Promise<void> {
  try {
    // 認証状態確認
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('認証が必要です');
    }

    // リクエストデータ
    const requestData = { sessionId };

    // fetchを使った直接的なHTTPリクエスト
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/handle-payment-success`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(requestData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();

  } catch (error) {
    console.error('Payment success handling error:', error);
    throw error;
  }
}

/**
 * 決済キャンセル後の処理
 */
export async function handlePaymentCancel(): Promise<void> {
  console.log('Payment was cancelled by user');
  // 必要に応じてキャンセル処理を実装
} 