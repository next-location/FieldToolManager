# 出退勤管理機能 完全仕様書

> **作成日**: 2025-12-04
> **バージョン**: 1.0
> **ステータス**: Phase 1-3実装予定（顔認証はPhase 4以降）

---

## 📋 目次

1. [概要](#概要)
2. [機能要件](#機能要件)
3. [データベース設計](#データベース設計)
4. [API設計](#api設計)
5. [UI/UX設計](#uiux設計)
6. [実装フェーズ](#実装フェーズ)
7. [セキュリティ要件](#セキュリティ要件)
8. [テスト計画](#テスト計画)

---

## 概要

### 目的
スタッフの出退勤を記録・管理し、勤怠データを可視化することで労務管理を効率化する。

### 対象ユーザー
- **全スタッフ**: 自分の出退勤を打刻
- **管理者/マネージャー**: 全スタッフの勤怠管理・月次集計・手動修正

### 主要機能
1. **出退勤打刻**: 会社・現場での出退勤記録
2. **打刻方法**: 手動・QRスキャン・QR常時表示（タブレット）
3. **休憩時間管理**: none/simple/detailed の3モード
4. **勤怠一覧**: 日別・スタッフ別の閲覧
5. **月次集計**: 勤務日数・時間の自動計算
6. **アラート通知**: 出退勤忘れ・QR期限切れ
7. **手動修正**: 打刻忘れの管理者による修正

---

## 機能要件

### 1. 組織設定

企業ごとにカスタマイズ可能な設定:

| 設定項目 | 選択肢 | デフォルト値 |
|---------|--------|------------|
| **会社出勤機能** | 使用する / 使用しない | 使用する |
| **会社打刻方法** | 手動 / QRスキャン / QR常時表示（複数選択可） | 手動 + QRスキャン |
| **会社QR更新頻度** | 1日 / 3日 / 7日 / 30日 | 7日 |
| **現場出勤機能** | 使用する / 使用しない | 使用する |
| **現場打刻方法** | 手動 / QRスキャン / QR常時表示（複数選択可） | 手動 + QRスキャン |
| **現場QRタイプ** | リーダー発行 / 固定QR / 両方 | リーダー発行 |
| **休憩時間記録** | none / simple / detailed | simple |
| **自動休憩控除** | 有効 / 無効 | 無効 |
| **控除時間** | 分単位 | 45分 |
| **出勤忘れ通知** | 有効 / 無効 | 有効 |
| **出勤忘れ通知時刻** | HH:MM | 10:00 |
| **退勤忘れ通知** | 有効 / 無効 | 有効 |
| **退勤忘れ通知時刻** | HH:MM | 20:00 |
| **管理者日次レポート** | 有効 / 無効 | 有効 |
| **レポートメール送信** | 有効 / 無効 | 有効 |
| **QR期限切れ通知** | 有効 / 無効 | 有効 |
| **長時間労働アラート** | 時間数 | 12時間 |

### 2. 出勤打刻フロー

#### A. 会社出勤の場合

**パターン1: 手動打刻**
```
1. ダッシュボードで「会社に出勤」ボタンをタップ
2. 退勤予定先を選択（同じ場所 / 直帰 / 現場）
3. 「出勤する」確定
4. 完了画面表示
```

**パターン2: QRスキャン**
```
1. 会社入口のQRコードをスキャン
2. 自動的に会社出勤として記録
3. 完了画面表示
```

**パターン3: QR常時表示（タブレット設置）**
```
1. タブレット画面にQRコードを常時表示
2. スタッフがスマホでQRスキャン
3. 自動記録
```

#### B. 現場直行の場合

**パターン1: 手動打刻**
```
1. ダッシュボードで「現場に直行」ボタンをタップ
2. 現場を選択
3. 退勤予定先を選択
4. 「出勤する」確定
```

**パターン2: リーダーQRスキャン**
```
1. リーダーがアプリで「現場QRを表示」
2. 他のスタッフがリーダーのQRをスキャン
3. 自動的にその現場への出勤として記録
4. リーダー自身は手動で出勤打刻
```

**パターン3: 固定QR（現場タブレット）**
```
1. 現場にタブレットを設置
2. 現場専用QRを常時表示
3. スタッフがスキャンして出勤
```

### 3. 退勤打刻フロー

```
1. ダッシュボードで「退勤する」ボタンをタップ
2. 出勤時の予定と異なる場合は変更可能
3. 「退勤する」確定
4. 完了画面表示
```

### 4. 休憩時間管理

#### Mode 1: none（記録しない）
- 休憩時間UIを非表示
- 6時間超過時に自動控除（設定による）

#### Mode 2: simple（1日1回）
```
休憩開始: 「休憩開始」ボタンをタップ
休憩終了: 「休憩終了」ボタンをタップ
```

#### Mode 3: detailed（複数回可能）
```
複数回の休憩を記録:
- 1回目: 12:00-12:45 (45分)
- 2回目: 15:00-15:15 (15分)
- 合計: 1時間0分
```

### 5. 勤怠一覧（管理者/マネージャー用）

#### フィルター機能
- 日付範囲選択
- スタッフ選択（複数選択可）
- 出勤先フィルター（会社 / 現場別）
- ステータスフィルター（出勤中 / 退勤済み / 未出勤）

#### 表示項目
| 列 | 内容 |
|----|------|
| 日付 | YYYY/MM/DD |
| スタッフ名 | 名前 + 部署 |
| 出勤 | 時刻 + 出勤先 |
| 退勤 | 時刻 + 退勤先 |
| 勤務時間 | HH:MM |
| 休憩時間 | HH:MM |
| 実労働時間 | HH:MM |
| ステータス | 🟢勤務中 / ✅退勤済み |
| 操作 | 編集 / 削除 |

#### アクション
- CSVエクスポート
- 手動追加（打刻忘れ対応）
- 一括編集

### 6. 月次集計レポート

#### スタッフ別集計
```
山田 太郎
━━━━━━━━━━━━━━━━━
出勤日数:        20日
欠勤日数:        2日
遅刻回数:        1回
早退回数:        0回
総勤務時間:      160時間30分
平均勤務時間:    8時間2分
残業時間:        10時間30分
━━━━━━━━━━━━━━━━━
```

#### 現場別集計
```
A現場（東京都渋谷区○○ビル）
━━━━━━━━━━━━━━━━━
稼働日数:        15日
延べ人数:        45人
総稼働時間:      360時間
平均人数:        3人/日
━━━━━━━━━━━━━━━━━
```

### 7. アラート通知

#### 出勤忘れアラート
```
対象: 本人
タイミング: 10:00時点で未出勤
通知方法: アプリ内通知
メッセージ: 「本日まだ出勤していません。打刻をお願いします。」
```

#### 退勤忘れアラート
```
対象: 本人
タイミング: 20:00時点で未退勤
通知方法: アプリ内通知
メッセージ: 「退勤打刻をお願いします。」
```

#### 未出勤者レポート（管理者向け）
```
対象: 管理者/マネージャー
タイミング: 毎朝10:00
通知方法: アプリ内通知 + メール
内容: 未出勤スタッフのリスト
```

#### QR期限切れ通知
```
対象: 管理者
タイミング: QR更新の1日前
通知方法: アプリ内通知 + メール
メッセージ: 「明日、会社QRコードが更新されます。新しいQRを印刷してください。」
```

#### 長時間労働アラート
```
対象: 管理者/マネージャー
タイミング: 12時間超過時
通知方法: アプリ内通知
メッセージ: 「山田太郎さんが12時間以上勤務しています。」
```

---

## データベース設計

### 1. organization_attendance_settings

組織ごとの出退勤設定。

```sql
CREATE TABLE organization_attendance_settings (
  organization_id UUID PRIMARY KEY REFERENCES organizations(id),

  -- 会社出勤設定
  office_attendance_enabled BOOLEAN DEFAULT true,
  office_clock_methods JSONB NOT NULL DEFAULT '{"manual":true,"qr_scan":false,"qr_display":false}',
  office_qr_rotation_days INTEGER DEFAULT 7 CHECK (office_qr_rotation_days IN (1, 3, 7, 30)),

  -- 現場出勤設定
  site_attendance_enabled BOOLEAN DEFAULT true,
  site_clock_methods JSONB NOT NULL DEFAULT '{"manual":true,"qr_scan":false,"qr_display":false}',
  site_qr_type TEXT DEFAULT 'leader' CHECK (site_qr_type IN ('leader', 'fixed', 'both')),

  -- 休憩時間設定
  break_time_mode TEXT DEFAULT 'simple' CHECK (break_time_mode IN ('none', 'simple', 'detailed')),
  auto_break_deduction BOOLEAN DEFAULT false,
  auto_break_minutes INTEGER DEFAULT 45,

  -- 通知設定
  checkin_reminder_enabled BOOLEAN DEFAULT true,
  checkin_reminder_time TIME DEFAULT '10:00',
  checkout_reminder_enabled BOOLEAN DEFAULT true,
  checkout_reminder_time TIME DEFAULT '20:00',
  admin_daily_report_enabled BOOLEAN DEFAULT true,
  admin_daily_report_time TIME DEFAULT '10:00',
  admin_daily_report_email BOOLEAN DEFAULT true,
  qr_expiry_alert_enabled BOOLEAN DEFAULT true,
  qr_expiry_alert_email BOOLEAN DEFAULT true,
  overtime_alert_enabled BOOLEAN DEFAULT false,
  overtime_alert_hours INTEGER DEFAULT 12,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE organization_attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can manage their own settings"
  ON organization_attendance_settings
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

### 2. site_attendance_settings

現場ごとの出退勤設定（site_qr_type='both'の場合のみ使用）。

```sql
CREATE TABLE site_attendance_settings (
  site_id UUID PRIMARY KEY REFERENCES sites(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  qr_mode TEXT NOT NULL DEFAULT 'leader' CHECK (qr_mode IN ('leader', 'fixed')),
  has_tablet BOOLEAN DEFAULT false,
  tablet_access_token TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE site_attendance_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's site settings"
  ON site_attendance_settings FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage site settings"
  ON site_attendance_settings FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

### 3. office_qr_codes

会社出勤用のQRコード（定期更新型）。

```sql
CREATE TABLE office_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  qr_data TEXT NOT NULL UNIQUE,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 有効期間の重複防止
  EXCLUDE USING gist (
    organization_id WITH =,
    tstzrange(valid_from, valid_until) WITH &&
  ) WHERE (is_active = true)
);

CREATE INDEX idx_office_qr_codes_org_active ON office_qr_codes(organization_id, is_active);
CREATE INDEX idx_office_qr_codes_qr_data ON office_qr_codes(qr_data);

-- RLS
ALTER TABLE office_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's QR codes"
  ON office_qr_codes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage QR codes"
  ON office_qr_codes FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

### 4. site_qr_codes

現場出勤用のQRコード（リーダー発行型 or 固定型）。

```sql
CREATE TABLE site_qr_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  site_id UUID NOT NULL REFERENCES sites(id),
  qr_type TEXT NOT NULL CHECK (qr_type IN ('leader', 'fixed')),

  -- リーダー型の場合
  leader_user_id UUID REFERENCES users(id),
  generated_date DATE,

  -- 固定型の場合
  qr_data TEXT,
  expires_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- リーダー型は1日1レコード
  UNIQUE(site_id, leader_user_id, generated_date)
    WHERE (qr_type = 'leader'),

  -- 固定型は現場ごとに1つ
  UNIQUE(site_id)
    WHERE (qr_type = 'fixed' AND is_active = true)
);

CREATE INDEX idx_site_qr_codes_org ON site_qr_codes(organization_id);
CREATE INDEX idx_site_qr_codes_site ON site_qr_codes(site_id);
CREATE INDEX idx_site_qr_codes_leader ON site_qr_codes(leader_user_id, generated_date) WHERE qr_type = 'leader';

-- RLS
ALTER TABLE site_qr_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their organization's site QR codes"
  ON site_qr_codes FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Leaders can generate their site QR codes"
  ON site_qr_codes FOR INSERT
  WITH CHECK (
    qr_type = 'leader'
    AND leader_user_id = auth.uid()
    AND organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage site QR codes"
  ON site_qr_codes FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

### 5. attendance_records

出退勤記録のメインテーブル。

```sql
CREATE TABLE attendance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  user_id UUID NOT NULL REFERENCES users(id),
  date DATE NOT NULL,

  -- 出勤情報
  clock_in_time TIMESTAMPTZ NOT NULL,
  clock_in_location_type TEXT NOT NULL CHECK (clock_in_location_type IN ('office', 'site', 'remote')),
  clock_in_site_id UUID REFERENCES sites(id),
  clock_in_method TEXT NOT NULL CHECK (clock_in_method IN ('manual', 'qr')),
  clock_in_device_type TEXT CHECK (clock_in_device_type IN ('mobile', 'tablet', 'desktop')),

  -- 退勤予定
  planned_checkout_location_type TEXT CHECK (planned_checkout_location_type IN ('office', 'site', 'remote', 'direct_home')),
  planned_checkout_site_id UUID REFERENCES sites(id),

  -- 退勤情報（実績）
  clock_out_time TIMESTAMPTZ,
  clock_out_location_type TEXT CHECK (clock_out_location_type IN ('office', 'site', 'remote', 'direct_home')),
  clock_out_site_id UUID REFERENCES sites(id),
  clock_out_method TEXT CHECK (clock_out_method IN ('manual', 'qr')),
  clock_out_device_type TEXT CHECK (clock_out_device_type IN ('mobile', 'tablet', 'desktop')),

  -- 休憩時間
  break_records JSONB DEFAULT '[]',
  -- 例: [{"start": "2025-12-04T12:00:00Z", "end": "2025-12-04T12:45:00Z"}]

  auto_break_deducted_minutes INTEGER DEFAULT 0,

  -- メタ情報
  notes TEXT,
  is_offline_sync BOOLEAN DEFAULT false,
  synced_at TIMESTAMPTZ,
  is_manually_edited BOOLEAN DEFAULT false,
  edited_by UUID REFERENCES users(id),
  edited_at TIMESTAMPTZ,
  edited_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- 1日1レコード制約
  UNIQUE(organization_id, user_id, date)
);

CREATE INDEX idx_attendance_records_org ON attendance_records(organization_id);
CREATE INDEX idx_attendance_records_user_date ON attendance_records(user_id, date DESC);
CREATE INDEX idx_attendance_records_date ON attendance_records(date DESC);
CREATE INDEX idx_attendance_records_org_date ON attendance_records(organization_id, date DESC);

-- RLS
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance records"
  ON attendance_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attendance records"
  ON attendance_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attendance records"
  ON attendance_records FOR UPDATE
  USING (auth.uid() = user_id AND is_manually_edited = false);

CREATE POLICY "Admins can view all attendance records"
  ON attendance_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins can manage all attendance records"
  ON attendance_records FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

### 6. attendance_alerts

アラート履歴テーブル。

```sql
CREATE TABLE attendance_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('missing_checkin', 'missing_checkout', 'qr_expiring', 'overtime')),
  target_user_id UUID REFERENCES users(id),
  target_date DATE,
  message TEXT NOT NULL,
  metadata JSONB,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_attendance_alerts_org ON attendance_alerts(organization_id);
CREATE INDEX idx_attendance_alerts_user ON attendance_alerts(target_user_id);
CREATE INDEX idx_attendance_alerts_date ON attendance_alerts(target_date DESC);
CREATE INDEX idx_attendance_alerts_resolved ON attendance_alerts(organization_id, is_resolved);

-- RLS
ALTER TABLE attendance_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts"
  ON attendance_alerts FOR SELECT
  USING (auth.uid() = target_user_id);

CREATE POLICY "Admins can view all alerts"
  ON attendance_alerts FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "System can insert alerts"
  ON attendance_alerts FOR INSERT
  WITH CHECK (true);
```

### 7. terminal_devices

タブレット端末管理テーブル。

```sql
CREATE TABLE terminal_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  device_name TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('office', 'site')),
  site_id UUID REFERENCES sites(id),
  access_token TEXT NOT NULL UNIQUE,
  last_accessed_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_terminal_devices_org ON terminal_devices(organization_id);
CREATE INDEX idx_terminal_devices_token ON terminal_devices(access_token);

-- RLS
ALTER TABLE terminal_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage terminal devices"
  ON terminal_devices FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

---

## API設計

### 1. 組織設定API

#### GET /api/attendance/settings
組織の出退勤設定を取得。

**レスポンス:**
```json
{
  "organization_id": "uuid",
  "office_attendance_enabled": true,
  "office_clock_methods": {
    "manual": true,
    "qr_scan": true,
    "qr_display": false
  },
  "office_qr_rotation_days": 7,
  "site_attendance_enabled": true,
  "site_clock_methods": {
    "manual": true,
    "qr_scan": true,
    "qr_display": false
  },
  "site_qr_type": "leader",
  "break_time_mode": "simple",
  "auto_break_deduction": false,
  "auto_break_minutes": 45,
  "checkin_reminder_enabled": true,
  "checkin_reminder_time": "10:00",
  "checkout_reminder_enabled": true,
  "checkout_reminder_time": "20:00",
  "admin_daily_report_enabled": true,
  "admin_daily_report_email": true,
  "qr_expiry_alert_enabled": true,
  "overtime_alert_hours": 12
}
```

#### PUT /api/attendance/settings
組織の出退勤設定を更新（管理者のみ）。

**リクエスト:**
```json
{
  "office_clock_methods": {
    "manual": true,
    "qr_scan": false,
    "qr_display": true
  },
  "break_time_mode": "detailed"
}
```

### 2. 出退勤打刻API

#### POST /api/attendance/clock-in
出勤打刻。

**リクエスト:**
```json
{
  "location_type": "office" | "site" | "remote",
  "site_id": "uuid（現場の場合）",
  "method": "manual" | "qr",
  "qr_data": "string（QRの場合）",
  "device_type": "mobile" | "tablet" | "desktop",
  "planned_checkout_location_type": "office" | "site" | "direct_home",
  "planned_checkout_site_id": "uuid（現場の場合）"
}
```

**レスポンス:**
```json
{
  "success": true,
  "attendance_record": {
    "id": "uuid",
    "user_id": "uuid",
    "date": "2025-12-04",
    "clock_in_time": "2025-12-04T09:00:00Z",
    "clock_in_location_type": "office",
    "clock_in_method": "manual"
  }
}
```

#### POST /api/attendance/clock-out
退勤打刻。

**リクエスト:**
```json
{
  "location_type": "office" | "site" | "direct_home",
  "site_id": "uuid（現場の場合）",
  "method": "manual" | "qr",
  "qr_data": "string（QRの場合）",
  "device_type": "mobile" | "tablet" | "desktop"
}
```

### 3. 休憩時間API

#### POST /api/attendance/break/start
休憩開始。

**リクエスト:**
```json
{
  "date": "2025-12-04"
}
```

#### POST /api/attendance/break/end
休憩終了。

**リクエスト:**
```json
{
  "date": "2025-12-04"
}
```

### 4. 勤怠一覧API

#### GET /api/attendance/records
勤怠記録の一覧取得。

**クエリパラメータ:**
- `start_date`: 開始日（YYYY-MM-DD）
- `end_date`: 終了日（YYYY-MM-DD）
- `user_ids`: スタッフID（カンマ区切り）
- `location_type`: office | site | all
- `status`: clocked_in | clocked_out | missing
- `page`: ページ番号
- `limit`: 1ページあたりの件数

**レスポンス:**
```json
{
  "records": [
    {
      "id": "uuid",
      "date": "2025-12-04",
      "user": {
        "id": "uuid",
        "name": "山田太郎",
        "department": "第一営業部"
      },
      "clock_in_time": "2025-12-04T09:00:00Z",
      "clock_in_location": "会社",
      "clock_out_time": "2025-12-04T18:00:00Z",
      "clock_out_location": "会社",
      "work_hours": "09:00",
      "break_minutes": 45,
      "actual_work_hours": "08:15",
      "status": "clocked_out",
      "is_manually_edited": false
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

#### GET /api/attendance/records/[id]
特定の勤怠記録を取得。

#### PUT /api/attendance/records/[id]
勤怠記録を手動修正（管理者のみ）。

**リクエスト:**
```json
{
  "clock_in_time": "2025-12-04T09:00:00Z",
  "clock_out_time": "2025-12-04T18:00:00Z",
  "edited_reason": "打刻忘れのため管理者が手動入力"
}
```

#### DELETE /api/attendance/records/[id]
勤怠記録を削除（管理者のみ）。

### 5. QRコード管理API

#### GET /api/attendance/qr/office/current
現在有効な会社QRコードを取得。

**レスポンス:**
```json
{
  "id": "uuid",
  "qr_data": "ATT:ORG123:TOKEN456:2025-12-10",
  "valid_from": "2025-12-04T00:00:00Z",
  "valid_until": "2025-12-10T23:59:59Z",
  "days_remaining": 6
}
```

#### POST /api/attendance/qr/office/generate
会社QRコードを手動生成（管理者のみ）。

#### GET /api/attendance/qr/site/[site_id]/leader
リーダー用の現場QRコードを生成。

**レスポンス:**
```json
{
  "id": "uuid",
  "qr_data": "SITE:SITE123:LEADER456:2025-12-04",
  "site_name": "東京都渋谷区○○ビル",
  "generated_date": "2025-12-04",
  "expires_at": "2025-12-04T23:59:59Z"
}
```

#### GET /api/attendance/qr/site/[site_id]/fixed
現場固定QRコードを取得（管理者のみ）。

#### POST /api/attendance/qr/verify
QRコードの検証。

**リクエスト:**
```json
{
  "qr_data": "ATT:ORG123:TOKEN456:2025-12-10"
}
```

**レスポンス:**
```json
{
  "valid": true,
  "type": "office" | "site",
  "organization_id": "uuid",
  "site_id": "uuid（現場の場合）"
}
```

### 6. 月次集計API

#### GET /api/attendance/monthly-report
月次レポートを取得。

**クエリパラメータ:**
- `year`: 年（YYYY）
- `month`: 月（1-12）
- `user_id`: スタッフID（省略時は全員）

**レスポンス:**
```json
{
  "year": 2025,
  "month": 12,
  "users": [
    {
      "user_id": "uuid",
      "name": "山田太郎",
      "department": "第一営業部",
      "work_days": 20,
      "absent_days": 2,
      "late_count": 1,
      "early_leave_count": 0,
      "total_work_hours": "160:30",
      "average_work_hours": "08:02",
      "overtime_hours": "10:30"
    }
  ],
  "sites": [
    {
      "site_id": "uuid",
      "site_name": "A現場",
      "work_days": 15,
      "total_staff_count": 45,
      "total_work_hours": "360:00",
      "average_staff_per_day": 3
    }
  ]
}
```

#### GET /api/attendance/export/csv
CSV形式でエクスポート。

**クエリパラメータ:**
- `start_date`: 開始日
- `end_date`: 終了日
- `user_ids`: スタッフID（カンマ区切り）

### 7. アラートAPI

#### GET /api/attendance/alerts
アラート一覧を取得。

**クエリパラメータ:**
- `resolved`: true | false | all
- `alert_type`: missing_checkin | missing_checkout | qr_expiring | overtime

**レスポンス:**
```json
{
  "alerts": [
    {
      "id": "uuid",
      "alert_type": "missing_checkin",
      "target_user": {
        "id": "uuid",
        "name": "山田太郎"
      },
      "target_date": "2025-12-04",
      "message": "本日まだ出勤していません",
      "is_resolved": false,
      "created_at": "2025-12-04T10:00:00Z"
    }
  ]
}
```

#### PUT /api/attendance/alerts/[id]/resolve
アラートを解決済みにする。

### 8. タブレット表示API

#### GET /api/attendance/terminal/[token]
タブレット用のQR表示画面データを取得（認証トークンで検証）。

**レスポンス:**
```json
{
  "organization_name": "○○建設株式会社",
  "device_type": "office" | "site",
  "site_name": "A現場（現場の場合）",
  "current_qr": {
    "qr_data": "...",
    "valid_until": "2025-12-10T23:59:59Z"
  },
  "refresh_interval": 30
}
```

---

## UI/UX設計

### 1. ダッシュボードウィジェット

既存の在庫サマリーと同じスタイルで追加。

```
┌────────────────────────────────────┐
│ 📅 本日の出退勤                     │
├────────────────────────────────────┤
│ 状態: 🟢 勤務中                     │
│ 出勤: 09:00 (会社)                 │
│ 退勤: --:--                        │
│ 勤務時間: 3時間15分                 │
│ 休憩: 開始していません              │
├────────────────────────────────────┤
│ [🏢 会社に出勤]  [🏗️ 現場に直行]    │
│          または                     │
│ [📱 QRコードで打刻]                 │
├────────────────────────────────────┤
│ [☕ 休憩開始]  [🚪 退勤する]         │
└────────────────────────────────────┘
```

### 2. 出退勤管理ページ（/attendance）

#### タブ構成
- **出退勤一覧** - デフォルト表示
- **月次集計**
- **設定**（管理者のみ）

#### ツールバー
```
┌──────────────────────────────────────────────┐
│ [📅 2025/12/01 - 2025/12/31] [🔍 スタッフ選択]│
│ [🏢 出勤先: すべて ▼]  [📊 状態: すべて ▼]   │
│                                              │
│ [+ 手動追加] [📥 CSVエクスポート]             │
└──────────────────────────────────────────────┘
```

#### データテーブル（デスクトップ）
```
┌──────┬──────┬──────┬──────┬──────┬──────┐
│ 日付 │スタッフ│出勤  │退勤  │勤務時間│操作 │
├──────┼──────┼──────┼──────┼──────┼──────┤
│12/04 │山田  │09:00 │18:00 │08:15 │[編集]│
│      │      │会社  │会社  │      │[削除]│
│12/04 │佐藤  │08:00 │17:00 │08:00 │[編集]│
│      │      │A現場 │直帰  │      │[削除]│
└──────┴──────┴──────┴──────┴──────┴──────┘
```

#### カード表示（モバイル）
```
┌────────────────────────────────┐
│ 2025/12/04                     │
│ 山田 太郎（第一営業部）          │
│                                │
│ 出勤: 09:00 (会社)             │
│ 退勤: 18:00 (会社)             │
│ 勤務: 8時間15分                │
│                                │
│ [編集] [削除]                  │
└────────────────────────────────┘
```

### 3. 月次集計ページ

```
┌─────────────────────────────────────┐
│ 2025年12月 勤怠集計                  │
├─────────────────────────────────────┤
│ [スタッフ別] [現場別]                │
├─────────────────────────────────────┤
│                                     │
│ 山田 太郎                           │
│ ━━━━━━━━━━━━━━━━━━━━━━━          │
│ 出勤日数:        20日               │
│ 欠勤日数:        2日                │
│ 遅刻回数:        1回                │
│ 早退回数:        0回                │
│ 総勤務時間:      160時間30分         │
│ 平均勤務時間:    8時間2分            │
│ 残業時間:        10時間30分          │
│                                     │
│ [CSVエクスポート]                   │
└─────────────────────────────────────┘
```

### 4. 設定ページ（/attendance/settings）

既存の組織設定と同じフォームスタイル。

```
┌─────────────────────────────────────┐
│ 出退勤管理設定                       │
├─────────────────────────────────────┤
│                                     │
│ ━━━━ 会社出勤の設定 ━━━━            │
│                                     │
│ ☑ 会社出勤機能を使用する             │
│                                     │
│ ■ 利用可能な打刻方法（複数選択可）    │
│ ☑ 手動打刻                          │
│ ☑ QRスキャン                        │
│ ☐ QR常時表示（タブレット設置）       │
│                                     │
│ ■ QRコード更新頻度                  │
│ ○ 毎日  ○ 3日  ● 7日  ○ 30日      │
│                                     │
│ [設定を保存]                        │
└─────────────────────────────────────┘
```

### 5. QR表示専用ページ（タブレット用）

#### 会社用 (/attendance/office-terminal?token=xxx)
```
┌─────────────────────────────────────┐
│        ○○建設株式会社                │
│      出退勤管理システム              │
├─────────────────────────────────────┤
│                                     │
│  📅 出退勤用QRコード                 │
│                                     │
│  ┌─────────────────┐               │
│  │                 │               │
│  │   [大QRコード]   │               │
│  │                 │               │
│  └─────────────────┘               │
│                                     │
│  有効期限: 2025年12月10日 23:59まで  │
│                                     │
│  このQRコードをスキャンして           │
│     出勤・退勤してください            │
│                                     │
│  ━━━━━━━━━━━━━━━━━━━━━            │
│  現在時刻: 2025/12/04 09:15:32      │
│  [30秒ごとに自動更新]                │
└─────────────────────────────────────┘
```

#### 現場用 (/attendance/site-terminal?token=xxx)
```
┌─────────────────────────────────────┐
│     A現場 出退勤端末                 │
├─────────────────────────────────────┤
│  現場名: 東京都渋谷区○○ビル         │
│                                     │
│  ┌─────────────────┐               │
│  │   [大QRコード]   │               │
│  └─────────────────┘               │
│                                     │
│  現在時刻: 2025/12/04 08:30:15      │
└─────────────────────────────────────┘
```

### 6. リーダー用QR発行画面

```
┌─────────────────────────────────────┐
│  🏗️ 現場出勤用QRコード発行           │
├─────────────────────────────────────┤
│  現場: A現場                         │
│  リーダー: 山田太郎                  │
│  有効期限: 本日23:59まで             │
├─────────────────────────────────────┤
│  ┌─────────────────┐               │
│  │   [QRコード]     │               │
│  └─────────────────┘               │
│                                     │
│  スタッフに読み取って                │
│  もらってください                    │
├─────────────────────────────────────┤
│  [QRを更新] [閉じる]                 │
└─────────────────────────────────────┘
```

---

## 実装フェーズ

### Phase 1: 基本機能（2-3週間）

#### Week 1: データベース + 設定
- [x] データベースマイグレーション作成 ✅
- [x] organization_attendance_settings テーブル ✅
- [x] attendance_records テーブル ✅
- [x] office_qr_codes テーブル ✅
- [x] site_attendance_settings テーブル ✅
- [x] 組織設定API実装 ✅
  - [x] GET /api/attendance/settings（取得）
  - [x] PUT /api/attendance/settings（更新）
  - [x] TypeScript型定義（types/attendance.ts）
- [x] 設定画面UI実装 ✅
  - [x] /attendance/settings/page.tsx（ページコンポーネント）
  - [x] AttendanceSettingsForm.tsx（フォームコンポーネント）
  - [x] Sidebarに「出退勤設定」リンク追加

#### Week 2: 打刻機能
- [x] 出勤打刻API（手動のみ） ✅
  - [x] POST /api/attendance/clock-in
  - [x] バリデーション（location_type, site_id, method）
  - [x] 既存記録チェック（1日1レコード制約）
  - [x] 現場ID検証
- [x] 退勤打刻API（手動のみ） ✅
  - [x] POST /api/attendance/clock-out
  - [x] 出勤記録存在チェック
  - [x] 出勤時刻との妥当性チェック
- [x] ダッシュボードウィジェット ✅
  - [x] AttendanceWidget.tsx 作成
  - [x] ダッシュボードに配置
  - [x] 出勤/退勤ボタン
  - [x] 勤務時間表示
- [x] 打刻状態の取得API ✅
  - [x] GET /api/attendance/status
  - [x] 今日の記録取得
  - [x] 現場名JOIN
- [x] 重複打刻防止機能 ✅
  - [x] 5分以内の重複チェック
  - [x] 同日重複チェック
- [x] タイムゾーン処理（JST統一） ✅

#### Week 3: 一覧・履歴
- [x] 勤怠一覧API（フィルター付き） ✅
  - [x] GET /api/attendance/records
  - [x] フィルタリング（user_id, start_date, end_date, location_type, site_id）
  - [x] ページネーション（page, limit）
  - [x] ソート（日付降順）
  - [x] 権限チェック（staffは自分のみ、admin/managerは全員）
  - [x] JOINクエリ（ユーザー名、現場名）
- [x] 勤怠一覧ページ（デスクトップ） ✅
  - [x] /attendance/records/page.tsx
  - [x] AttendanceRecordsTable.tsx
  - [x] フィルター UI（スタッフ、日付範囲、場所、現場）
  - [x] 勤務時間計算・表示
  - [x] ページネーション UI
- [x] 勤怠一覧ページ（モバイル） ✅
  - [x] レスポンシブ対応テーブル
- [x] 自分の履歴ページ（スタッフ用） ✅
  - [x] /attendance/my-records/page.tsx
  - [x] MyAttendanceRecordsTable.tsx
  - [x] 月次集計表示（出勤日数、総勤務時間、平均時間）
  - [x] 日付フィルター
  - [x] ページネーション
- [x] サイドバーメニュー追加 ✅
  - [x] 勤怠履歴（全員）
  - [x] 勤怠一覧（admin/manager）
- [x] 休憩時間管理（simple/detailed/none） ✅
  - [x] POST /api/attendance/break/start
  - [x] POST /api/attendance/break/end
  - [x] AttendanceWidgetに休憩ボタン追加
  - [x] break_time_modeに応じた制限（none/simple/detailed）
- [x] 手動修正機能（管理者用） ✅
  - [x] PATCH /api/attendance/records/[id]
  - [x] DELETE /api/attendance/records/[id]
  - [x] 編集モーダルUI（EditAttendanceModal.tsx）
  - [x] 勤怠一覧ページに編集ボタン追加
  - [x] 編集理由の記録

### Phase 2: QR機能（2週間）

#### Week 4: 会社QR
- [x] 会社QRコード自動生成機能 ✅
  - [x] POST /api/attendance/qr/office/generate（手動生成）
  - [x] GET /api/attendance/qr/office/current（自動生成含む）
  - [x] QRデータフォーマット: ATT:org_id:token:valid_until
  - [x] 有効期限管理（1/3/7/30日）
- [x] QRコード検証機能 ✅
  - [x] POST /api/attendance/qr/verify
  - [x] 会社QR検証（有効期限チェック）
  - [x] 現場QR検証（リーダー発行・固定）
  - [x] 組織IDチェック
- [x] QRスキャン打刻API ✅
  - [x] clock-in APIにQR検証統合
  - [x] clock-out APIにQR検証統合
  - [x] location_type自動判定
- [x] QR表示専用ページ（会社・現場共通） ✅
  - [x] GET /api/attendance/terminal/[token]（データ取得API）
  - [x] /attendance/terminal/[token]（表示ページ）
  - [x] TerminalDisplay.tsx（QRコード表示コンポーネント）
  - [x] qrcodeライブラリ統合
  - [x] 30秒ごと自動更新
  - [x] リアルタイム時計表示
- [x] タブレット端末管理機能 ✅
  - [x] GET /api/attendance/terminals（一覧取得）
  - [x] POST /api/attendance/terminals（端末登録）
  - [x] PATCH /api/attendance/terminals/[id]（更新）
  - [x] DELETE /api/attendance/terminals/[id]（削除）
  - [x] アクセストークン生成（crypto）
- [ ] QRコード定期更新ジョブ（将来実装）

#### Week 5: 現場QR
- [ ] リーダー用QR発行API
- [ ] リーダー用QR発行画面
- [ ] 固定QR生成機能（管理者用）
- [ ] QR表示専用ページ（現場用）
- [ ] 現場ごとの設定管理
- [ ] QR管理画面

### Phase 3: 通知・レポート（1-2週間）

#### Week 6: アラート
- [ ] アラートテーブル作成
- [ ] 出勤忘れ通知（10:00定期実行）
- [ ] 退勤忘れ通知（20:00定期実行）
- [ ] 管理者向け日次レポート
- [ ] QR期限切れ通知
- [ ] 長時間労働アラート
- [ ] メール通知機能

#### Week 7: 集計・エクスポート
- [ ] 月次集計API
- [ ] 月次集計ページ（スタッフ別）
- [ ] 月次集計ページ（現場別）
- [ ] CSVエクスポート機能
- [ ] 勤務時間計算ロジック
- [ ] 残業時間計算ロジック

### Phase 4: 拡張機能（将来）

- [ ] 顔認証打刻（タブレット設置企業向け）
- [ ] GPS位置情報記録（オプション）
- [ ] シフト管理との連携
- [ ] 給与計算システム連携
- [ ] 作業報告書との連携

---

## セキュリティ要件

### 1. QRコードのセキュリティ

#### 会社QRコード
- 定期的に自動更新（1日/3日/7日/30日）
- QRデータに有効期限を含める
- 期限切れQRは使用不可
- 暗号化トークンを使用

#### 現場QRコード（リーダー発行型）
- 毎日0時に自動生成
- 当日限定で有効
- リーダーIDを含めてトレーサビリティ確保

#### 現場QRコード（固定型）
- 長期有効だが組織IDと現場IDで検証
- 管理者のみ生成可能
- 無効化機能あり

### 2. 不正打刻の防止

- 同じユーザーが5分以内に複数回打刻できないようにする
- QRコードは組織IDと紐付けて検証
- タブレット端末のアクセストークン管理
- 打刻時のデバイス情報を記録
- 異常な打刻パターンのログ記録

### 3. データプライバシー

- RLSポリシーで組織間のデータ隔離
- スタッフは自分の勤怠のみ閲覧可能
- 管理者/マネージャーは組織内全員を閲覧可能
- 手動修正の履歴を記録（誰が・いつ・なぜ）

### 4. 認証・認可

- Supabase Authによる認証
- ロールベースのアクセス制御（RBAC）
- タブレット用トークンの有効期限管理
- API呼び出し時の権限チェック

---

## テスト計画

### 1. 単体テスト

#### API層
- [ ] 出勤打刻API（正常系・異常系）
- [ ] 退勤打刻API（正常系・異常系）
- [ ] QRコード生成・検証
- [ ] 勤怠記録の取得・更新・削除
- [ ] 月次集計の計算ロジック

#### ビジネスロジック
- [ ] 重複打刻の防止
- [ ] タイムゾーン変換
- [ ] 勤務時間の計算
- [ ] 休憩時間の自動控除
- [ ] アラート条件の判定

### 2. 統合テスト

- [ ] 出勤→休憩→退勤の一連の流れ
- [ ] QRスキャンによる打刻
- [ ] 手動修正による更新
- [ ] 月次集計データの正確性
- [ ] CSVエクスポート

### 3. E2Eテスト

#### スタッフ操作
- [ ] ダッシュボードから手動出勤
- [ ] QRスキャンで出勤
- [ ] 休憩開始・終了
- [ ] 退勤打刻
- [ ] 自分の履歴閲覧

#### 管理者操作
- [ ] 設定変更
- [ ] 勤怠一覧閲覧
- [ ] 手動修正
- [ ] 月次集計閲覧
- [ ] CSVエクスポート

#### タブレット
- [ ] QR表示画面の表示
- [ ] 自動更新機能
- [ ] オフライン時の挙動

### 4. パフォーマンステスト

- [ ] 100人同時打刻
- [ ] 1万件の勤怠データ検索
- [ ] 月次集計の実行速度
- [ ] QRコード検証の速度

### 5. セキュリティテスト

- [ ] RLSポリシーのバイパステスト
- [ ] 期限切れQRの使用テスト
- [ ] 他組織のデータアクセステスト
- [ ] 権限昇格の試行

---

## 付録

### A. QRデータフォーマット

#### 会社QRコード
```
ATT:${organization_id}:${random_token}:${valid_until}
例: ATT:org-123:abc789xyz:2025-12-10T23:59:59Z
```

#### リーダー発行現場QRコード
```
SITE:${site_id}:${leader_id}:${date}
例: SITE:site-456:user-789:2025-12-04
```

#### 固定現場QRコード
```
SITE_FIXED:${site_id}:${secret_hash}
例: SITE_FIXED:site-456:def456uvw
```

### B. 勤務時間計算ロジック

```typescript
function calculateWorkHours(record: AttendanceRecord): {
  work_hours: number;      // 総勤務時間（分）
  break_minutes: number;   // 休憩時間（分）
  actual_work_hours: number; // 実労働時間（分）
} {
  if (!record.clock_out_time) {
    return { work_hours: 0, break_minutes: 0, actual_work_hours: 0 };
  }

  // 総勤務時間
  const work_hours = differenceInMinutes(
    new Date(record.clock_out_time),
    new Date(record.clock_in_time)
  );

  // 休憩時間
  let break_minutes = record.auto_break_deducted_minutes || 0;

  if (record.break_records && Array.isArray(record.break_records)) {
    for (const br of record.break_records) {
      if (br.start && br.end) {
        break_minutes += differenceInMinutes(
          new Date(br.end),
          new Date(br.start)
        );
      }
    }
  }

  // 実労働時間
  const actual_work_hours = work_hours - break_minutes;

  return { work_hours, break_minutes, actual_work_hours };
}
```

### C. アラート実行スケジュール

| アラート | 実行タイミング | 実装方法 |
|---------|--------------|----------|
| 出勤忘れ（本人） | 毎日10:00 | Supabase Edge Function + Cron |
| 退勤忘れ（本人） | 毎日20:00 | Supabase Edge Function + Cron |
| 管理者日次レポート | 毎日10:00 | Supabase Edge Function + Cron |
| QR期限切れ | QR更新の24時間前 | Supabase Edge Function + Cron |
| 長時間労働 | リアルタイム | API呼び出し時にチェック |

### D. 権限マトリックス

| 機能 | admin | manager | leader | staff |
|------|-------|---------|--------|-------|
| 自分の出退勤打刻 | ✓ | ✓ | ✓ | ✓ |
| 自分の履歴閲覧 | ✓ | ✓ | ✓ | ✓ |
| 全員の履歴閲覧 | ✓ | ✓ | ✗ | ✗ |
| 手動修正（全員） | ✓ | ✓ | ✗ | ✗ |
| 手動追加 | ✓ | ✓ | ✗ | ✗ |
| 月次レポート閲覧 | ✓ | ✓ | ✗ | ✗ |
| CSVエクスポート | ✓ | ✓ | ✗ | ✗ |
| 設定変更 | ✓ | ✗ | ✗ | ✗ |
| 会社QRコード生成 | ✓ | ✓ | ✗ | ✗ |
| 現場QRコード生成（リーダー） | ✓ | ✓ | ✓ | ✗ |
| 現場QRコード生成（固定） | ✓ | ✓ | ✗ | ✗ |

---

**作成日**: 2025-12-04
**最終更新**: 2025-12-04
**バージョン**: 1.0
