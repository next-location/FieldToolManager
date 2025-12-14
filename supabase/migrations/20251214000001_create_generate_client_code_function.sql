-- 取引先コード生成関数
CREATE OR REPLACE FUNCTION generate_client_code(
  org_id UUID,
  prefix TEXT DEFAULT 'CL'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_number INTEGER;
  new_code TEXT;
BEGIN
  -- 組織内の最大番号を取得（削除済みも含む）
  SELECT COALESCE(MAX(
    CASE
      WHEN client_code ~ ('^' || prefix || '[0-9]+$')
      THEN CAST(SUBSTRING(client_code FROM LENGTH(prefix) + 1) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM clients
  WHERE organization_id = org_id;

  -- コード生成（例: CL0001）
  new_code := prefix || LPAD(next_number::TEXT, 4, '0');

  RETURN new_code;
END;
$$;

-- 関数の説明
COMMENT ON FUNCTION generate_client_code IS '組織内で一意な取引先コードを生成する関数';
