-- 包括的なテストデータの挿入

-- 組織IDを取得
DO $$
DECLARE
  v_org_id UUID;
  v_admin_id UUID;
  v_staff_id UUID;
  v_site1_id UUID;
  v_site2_id UUID;
  v_site3_id UUID;
  v_warehouse_id UUID;
  v_tool_category_id UUID;
  v_tool_id UUID;
  v_tool_item1_id UUID;
  v_tool_item2_id UUID;
BEGIN
  -- 組織とユーザーIDを取得
  SELECT id INTO v_org_id FROM organizations WHERE name = 'テスト建設株式会社' LIMIT 1;
  SELECT id INTO v_admin_id FROM users WHERE email = 'admin@test.com' LIMIT 1;
  SELECT id INTO v_staff_id FROM users WHERE email = 'staff@test.com' LIMIT 1;

  RAISE NOTICE '組織ID: %', v_org_id;
  RAISE NOTICE '管理者ID: %', v_admin_id;
  RAISE NOTICE 'スタッフID: %', v_staff_id;

  -- 現場を作成
  INSERT INTO sites (organization_id, name, address, is_active)
  VALUES
    (v_org_id, '新宿オフィスビル改修工事', '東京都新宿区西新宿1-1-1', true);

  INSERT INTO sites (organization_id, name, address, is_active)
  VALUES
    (v_org_id, '渋谷マンション塗装工事', '東京都渋谷区道玄坂2-2-2', true);

  INSERT INTO sites (organization_id, name, address, is_active)
  VALUES
    (v_org_id, '品川倉庫新築工事', '東京都品川区東品川3-3-3', true);

  SELECT id INTO v_site1_id FROM sites WHERE organization_id = v_org_id AND name = '新宿オフィスビル改修工事' LIMIT 1;
  SELECT id INTO v_site2_id FROM sites WHERE organization_id = v_org_id AND name = '渋谷マンション塗装工事' LIMIT 1;
  SELECT id INTO v_site3_id FROM sites WHERE organization_id = v_org_id AND name = '品川倉庫新築工事' LIMIT 1;

  RAISE NOTICE '現場1 ID: %', v_site1_id;
  RAISE NOTICE '現場2 ID: %', v_site2_id;
  RAISE NOTICE '現場3 ID: %', v_site3_id;

  -- 倉庫ロケーションを作成
  INSERT INTO warehouse_locations (organization_id, name, location_type, is_active)
  VALUES
    (v_org_id, '本社倉庫', 'warehouse', true);

  INSERT INTO warehouse_locations (organization_id, name, location_type, is_active)
  VALUES
    (v_org_id, '第2倉庫', 'warehouse', true);

  INSERT INTO warehouse_locations (organization_id, name, location_type, is_active)
  VALUES
    (v_org_id, 'トラック1号車', 'vehicle', true);

  SELECT id INTO v_warehouse_id FROM warehouse_locations WHERE organization_id = v_org_id AND name = '本社倉庫' LIMIT 1;

  RAISE NOTICE '倉庫ID: %', v_warehouse_id;

  -- 道具カテゴリを作成
  INSERT INTO tool_categories (organization_id, name, description)
  VALUES
    (v_org_id, '電動工具', 'ドリル、サンダー等の電動工具');

  INSERT INTO tool_categories (organization_id, name, description)
  VALUES
    (v_org_id, '手工具', 'ハンマー、スパナ等の手工具');

  INSERT INTO tool_categories (organization_id, name, description)
  VALUES
    (v_org_id, '測定機器', 'レーザー距離計、水平器等');

  SELECT id INTO v_tool_category_id FROM tool_categories WHERE organization_id = v_org_id AND name = '電動工具' LIMIT 1;

  RAISE NOTICE 'カテゴリID: %', v_tool_category_id;

  -- 道具マスターを作成
  INSERT INTO tools (organization_id, category_id, name, model_number, manufacturer, unit_price, created_by)
  VALUES
    (v_org_id, v_tool_category_id, 'インパクトドライバー', 'TD171DRGX', 'マキタ', 45000, v_admin_id);

  SELECT id INTO v_tool_id FROM tools WHERE organization_id = v_org_id AND name = 'インパクトドライバー' LIMIT 1;

  RAISE NOTICE '道具マスターID: %', v_tool_id;

  -- 道具個体を作成（QRコード付き）
  INSERT INTO tool_items (organization_id, tool_id, serial_number, qr_code, purchase_date, current_location, current_site_id, status, created_by)
  VALUES
    (v_org_id, v_tool_id, 'TD-001', 'QR-TD-001', '2024-01-15', 'warehouse', NULL, 'available', v_admin_id);

  INSERT INTO tool_items (organization_id, tool_id, serial_number, qr_code, purchase_date, current_location, current_site_id, status, created_by)
  VALUES
    (v_org_id, v_tool_id, 'TD-002', 'QR-TD-002', '2024-01-15', 'site', v_site1_id, 'in_use', v_admin_id);

  SELECT id INTO v_tool_item1_id FROM tool_items WHERE serial_number = 'TD-001' LIMIT 1;
  SELECT id INTO v_tool_item2_id FROM tool_items WHERE serial_number = 'TD-002' LIMIT 1;

  RAISE NOTICE '道具個体1 ID: %', v_tool_item1_id;
  RAISE NOTICE '道具個体2 ID: %', v_tool_item2_id;

  -- 消耗品を作成
  INSERT INTO consumables (organization_id, name, category, unit, unit_price, min_stock_level, current_stock, created_by)
  VALUES
    (v_org_id, '作業用軍手', '保護具', '双', 150, 50, 100, v_admin_id),
    (v_org_id, 'マスキングテープ', '塗装資材', '個', 200, 20, 45, v_admin_id),
    (v_org_id, '養生シート', '養生資材', '枚', 500, 10, 25, v_admin_id);

  -- 作業報告書を作成
  INSERT INTO work_reports (
    organization_id,
    site_id,
    report_date,
    weather,
    description,
    work_start_time,
    work_end_time,
    break_minutes,
    workers,
    work_location,
    progress_rate,
    status,
    created_by
  )
  VALUES
    -- 下書き
    (
      v_org_id,
      v_site1_id,
      CURRENT_DATE,
      'sunny',
      '外壁の下地処理を実施。ケレン作業と錆止め塗装を完了。',
      '08:00',
      '17:00',
      60,
      jsonb_build_array(
        jsonb_build_object('user_id', v_admin_id, 'name', '管理者', 'work_hours', 8),
        jsonb_build_object('user_id', v_staff_id, 'name', 'スタッフ', 'work_hours', 8)
      ),
      '外壁東面',
      30,
      'draft',
      v_admin_id
    ),
    -- 提出済み
    (
      v_org_id,
      v_site2_id,
      CURRENT_DATE - INTERVAL '1 day',
      'cloudy',
      '1階部分の塗装作業。下塗りを完了し、中塗りの準備を実施。',
      '08:30',
      '17:30',
      60,
      jsonb_build_array(
        jsonb_build_object('user_id', v_staff_id, 'name', 'スタッフ', 'work_hours', 8)
      ),
      '1階外壁',
      50,
      'submitted',
      v_staff_id
    ),
    -- 承認済み
    (
      v_org_id,
      v_site1_id,
      CURRENT_DATE - INTERVAL '2 days',
      'sunny',
      '足場の組立作業。安全確認を実施し、作業エリアを確保。',
      '08:00',
      '16:00',
      60,
      jsonb_build_array(
        jsonb_build_object('user_id', v_admin_id, 'name', '管理者', 'work_hours', 7),
        jsonb_build_object('user_id', v_staff_id, 'name', 'スタッフ', 'work_hours', 7)
      ),
      '建物全体',
      10,
      'approved',
      v_admin_id
    );

  -- 承認済み報告書に承認履歴を追加
  INSERT INTO work_report_approvals (
    organization_id,
    work_report_id,
    approver_id,
    approver_name,
    action,
    comment
  )
  SELECT
    v_org_id,
    id,
    v_admin_id,
    '管理者',
    'approved',
    '問題なく作業が完了しています。'
  FROM work_reports
  WHERE status = 'approved'
  LIMIT 1;

  RAISE NOTICE 'テストデータの挿入が完了しました';

END $$;
