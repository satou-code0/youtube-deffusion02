-- 利用回数をインクリメントする関数
CREATE OR REPLACE FUNCTION increment_used_count(user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE users 
  SET used_count = used_count + 1,
      updated_at = NOW()
  WHERE id = user_id;
  
  -- ユーザーが存在しない場合はエラーを発生させる
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found: %', user_id;
  END IF;
END;
$$; 