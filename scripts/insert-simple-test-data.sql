-- シンプルなテストデータの挿入

-- 組織IDとユーザーIDを取得
DO $$
DECLARE
  v_org_id UUID;
  v_admin_id UUID;
  v_staff_id UUID;
  v_site1_id UUID;
  v_site2_id UUID;
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
    (v_org_id, '新宿オフィスビル改修工事', '東京都新宿区西新宿1-1-1', true),
    (v_org_id, '渋谷マンション塗装工事', '東京都渋谷区道玄坂2-2-2', true),
    (v_org_id, '品川倉庫新築工事', '東京都品川区東品川3-3-3', true);

  SELECT id INTO v_site1_id FROM sites WHERE organization_id = v_org_id AND name = '新宿オフィスビル改修工事' LIMIT 1;
  SELECT id INTO v_site2_id FROM sites WHERE organization_id = v_org_id AND name = '渋谷マンション塗装工事' LIMIT 1;

  RAISE NOTICE '現場1 ID: %', v_site1_id;
  RAISE NOTICE '現場2 ID: %', v_site2_id;

  -- 倉庫ロケーションを作成
  INSERT INTO warehouse_locations (organization_id, code, display_name, level, is_active)
  VALUES
    (v_org_id, 'WAREHOUSE-01', '本社倉庫', 0, true),
    (v_org_id, 'WAREHOUSE-02', '第2倉庫', 0, true);

  RAISE NOTICE '倉庫ロケーション作成完了';

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
      '外壁の下地処理を実施。ケレン作業と錆止め塗装を完了。明日から本塗装に入る予定。',
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
      '1階部分の塗装作業。下塗りを完了し、中塗りの準備を実施。天候も安定しており、順調に進捗中。',
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
      '足場の組立作業。安全確認を実施し、作業エリアを確保。次回から本格的な作業に入れる状態。',
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
    ),
    -- 差戻
    (
      v_org_id,
      v_site2_id,
      CURRENT_DATE - INTERVAL '3 days',
      'rainy',
      '雨天のため作業中止。',
      '08:30',
      '09:00',
      0,
      jsonb_build_array(
        jsonb_build_object('user_id', v_staff_id, 'name', 'スタッフ', 'work_hours', 0.5)
      ),
      NULL,
      50,
      'rejected',
      v_staff_id
    );

  RAISE NOTICE '作業報告書作成完了';

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
    '問題なく作業が完了しています。次回も引き続きお願いします。'
  FROM work_reports
  WHERE status = 'approved' AND organization_id = v_org_id
  LIMIT 1;

  -- 差戻報告書に却下履歴を追加
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
    'rejected',
    '作業内容が不十分です。雨天でも現場の状況確認など記載できることがあるはずです。再提出してください。'
  FROM work_reports
  WHERE status = 'rejected' AND organization_id = v_org_id
  LIMIT 1;

  RAISE NOTICE '承認履歴作成完了';

  RAISE NOTICE 'テストデータの挿入が完了しました';

END $$;
