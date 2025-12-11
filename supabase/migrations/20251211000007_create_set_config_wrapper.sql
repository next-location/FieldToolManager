-- set_config関数のラッパーを作成
-- Supabase RPCから呼び出せるようにする

CREATE OR REPLACE FUNCTION set_audit_context(
  setting_name text,
  new_value text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config(setting_name, new_value, true);
  RETURN new_value;
END;
$$;

COMMENT ON FUNCTION set_audit_context(text, text) IS 'PostgreSQLセッション変数を設定するためのラッパー関数（監査ログ用）';
