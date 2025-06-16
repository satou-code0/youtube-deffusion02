// Supabase認証サービス
// メール認証によるサインアップ・サインイン・サインアウトを提供します。
// UI側からこのサービスを呼び出して利用します。

import { supabase } from '../utils/supabaseClient';

/**
 * メールアドレスとパスワードで新規ユーザー登録
 * サインアップ後、usersテーブルにもレコードを作成
 */
export async function signUpWithEmail(email: string, password: string) {
  // サインアップ処理
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) return { data, error };

  // usersテーブルにも登録（AuthのユーザーIDを利用）
  const user = data.user;
  if (user) {
    const { error: insertError } = await supabase.from('users').insert([
      {
        id: user.id,
        email: user.email,
        used_count: 0,
        is_paid: false,
      },
    ]);
    // usersテーブルinsertのエラーも返却
    if (insertError) return { data, error: insertError };
  }
  return { data, error };
}

/**
 * メールアドレスとパスワードでログイン
 */
export async function signInWithEmail(email: string, password: string) {
  // サインイン処理
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

/**
 * サインアウト
 */
export async function signOut() {
  // サインアウト処理
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * 現在ログイン中のユーザーのused_count, is_paidを取得
 */
export async function getCurrentUserStatus() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { used_count: null, is_paid: null, error: '未ログイン' };
  const { data, error } = await supabase
    .from('users')
    .select('used_count, is_paid')
    .eq('id', user.id)
    .single();
  if (error) return { used_count: null, is_paid: null, error: error.message };
  return { used_count: data.used_count, is_paid: data.is_paid, error: null };
}

/**
 * 現在ログイン中ユーザーのused_countを+1する
 */
export async function incrementUsedCount() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '未ログイン' };
  const { error } = await supabase.rpc('increment_used_count', { user_id: user.id });
  return { error };
}

/**
 * APIキーを保存（上書き）
 */
export async function saveApiKeys(openaiKey: string, youtubeKey: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '未ログイン' };
  const { error } = await supabase
    .from('users')
    .update({ openai_api_key: openaiKey, youtube_api_key: youtubeKey })
    .eq('id', user.id);
  return { error };
}

/**
 * APIキーを取得
 */
export async function getApiKeys() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { openai: '', youtube: '', error: '未ログイン' };
  const { data, error } = await supabase
    .from('users')
    .select('openai_api_key, youtube_api_key')
    .eq('id', user.id)
    .single();
  if (error) return { openai: '', youtube: '', error: error.message };
  return { openai: data.openai_api_key || '', youtube: data.youtube_api_key || '', error: null };
}

/**
 * APIキーを削除
 */
export async function deleteApiKeys() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: '未ログイン' };
  const { error } = await supabase
    .from('users')
    .update({ openai_api_key: null, youtube_api_key: null })
    .eq('id', user.id);
  return { error };
}

// ---
// 変更内容解説：
// - サインアップ時にusersテーブルにもレコードを作成する処理を追加
// - AuthユーザーIDとemailを同期し、used_count, is_paidも初期化
// - Supabaseのメール認証（サインアップ・サインイン・サインアウト）用サービス関数を実装
// - UI側からimportして利用する想定
// - 現在ログイン中のユーザーの利用回数（used_count）と有料フラグ（is_paid）を取得する関数を追加
// - 記事生成成功時にusersテーブルのused_countを+1する関数を追加
// - APIキー（OpenAI/YouTube）をusersテーブルに保存・取得・削除する関数を追加 