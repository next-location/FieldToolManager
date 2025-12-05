-- シンプル統一型の出退勤設定にテーブルを更新
-- 古いoffice/site別の設定から新しい統一設定に移行

-- 新しいカラムを追加
ALTER TABLE organization_attendance_settings
  ADD COLUMN IF NOT EXISTS clock_method TEXT DEFAULT 'manual' CHECK (clock_method IN ('manual', 'qr_code', 'location')),
  ADD COLUMN IF NOT EXISTS allow_manual BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS allow_qr BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS allow_location BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_rotation_days INTEGER DEFAULT 7 CHECK (qr_rotation_days IN (1, 3, 7, 30)),
  ADD COLUMN IF NOT EXISTS monthly_report_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS monthly_report_day INTEGER DEFAULT 25 CHECK (monthly_report_day >= 1 AND monthly_report_day <= 31),
  ADD COLUMN IF NOT EXISTS monthly_report_recipients TEXT DEFAULT '';

-- 既存データを新しい形式に移行
UPDATE organization_attendance_settings
SET
  -- office_clock_methodsから取得（manual許可されていればtrue）
  allow_manual = COALESCE((office_clock_methods->>'manual')::boolean, true),
  -- office_clock_methodsから取得（qr_scanまたはqr_display許可されていればtrue）
  allow_qr = COALESCE(
    (office_clock_methods->>'qr_scan')::boolean OR
    (office_clock_methods->>'qr_display')::boolean,
    false
  ),
  -- デフォルトはfalse（新機能）
  allow_location = false,
  -- 既存のoffice_qr_rotation_daysを使用
  qr_rotation_days = COALESCE(office_qr_rotation_days, 7),
  -- clock_methodは最も優先される方法を設定
  clock_method = CASE
    WHEN (office_clock_methods->>'qr_scan')::boolean = true OR
         (office_clock_methods->>'qr_display')::boolean = true THEN 'qr_code'
    ELSE 'manual'
  END
WHERE
  allow_manual IS NULL OR
  allow_qr IS NULL OR
  allow_location IS NULL;

-- 古いカラムは後方互換性のため残す（将来的に削除予定）
-- COMMENT ON COLUMN organization_attendance_settings.office_attendance_enabled IS 'DEPRECATED: Use allow_manual instead';
-- COMMENT ON COLUMN organization_attendance_settings.office_clock_methods IS 'DEPRECATED: Use allow_manual, allow_qr instead';
