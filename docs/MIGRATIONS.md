# Database Migrations Log

このファイルは、データベースのマイグレーション履歴を記録します。
各マイグレーションには、実行日、変更内容、SQLコマンド、影響する機能を記載してください。

## Migration #001: 初期データベース構造
**実行日**: 2024-01-05
**実行者**: System Admin
**変更内容**: 初期テーブル作成
**影響する機能**: 全機能

```sql
-- Organizations, Users, Tools等の基本テーブル作成
-- 詳細は docs/DATABASE_SCHEMA.md 参照
```

---

## Migration #052: Phase 3 - 休暇管理テーブル追加
**実行日**: 2026-01-27
**実行者**: Claude (Phase 3実装)
**変更内容**: 休暇管理機能のためのテーブル追加

### 実行SQL
```sql
CREATE TABLE user_leave_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('paid', 'sick', 'personal', 'other')),
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, leave_date)
);

-- インデックス
CREATE INDEX idx_user_leave_records_user_id ON user_leave_records(user_id);
CREATE INDEX idx_user_leave_records_organization_id ON user_leave_records(organization_id);
CREATE INDEX idx_user_leave_records_leave_date ON user_leave_records(leave_date);
CREATE INDEX idx_user_leave_records_status ON user_leave_records(status);

-- RLSポリシー
ALTER TABLE user_leave_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view leave records in their organization"
  ON user_leave_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admin and Leaders can manage leave records"
  ON user_leave_records FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = user_leave_records.organization_id
      AND users.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Staff can view their own leave records"
  ON user_leave_records FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = user_leave_records.organization_id
      AND users.role IN ('admin', 'leader')
    )
  );

CREATE POLICY "Staff can create their own leave requests"
  ON user_leave_records FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

### テーブル構造
| カラム名 | 型 | 説明 |
|---------|---|------|
| `id` | UUID | 主キー |
| `user_id` | UUID | 対象スタッフID |
| `organization_id` | UUID | 組織ID |
| `leave_date` | DATE | 休暇日 |
| `leave_type` | TEXT | 休暇種別（paid/sick/personal/other） |
| `reason` | TEXT | 理由 |
| `status` | TEXT | ステータス（pending/approved/rejected） |
| `notes` | TEXT | 備考 |
| `created_by` | UUID | 作成者ID |
| `created_at` | TIMESTAMPTZ | 作成日時 |
| `updated_at` | TIMESTAMPTZ | 更新日時 |

### 制約
- `UNIQUE(user_id, leave_date)`: 同じスタッフが同じ日に複数の休暇申請不可
- `leave_type IN ('paid', 'sick', 'personal', 'other')`: 休暇種別の制限
- `status IN ('pending', 'approved', 'rejected')`: ステータスの制限

### 影響する機能
- 休暇申請・承認フロー（新規）
- 出退勤アラート生成（休暇中スタッフの除外）
- 勤怠管理レポート

### 確認方法
```sql
-- テーブル構造確認
\d user_leave_records

-- インデックス確認
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'user_leave_records';

-- RLSポリシー確認
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_leave_records';
```

### ロールバック手順
```sql
DROP TABLE IF EXISTS user_leave_records CASCADE;
```

### 実行日
2026-01-27

### 実行者
Claude (Phase 3実装)

---

## Migration #053: 夜勤ボタン打刻許可フラグ追加
**実行日**: 2026-01-31
**実行者**: Claude
**変更内容**: 勤怠管理設定に夜勤スタッフのボタン打刻許可フラグを追加

### 実行SQL
```sql
-- organization_attendance_settingsテーブルに夜勤ボタン許可フラグを追加
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS night_shift_button_allowed BOOLEAN DEFAULT false;

-- work_patternsテーブルに夜勤フラグを追加
ALTER TABLE work_patterns
ADD COLUMN IF NOT EXISTS is_night_shift BOOLEAN DEFAULT false;

-- コメント追加
COMMENT ON COLUMN organization_attendance_settings.night_shift_button_allowed IS '夜勤パターンのスタッフがQRコード必須設定でもボタン打刻を許可するかどうか';
COMMENT ON COLUMN work_patterns.is_night_shift IS '夜勤パターンかどうかのフラグ';
```

### 影響する機能
- 勤怠管理設定画面（基本設定タブ）
- 勤務パターン設定画面
- 出退勤打刻画面（打刻方法の判定ロジック）

### 確認方法
```sql
-- カラム追加確認
\d organization_attendance_settings
\d work_patterns

-- 既存データの確認
SELECT organization_id, night_shift_button_allowed
FROM organization_attendance_settings
LIMIT 5;

SELECT id, name, is_night_shift
FROM work_patterns
LIMIT 5;
```

### ロールバック手順
```sql
ALTER TABLE organization_attendance_settings
DROP COLUMN IF EXISTS night_shift_button_allowed;

ALTER TABLE work_patterns
DROP COLUMN IF EXISTS is_night_shift;
```

---

## Migration #054: GPS打刻機能の追加
### 実行日
2025-02-01

### 概要
GPS位置情報を使用した打刻機能の実装。ボタン打刻時のGPS取得オプションと、シフト制/夜勤での必須設定機能を追加。

### 実行SQL
```sql
-- attendance_records にGPS位置情報カラムを追加
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS clock_in_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS clock_in_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS clock_in_accuracy INTEGER,
ADD COLUMN IF NOT EXISTS clock_out_latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS clock_out_longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS clock_out_accuracy INTEGER;

-- organization_attendance_settings にGPS設定を追加
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS gps_requirement TEXT DEFAULT 'none'
  CHECK (gps_requirement IN ('none', 'all', 'shift_only', 'shift_night')),
ADD COLUMN IF NOT EXISTS gps_radius INTEGER DEFAULT 100;

-- sites に位置情報を追加
ALTER TABLE sites
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS gps_radius INTEGER DEFAULT 100;

-- 打刻可能エリアテーブルを新規作成
CREATE TABLE IF NOT EXISTS attendance_allowed_areas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  radius INTEGER NOT NULL DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 影響する機能
- 出勤簿画面（GPS取得機能）
- 勤怠管理設定画面（GPS設定）
- 打刻API（位置情報の保存）
- 現場マスタ（位置情報の登録）

### 確認クエリ
```sql
-- カラム追加確認
\d attendance_records
\d organization_attendance_settings
\d sites
\d attendance_allowed_areas
```

### ロールバック手順
```sql
ALTER TABLE attendance_records
DROP COLUMN IF EXISTS clock_in_latitude,
DROP COLUMN IF EXISTS clock_in_longitude,
DROP COLUMN IF EXISTS clock_in_accuracy,
DROP COLUMN IF EXISTS clock_out_latitude,
DROP COLUMN IF EXISTS clock_out_longitude,
DROP COLUMN IF EXISTS clock_out_accuracy;

ALTER TABLE organization_attendance_settings
DROP COLUMN IF EXISTS gps_requirement,
DROP COLUMN IF EXISTS gps_radius;

ALTER TABLE sites
DROP COLUMN IF EXISTS latitude,
DROP COLUMN IF EXISTS longitude,
DROP COLUMN IF EXISTS gps_radius;

DROP TABLE IF EXISTS attendance_allowed_areas;
```

---