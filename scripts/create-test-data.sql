-- テストデータ作成スクリプト
-- 実行前に組織IDとユーザーIDを確認してください

-- 組織IDとユーザーIDを変数として設定（実際の値に置き換えてください）
-- SELECT id FROM organizations; -- 組織ID確認
-- SELECT id FROM auth.users; -- ユーザーID確認

-- 以下は例です。実際のIDに置き換えて実行してください
DO $$
DECLARE
    v_org_id UUID := 'f6344498-fdac-4c07-900e-34e63edc3142'; -- 組織ID
    v_user_id UUID := '0979ab7b-1a1d-4c03-9331-e23627c9e62a'; -- ユーザーID
BEGIN
    -- 現場を作成
    INSERT INTO sites (organization_id, name, address, manager_id, is_active) VALUES
    (v_org_id, '渋谷ビル建設工事', '東京都渋谷区1-2-3', v_user_id, true),
    (v_org_id, '新宿マンション工事', '東京都新宿区4-5-6', v_user_id, true),
    (v_org_id, '品川オフィス改修工事', '東京都品川区7-8-9', v_user_id, true)
    ON CONFLICT (organization_id, name) DO NOTHING;

    -- 道具を作成
    INSERT INTO tools (organization_id, name, model_number, manufacturer, current_location, status, quantity) VALUES
    (v_org_id, '電動ドリル', 'DRL-2000', 'マキタ', 'warehouse', 'available', 5),
    (v_org_id, 'ハンマー', 'HMR-100', '藤原産業', 'warehouse', 'available', 10),
    (v_org_id, 'サンダー', 'SND-500', 'マキタ', 'warehouse', 'available', 3),
    (v_org_id, 'インパクトドライバー', 'IMP-3000', 'マキタ', 'warehouse', 'available', 4),
    (v_org_id, '脚立', 'LAD-6', 'アルインコ', 'warehouse', 'available', 8),
    (v_org_id, 'メジャー', 'MSR-550', 'タジマ', 'warehouse', 'available', 15),
    (v_org_id, '水平器', 'LVL-300', 'シンワ', 'warehouse', 'available', 6),
    (v_org_id, 'カッター', 'CTR-50', 'オルファ', 'warehouse', 'available', 20),
    (v_org_id, 'ペンチ', 'PNC-200', 'フジ矢', 'warehouse', 'available', 12),
    (v_org_id, '安全帯', 'SFT-800', 'タジマ', 'warehouse', 'available', 10)
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'テストデータの作成が完了しました';
END $$;
