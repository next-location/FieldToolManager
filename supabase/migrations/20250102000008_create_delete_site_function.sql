-- 現場削除用のストアドプロシージャ（RLSをバイパス）
CREATE OR REPLACE FUNCTION delete_site(site_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_org_id UUID;
  site_org_id UUID;
  user_role TEXT;
BEGIN
  -- ユーザーの組織IDとロールを取得
  SELECT organization_id, role INTO user_org_id, user_role
  FROM users
  WHERE id = auth.uid();

  -- ユーザーが見つからない場合はエラー
  IF user_org_id IS NULL THEN
    RAISE EXCEPTION 'ユーザー情報が見つかりません';
  END IF;

  -- 管理者またはマネージャーでない場合はエラー
  IF user_role NOT IN ('admin', 'manager') THEN
    RAISE EXCEPTION '権限がありません';
  END IF;

  -- 現場の組織IDを取得
  SELECT organization_id INTO site_org_id
  FROM sites
  WHERE id = site_id;

  -- 現場が見つからない場合はエラー
  IF site_org_id IS NULL THEN
    RAISE EXCEPTION '現場が見つかりません';
  END IF;

  -- 組織が一致しない場合はエラー
  IF user_org_id != site_org_id THEN
    RAISE EXCEPTION '他の組織の現場は削除できません';
  END IF;

  -- 削除実行
  UPDATE sites
  SET deleted_at = NOW()
  WHERE id = site_id;
END;
$$;

-- 実行権限を付与
GRANT EXECUTE ON FUNCTION delete_site(UUID) TO authenticated;
