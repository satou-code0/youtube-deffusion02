// Supabaseクライアントの初期化ファイル
// このファイルをimportすることで、全体で同じSupabaseインスタンスを利用できます。
// .envのVITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEYを参照します。

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ---
// 変更内容解説：
// - Supabase公式SDK（@supabase/supabase-js）を用いてクライアントを初期化
// - .envの値をViteのimport.meta.env経由で安全に参照
// - 今後のSupabase連携はこのsupabaseインスタンスをimportして利用 