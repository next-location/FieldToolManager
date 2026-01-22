-- テスト株式会社（u44c5tks）の見積書ダミーデータ60件作成

-- まず組織IDとユーザーIDを取得
DO $$
DECLARE
  v_org_id UUID;
  v_user_id UUID;
  v_client_id UUID;
  v_project_id UUID;
  v_estimate_id UUID;
  i INTEGER;
BEGIN
  -- テスト株式会社のorganization_idを取得
  SELECT id INTO v_org_id FROM organizations WHERE subdomain = 'u44c5tks' LIMIT 1;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'テスト株式会社が見つかりません';
  END IF;

  -- 組織のユーザーを取得
  SELECT id INTO v_user_id FROM users WHERE organization_id = v_org_id AND is_active = true LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'ユーザーが見つかりません';
  END IF;

  -- 取引先を取得（なければ作成）
  SELECT id INTO v_client_id FROM clients WHERE organization_id = v_org_id AND deleted_at IS NULL LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO clients (
      organization_id,
      name,
      client_code,
      client_type,
      is_active
    ) VALUES (
      v_org_id,
      'テスト取引先',
      'TEST001',
      'customer',
      true
    ) RETURNING id INTO v_client_id;
  END IF;

  -- 案件を取得（なければ作成）
  SELECT id INTO v_project_id FROM projects WHERE organization_id = v_org_id LIMIT 1;

  IF v_project_id IS NULL THEN
    INSERT INTO projects (
      organization_id,
      project_code,
      project_name,
      client_id,
      status,
      start_date
    ) VALUES (
      v_org_id,
      'PRJ001',
      'テスト案件',
      v_client_id,
      'in_progress',
      CURRENT_DATE
    ) RETURNING id INTO v_project_id;
  END IF;

  -- 見積書60件を作成
  FOR i IN 1..60 LOOP
    INSERT INTO estimates (
      organization_id,
      estimate_number,
      client_id,
      project_id,
      estimate_date,
      valid_until,
      total_amount,
      tax_amount,
      subtotal,
      status,
      created_by,
      title,
      notes
    ) VALUES (
      v_org_id,
      'EST-' || TO_CHAR(CURRENT_DATE, 'YYYYMM') || '-' || LPAD(i::TEXT, 4, '0'),
      v_client_id,
      v_project_id,
      CURRENT_DATE - (i || ' days')::INTERVAL,  -- 日付をずらす
      CURRENT_DATE + (30 - i) * INTERVAL '1 day',  -- 有効期限
      1000000 + (i * 10000),  -- 金額を変える
      (1000000 + (i * 10000)) * 0.1,  -- 消費税
      1000000 + (i * 10000),
      CASE
        WHEN i % 5 = 0 THEN 'draft'
        WHEN i % 5 = 1 THEN 'submitted'
        WHEN i % 5 = 2 THEN 'sent'
        WHEN i % 5 = 3 THEN 'accepted'
        ELSE 'rejected'
      END,
      v_user_id,
      'テスト見積 ' || i || '件目',
      'これはテスト用のダミーデータです'
    ) RETURNING id INTO v_estimate_id;

    -- 見積明細を1件追加
    INSERT INTO estimate_items (
      estimate_id,
      item_type,
      item_name,
      description,
      quantity,
      unit,
      unit_price,
      amount,
      display_order
    ) VALUES (
      v_estimate_id,
      'construction',
      'テスト工事項目 ' || i,
      'テスト工事項目の詳細説明',
      1,
      '式',
      1000000 + (i * 10000),
      1000000 + (i * 10000),
      1
    );
  END LOOP;

  RAISE NOTICE '見積書60件の作成が完了しました';
  RAISE NOTICE 'Organization ID: %', v_org_id;
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Client ID: %', v_client_id;
  RAISE NOTICE 'Project ID: %', v_project_id;
END $$;
