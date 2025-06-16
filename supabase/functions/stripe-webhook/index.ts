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

Deno.serve(async (req: Request) => {
  try {
    console.log('🎣 Stripe webhook received');

    // 環境変数チェック
    const env = Deno.env.toObject() as Env;
    const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
    const missingVars = requiredEnvVars.filter(varName => !env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    // Stripe初期化
    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
    });

    // Webhook署名検証
    const signature = req.headers.get('stripe-signature');
    if (!signature) {
      throw new Error('Missing stripe-signature header');
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err);
      return new Response('Webhook signature verification failed', { status: 400 });
    }

    console.log('✅ Webhook verified, event type:', event.type);

    // Supabaseクライアント初期化
    const supabaseClient = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );

    // イベントタイプ別処理
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log('💳 Checkout session completed:', session.id);

        // ユーザーIDを取得
        const userId = session.client_reference_id || session.metadata?.user_id;
        if (!userId) {
          console.error('❌ No user ID found in session');
          break;
        }

        // ユーザーを有料プランに更新
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ 
            is_paid: true,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);

        if (updateError) {
          console.error('❌ Failed to update user to paid plan:', updateError);
        } else {
          console.log('✅ User updated to paid plan:', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('🔄 Subscription updated:', subscription.id);

        // サブスクリプション状態に基づいてユーザー状態を更新
        const isPaid = subscription.status === 'active';
        
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ 
            is_paid: isPaid,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('❌ Failed to update subscription status:', updateError);
        } else {
          console.log('✅ Subscription status updated:', subscription.id, 'isPaid:', isPaid);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log('❌ Subscription cancelled:', subscription.id);

        // ユーザーを無料プランに戻す
        const { error: updateError } = await supabaseClient
          .from('users')
          .update({ 
            is_paid: false,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) {
          console.error('❌ Failed to downgrade user to free plan:', updateError);
        } else {
          console.log('✅ User downgraded to free plan for subscription:', subscription.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.log('💸 Payment failed for invoice:', invoice.id);

        // 必要に応じて支払い失敗の処理を実装
        // 例：ユーザーに通知メール送信、アカウント一時停止など
        break;
      }

      default:
        console.log('ℹ️ Unhandled event type:', event.type);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
}); 