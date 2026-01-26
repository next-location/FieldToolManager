# 出退勤アラート機能 実装計画

## 📋 概要

建設業向けの出退勤アラート機能を段階的に実装する。
現状のバグ修正と、企業ごとの休日・勤務パターンに対応した実用的なアラートシステムを構築する。

---

## 🎯 実装フェーズ

### **Phase 1: MVP版（最優先）**
**目的**: 基本的なアラート機能を動作させる
**工数**: 30時間（4日間）
**対象**: 月〜金勤務の会社（建設業の約80%）

### **Phase 2: 夜勤対応**
**目的**: 複数勤務パターンに対応
**工数**: 20時間（2.5日間）
**対象**: 夜勤や早朝勤務がある会社

### **Phase 3: 休暇管理**
**目的**: 有給休暇の管理と連携
**工数**: 20時間（2.5日間）
**対象**: 全ての会社

---

## 📊 Phase 1: MVP版（30時間）

### **1.1 データベース修正（3時間）**

#### **1.1.1 attendance_alerts テーブル修正**
```sql
-- alert_typeの制約を修正
ALTER TABLE attendance_alerts
DROP CONSTRAINT IF EXISTS attendance_alerts_alert_type_check;

ALTER TABLE attendance_alerts
ADD CONSTRAINT attendance_alerts_alert_type_check
CHECK (alert_type IN (
  'missing_checkin',
  'missing_checkout',
  'checkin_reminder',
  'checkout_reminder',
  'qr_expiring',
  'overtime'
));

-- titleカラムを追加
ALTER TABLE attendance_alerts
ADD COLUMN IF NOT EXISTS title TEXT;
```

#### **1.1.2 organization_attendance_settings テーブル拡張**
```sql
-- 営業日設定を追加
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS working_days JSONB DEFAULT '{
  "monday": true,
  "tuesday": true,
  "wednesday": true,
  "thursday": true,
  "friday": true,
  "saturday": false,
  "sunday": false
}'::jsonb;

-- 祝日除外フラグを追加
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS exclude_holidays BOOLEAN DEFAULT true;

-- デフォルト勤務時刻を追加
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS default_checkin_time TIME DEFAULT '08:00';

-- デフォルトアラート時刻を追加（出勤時刻の1時間後）
ALTER TABLE organization_attendance_settings
ADD COLUMN IF NOT EXISTS default_alert_time TIME DEFAULT '09:00';
```

#### **1.1.3 マイグレーションファイル作成**
- ファイル名: `20260126_attendance_alert_mvp.sql`
- 場所: `docs/MIGRATIONS.md` に記録

**タスク:**
- [x] SQLファイル作成
- [x] 本番環境でマイグレーション実行
- [x] MIGRATIONS.mdに記録
- [x] DATABASE_SCHEMA.mdを更新

---

### **1.2 バックエンドAPI実装（10時間）**

#### **1.2.1 祝日判定ユーティリティ（3時間）**

**ファイル**: `lib/attendance/holiday-checker.ts`

```typescript
/**
 * 日本の祝日を判定するユーティリティ
 * 内閣府の祝日APIからデータを取得してキャッシュ
 */

import { createClient } from '@/lib/supabase/server'

// 内閣府の祝日CSV URL
const HOLIDAY_CSV_URL = 'https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv'

interface Holiday {
  date: string // YYYY-MM-DD
  name: string // 祝日名
}

/**
 * 祝日データをフェッチして返す
 * キャッシュを使用（1日1回更新）
 */
export async function fetchHolidays(year: number): Promise<Holiday[]> {
  // TODO: 実装
  // 1. 内閣府APIからCSVをフェッチ
  // 2. パースして配列に変換
  // 3. Vercel KVまたはメモリにキャッシュ（1日有効）
  // 4. 指定年の祝日のみ返す
  return []
}

/**
 * 指定日が祝日かどうかを判定
 */
export async function isJapaneseHoliday(date: string): Promise<boolean> {
  const year = new Date(date).getFullYear()
  const holidays = await fetchHolidays(year)
  return holidays.some(h => h.date === date)
}

/**
 * 指定日が営業日かどうかを判定
 * @param organizationId 組織ID
 * @param date 日付 (YYYY-MM-DD)
 * @returns 営業日ならtrue
 */
export async function isWorkingDay(
  organizationId: string,
  date: string
): Promise<boolean> {
  const supabase = await createClient()

  // 組織の設定を取得
  const { data: settings } = await supabase
    .from('organization_attendance_settings')
    .select('working_days, exclude_holidays')
    .eq('organization_id', organizationId)
    .single()

  if (!settings) {
    // デフォルト: 月〜金が営業日
    const dayOfWeek = new Date(date).getDay()
    return dayOfWeek >= 1 && dayOfWeek <= 5
  }

  // 曜日チェック
  const dayOfWeek = new Date(date).getDay()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayName = dayNames[dayOfWeek]

  if (!settings.working_days[dayName]) {
    return false // 設定で休日になっている
  }

  // 祝日チェック
  if (settings.exclude_holidays) {
    const isHoliday = await isJapaneseHoliday(date)
    if (isHoliday) {
      return false
    }
  }

  return true
}
```

**タスク:**
- [ ] `lib/attendance/holiday-checker.ts` を作成
- [ ] 祝日CSV取得ロジック実装
- [ ] キャッシュ機能実装（Vercel KVまたはメモリ）
- [ ] 営業日判定ロジック実装
- [ ] 単体テスト作成

---

#### **1.2.2 アラート生成ロジック改修（6時間）**

**ファイル**: `app/api/attendance/alerts/checkin-reminder/route.ts`

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isWorkingDay } from '@/lib/attendance/holiday-checker'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Cron認証
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'dev-secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 日本時間で今日の日付を取得
    const now = new Date()
    const jstOffset = 9 * 60
    const jstDate = new Date(now.getTime() + jstOffset * 60 * 1000)
    const today = jstDate.toISOString().split('T')[0]

    // 出勤リマインダーが有効な組織を取得
    const { data: organizations, error: orgError } = await supabase
      .from('organization_attendance_settings')
      .select(`
        organization_id,
        checkin_reminder_enabled,
        default_alert_time,
        organizations (
          id,
          name
        )
      `)
      .eq('checkin_reminder_enabled', true)

    if (orgError || !organizations || organizations.length === 0) {
      return NextResponse.json({
        success: true,
        message: '出勤リマインダーが有効な組織がありません',
        processed: 0,
      })
    }

    let totalAlerts = 0
    let skippedOrgs = 0

    // 各組織ごとに処理
    for (const org of organizations) {
      const organizationId = org.organization_id

      // 営業日チェック
      const isWorking = await isWorkingDay(organizationId, today)
      if (!isWorking) {
        console.log(`[組織 ${organizationId}] ${today} は休日のためスキップ`)
        skippedOrgs++
        continue
      }

      // アクティブなスタッフを取得
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .is('deleted_at', null)

      if (usersError || !users || users.length === 0) {
        continue
      }

      // 今日の出勤記録を取得
      const { data: todayRecords, error: recordsError } = await supabase
        .from('attendance_records')
        .select('user_id')
        .eq('organization_id', organizationId)
        .eq('date', today)

      if (recordsError) {
        console.error(`組織 ${organizationId} の出勤記録取得エラー:`, recordsError)
        continue
      }

      // 出勤済みユーザーIDのSet
      const checkedInUserIds = new Set(todayRecords?.map((r) => r.user_id) || [])

      // 未出勤のユーザーを抽出
      const missingUsers = users.filter((user) => !checkedInUserIds.has(user.id))

      if (missingUsers.length === 0) {
        console.log(`[組織 ${organizationId}] 全員出勤済み`)
        continue
      }

      // スタッフ本人へのアラート
      const userAlerts = missingUsers.map((user) => ({
        organization_id: organizationId,
        target_user_id: user.id,
        alert_type: 'checkin_reminder',
        target_date: today,
        title: '出勤打刻忘れ',
        message: `まだ出勤打刻がされていません。打刻をお願いします。`,
        metadata: {
          user_name: user.name,
          user_email: user.email,
        },
      }))

      // 管理者向けサマリーアラート
      const adminAlert = {
        organization_id: organizationId,
        target_user_id: null, // 組織全体のアラート
        alert_type: 'checkin_reminder',
        target_date: today,
        title: `未出勤者アラート (${missingUsers.length}名)`,
        message: `以下のスタッフが出勤打刻していません:\n${missingUsers.map(u => u.name).join(', ')}`,
        metadata: {
          missing_user_ids: missingUsers.map(u => u.id),
          missing_count: missingUsers.length,
          organization_name: org.organizations?.name,
        },
      }

      // アラートを挿入
      const { error: insertError } = await supabase
        .from('attendance_alerts')
        .insert([...userAlerts, adminAlert])

      if (insertError) {
        console.error(`組織 ${organizationId} のアラート挿入エラー:`, insertError)
      } else {
        totalAlerts += missingUsers.length + 1 // スタッフ分 + 管理者アラート
        console.log(`[組織 ${organizationId}] ${missingUsers.length}名のアラートを生成`)
      }
    }

    return NextResponse.json({
      success: true,
      message: `出勤リマインダー処理完了: ${totalAlerts}件のアラートを生成`,
      processed: totalAlerts,
      skipped_organizations: skippedOrgs,
      date: today,
    })
  } catch (error) {
    console.error('出勤リマインダー処理エラー:', error)
    return NextResponse.json(
      { error: '出勤リマインダーの処理に失敗しました', details: String(error) },
      { status: 500 }
    )
  }
}
```

**タスク:**
- [ ] `checkin-reminder/route.ts` を修正
- [ ] 営業日判定を組み込む
- [ ] 管理者向けサマリーアラートを追加
- [ ] エラーハンドリング強化
- [ ] ログ出力追加

---

#### **1.2.3 組織設定API（1時間）**

既存の `/api/organization` APIに設定保存機能を追加

**タスク:**
- [ ] `working_days` の保存処理を追加
- [ ] `exclude_holidays` の保存処理を追加
- [ ] `default_checkin_time` の保存処理を追加
- [ ] `default_alert_time` の保存処理を追加

---

### **1.3 フロントエンド実装（10時間）**

#### **1.3.1 組織設定ページ - 出退勤アラート設定セクション（6時間）**

**ファイル**: `app/(authenticated)/organization/page.tsx`

既存の組織情報設定ページに、出退勤アラート設定セクションを追加

```tsx
{/* 出退勤アラート設定 */}
<div className="bg-white shadow-sm rounded-lg p-6">
  <h2 className="text-xl font-bold mb-4">出退勤アラート設定</h2>

  {/* 休日設定 */}
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      休日設定
    </label>
    <div className="grid grid-cols-7 gap-2">
      {['月', '火', '水', '木', '金', '土', '日'].map((day, index) => (
        <label key={day} className="flex items-center justify-center p-3 border rounded cursor-pointer hover:bg-gray-50">
          <input
            type="checkbox"
            className="mr-2"
            checked={workingDays[['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][index]]}
            onChange={(e) => handleWorkingDayChange(index, e.target.checked)}
          />
          <span className="text-sm">{day}</span>
        </label>
      ))}
    </div>
    <p className="text-xs text-gray-500 mt-2">
      ✅ チェックあり = 営業日、チェックなし = 休日
    </p>
  </div>

  {/* 祝日設定 */}
  <div className="mb-6">
    <label className="flex items-center">
      <input
        type="checkbox"
        className="mr-2"
        checked={excludeHolidays}
        onChange={(e) => setExcludeHolidays(e.target.checked)}
      />
      <span className="text-sm font-medium text-gray-700">
        祝日は休日とする（日本の祝日を自動判定）
      </span>
    </label>
  </div>

  {/* 基本勤務時刻設定 */}
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      基本出勤時刻
    </label>
    <input
      type="time"
      className="px-3 py-2 border border-gray-300 rounded-md"
      value={defaultCheckinTime}
      onChange={(e) => setDefaultCheckinTime(e.target.value)}
    />
    <p className="text-xs text-gray-500 mt-1">
      スタッフの標準的な出勤時刻を設定します
    </p>
  </div>

  {/* アラート送信時刻 */}
  <div className="mb-6">
    <label className="block text-sm font-medium text-gray-700 mb-2">
      アラート送信時刻
    </label>
    <input
      type="time"
      className="px-3 py-2 border border-gray-300 rounded-md"
      value={defaultAlertTime}
      onChange={(e) => setDefaultAlertTime(e.target.value)}
    />
    <p className="text-xs text-gray-500 mt-1">
      未出勤者にアラートを送信する時刻（出勤時刻の1時間後を推奨）
    </p>
  </div>

  {/* 保存ボタン */}
  <button
    onClick={handleSaveAttendanceSettings}
    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
  >
    設定を保存
  </button>
</div>
```

**タスク:**
- [ ] 状態管理の追加（working_days, exclude_holidays等）
- [ ] API呼び出しロジック実装
- [ ] バリデーション実装
- [ ] エラー表示
- [ ] 成功メッセージ表示
- [ ] レスポンシブ対応

---

#### **1.3.2 アラート一覧ページ改善（4時間）**

**ファイル**: `app/(authenticated)/attendance/alerts/AlertsList.tsx`

管理者向けに未出勤者サマリーを表示

```tsx
{/* 管理者のみ: 未出勤者サマリー */}
{userRole === 'admin' || userRole === 'manager' ? (
  <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
    <h3 className="font-bold text-orange-900 mb-2">
      📢 今日の未出勤者
    </h3>
    {todaySummaryAlerts.map(alert => (
      <div key={alert.id} className="bg-white rounded p-3 mb-2">
        <div className="font-medium">{alert.title}</div>
        <div className="text-sm text-gray-600 mt-1">
          {alert.message}
        </div>
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => handleSendReminder(alert.id)}
            className="text-sm bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            全員にリマインダー送信
          </button>
          <button
            onClick={() => handleResolve(alert.id)}
            className="text-sm bg-gray-500 text-white px-3 py-1 rounded hover:bg-gray-600"
          >
            解決済みにする
          </button>
        </div>
      </div>
    ))}
  </div>
) : null}

{/* 個人向けアラート一覧 */}
<div className="space-y-4">
  {alerts.map(alert => (
    <div key={alert.id} className="bg-white shadow rounded-lg p-4">
      {/* アラート表示 */}
    </div>
  ))}
</div>
```

**タスク:**
- [ ] サマリーアラート表示ロジック
- [ ] リマインダー送信機能
- [ ] 解決済み処理
- [ ] フィルター機能（日付、種類）
- [ ] ページネーション

---

### **1.4 テスト・デバッグ（5時間）**

#### **1.4.1 単体テスト（2時間）**
- [ ] 祝日判定ロジックのテスト
- [ ] 営業日判定ロジックのテスト
- [ ] アラート生成ロジックのテスト

#### **1.4.2 統合テスト（2時間）**
- [ ] シナリオ1: 平日に未出勤
- [ ] シナリオ2: 土日のスキップ
- [ ] シナリオ3: 祝日のスキップ
- [ ] シナリオ4: 全員出勤済み

#### **1.4.3 本番環境テスト（1時間）**
- [ ] 設定画面の動作確認
- [ ] アラート生成の確認
- [ ] 管理者画面の確認

---

### **1.5 ドキュメント・デプロイ（2時間）**

**タスク:**
- [ ] DATABASE_SCHEMA.md更新
- [ ] MIGRATIONS.md更新
- [ ] 操作マニュアル作成（`docs/manual/attendance_alerts.md`）
- [ ] 本番デプロイ
- [ ] 動作確認

---

## 📊 Phase 2: 夜勤対応（20時間）

### **2.1 データベース拡張（2時間）**

#### **2.1.1 work_patterns テーブル作成**
```sql
CREATE TABLE work_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,  -- 例: "日勤（標準）", "夜勤", "早朝"
  expected_checkin_time TIME NOT NULL,  -- 例: 08:00
  alert_time TIME NOT NULL,  -- 例: 09:00
  is_night_shift BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,  -- デフォルトパターン
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, name)
);

CREATE INDEX idx_work_patterns_org ON work_patterns(organization_id);

-- RLS設定
ALTER TABLE work_patterns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Organizations can manage their own work patterns"
  ON work_patterns
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

#### **2.1.2 users テーブル拡張**
```sql
-- 勤務パターンIDを追加
ALTER TABLE users
ADD COLUMN work_pattern_id UUID REFERENCES work_patterns(id) ON DELETE SET NULL;

CREATE INDEX idx_users_work_pattern ON users(work_pattern_id);
```

**タスク:**
- [ ] マイグレーションSQL作成
- [ ] ローカルテスト
- [ ] MIGRATIONS.md更新
- [ ] DATABASE_SCHEMA.md更新

---

### **2.2 バックエンドAPI実装（8時間）**

#### **2.2.1 勤務パターンAPI（4時間）**

**ファイル**: `app/api/attendance/work-patterns/route.ts`

```typescript
// GET: 勤務パターン一覧取得
// POST: 勤務パターン作成
// PATCH: 勤務パターン更新
// DELETE: 勤務パターン削除
```

**ファイル**: `app/api/attendance/work-patterns/[id]/route.ts`

```typescript
// GET: 特定パターン取得
// PATCH: パターン更新
// DELETE: パターン削除
```

**タスク:**
- [ ] CRUD API実装
- [ ] バリデーション追加
- [ ] 適用スタッフ数カウント機能
- [ ] デフォルトパターン設定機能

---

#### **2.2.2 アラート生成ロジック拡張（4時間）**

複数の勤務パターンに対応したアラート生成

**修正ファイル**: `app/api/attendance/alerts/checkin-reminder/route.ts`

```typescript
// パターンごとにアラート時刻を分けて実行
// 例: 日勤は9:00、夜勤は21:00にチェック
```

**Cron設定修正**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/attendance/alerts/checkin-reminder",
      "schedule": "0 * * * *"  // 毎時実行に変更
    }
  ]
}
```

**タスク:**
- [ ] パターン別アラート生成ロジック
- [ ] 時刻判定ロジック追加
- [ ] 夜勤の日付またぎ対応
- [ ] Cron設定変更

---

### **2.3 フロントエンド実装（8時間）**

#### **2.3.1 勤務パターン管理画面（5時間）**

**場所**: 組織設定ページ内に新セクション追加

```tsx
{/* 勤務パターン管理 */}
<div className="bg-white shadow-sm rounded-lg p-6">
  <h2 className="text-xl font-bold mb-4">勤務パターン管理</h2>

  {/* パターン一覧 */}
  <div className="space-y-3">
    {workPatterns.map(pattern => (
      <div key={pattern.id} className="border rounded-lg p-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-bold">{pattern.name}</h3>
            <div className="text-sm text-gray-600 mt-1">
              出勤: {pattern.expected_checkin_time} / アラート: {pattern.alert_time}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              適用スタッフ: {pattern.user_count}名
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleEditPattern(pattern.id)}>編集</button>
            <button onClick={() => handleDeletePattern(pattern.id)}>削除</button>
          </div>
        </div>
      </div>
    ))}
  </div>

  {/* 新規作成ボタン */}
  <button
    onClick={() => setShowPatternModal(true)}
    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md"
  >
    + 新しいパターンを追加
  </button>
</div>

{/* パターン作成・編集モーダル */}
{showPatternModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div className="bg-white rounded-lg p-6 max-w-md w-full">
      <h3 className="text-lg font-bold mb-4">勤務パターン設定</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">パターン名</label>
          <input
            type="text"
            className="w-full px-3 py-2 border rounded-md"
            placeholder="例: 日勤（標準）"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">出勤時刻</label>
          <input type="time" className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">アラート送信時刻</label>
          <input type="time" className="w-full px-3 py-2 border rounded-md" />
        </div>

        <div>
          <label className="flex items-center">
            <input type="checkbox" className="mr-2" />
            夜勤パターン（日付をまたぐ勤務）
          </label>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button onClick={() => setShowPatternModal(false)}>キャンセル</button>
        <button onClick={handleSavePattern} className="bg-blue-600 text-white px-4 py-2 rounded-md">
          保存
        </button>
      </div>
    </div>
  </div>
)}
```

**タスク:**
- [ ] パターン一覧表示
- [ ] パターン作成モーダル
- [ ] パターン編集機能
- [ ] パターン削除機能
- [ ] 適用スタッフ数表示

---

#### **2.3.2 スタッフ管理画面拡張（3時間）**

**ファイル**: `app/(authenticated)/staff/[id]/edit/page.tsx`

スタッフ編集画面に勤務パターン選択を追加

```tsx
{/* 勤務パターン選択 */}
<div className="mb-4">
  <label className="block text-sm font-medium text-gray-700 mb-2">
    勤務パターン
  </label>
  <select
    value={workPatternId}
    onChange={(e) => setWorkPatternId(e.target.value)}
    className="w-full px-3 py-2 border border-gray-300 rounded-md"
  >
    <option value="">選択してください</option>
    {workPatterns.map(pattern => (
      <option key={pattern.id} value={pattern.id}>
        {pattern.name} ({pattern.expected_checkin_time})
      </option>
    ))}
  </select>
  <p className="text-xs text-gray-500 mt-1">
    このスタッフの標準的な勤務時間を選択します
  </p>
</div>
```

**タスク:**
- [ ] 勤務パターン選択UI追加
- [ ] 保存処理実装
- [ ] 一括編集機能（複数スタッフのパターンを一度に変更）

---

### **2.4 テスト・デバッグ（2時間）**

**タスク:**
- [ ] 複数パターンのアラート生成テスト
- [ ] 夜勤の日付またぎテスト
- [ ] パターン切り替えテスト
- [ ] 本番環境での動作確認

---

## 📊 Phase 3: 休暇管理（20時間）

### **3.1 データベース拡張（2時間）**

#### **3.1.1 user_leave_records テーブル作成**
```sql
CREATE TABLE user_leave_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  leave_date DATE NOT NULL,
  leave_type TEXT NOT NULL CHECK (leave_type IN ('paid', 'sick', 'personal', 'other')),
  reason TEXT,
  status TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, leave_date)
);

CREATE INDEX idx_user_leave_org_date ON user_leave_records(organization_id, leave_date);
CREATE INDEX idx_user_leave_user_date ON user_leave_records(user_id, leave_date);
CREATE INDEX idx_user_leave_status ON user_leave_records(organization_id, status);

-- RLS設定
ALTER TABLE user_leave_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own leaves"
  ON user_leave_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all leaves"
  ON user_leave_records FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Users can create own leaves"
  ON user_leave_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all leaves"
  ON user_leave_records FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  );
```

**タスク:**
- [ ] マイグレーションSQL作成
- [ ] ローカルテスト
- [ ] MIGRATIONS.md更新
- [ ] DATABASE_SCHEMA.md更新

---

### **3.2 バックエンドAPI実装（8時間）**

#### **3.2.1 休暇申請API（4時間）**

**ファイル**: `app/api/leave/route.ts`

```typescript
// GET: 休暇一覧取得
// POST: 休暇申請作成
```

**ファイル**: `app/api/leave/[id]/route.ts`

```typescript
// GET: 特定休暇取得
// PATCH: 休暇更新
// DELETE: 休暇削除
```

**ファイル**: `app/api/leave/[id]/approve/route.ts`

```typescript
// POST: 休暇承認
```

**ファイル**: `app/api/leave/[id]/reject/route.ts`

```typescript
// POST: 休暇却下
```

**タスク:**
- [ ] CRUD API実装
- [ ] 承認フロー実装
- [ ] 重複チェック（同日の休暇）
- [ ] 権限チェック

---

#### **3.2.2 アラート生成ロジック最終版（4時間）**

休暇中のスタッフを除外

**修正ファイル**: `app/api/attendance/alerts/checkin-reminder/route.ts`

```typescript
// 休暇中かどうかをチェックする関数
async function isUserOnLeave(
  supabase: any,
  userId: string,
  date: string
): Promise<boolean> {
  const { data } = await supabase
    .from('user_leave_records')
    .select('id')
    .eq('user_id', userId)
    .eq('leave_date', date)
    .eq('status', 'approved')
    .single()

  return !!data
}

// 未出勤者を抽出する際に休暇中を除外
const missingUsers = []
for (const user of users) {
  if (checkedInUserIds.has(user.id)) continue
  if (await isUserOnLeave(supabase, user.id, today)) {
    console.log(`${user.name}は休暇中のため除外`)
    continue
  }
  missingUsers.push(user)
}
```

**タスク:**
- [ ] 休暇判定ロジック追加
- [ ] パフォーマンス最適化（一括取得）
- [ ] テスト

---

### **3.3 フロントエンド実装（8時間）**

#### **3.3.1 休暇申請画面（4時間）**

**ファイル**: `app/(authenticated)/leave/new/page.tsx`

```tsx
<div className="max-w-2xl mx-auto py-6">
  <h1 className="text-2xl font-bold mb-6">休暇申請</h1>

  <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6">
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">休暇日</label>
      <input
        type="date"
        value={leaveDate}
        onChange={(e) => setLeaveDate(e.target.value)}
        className="w-full px-3 py-2 border rounded-md"
        required
      />
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">休暇種別</label>
      <select
        value={leaveType}
        onChange={(e) => setLeaveType(e.target.value)}
        className="w-full px-3 py-2 border rounded-md"
        required
      >
        <option value="">選択してください</option>
        <option value="paid">有給休暇</option>
        <option value="sick">病欠</option>
        <option value="personal">私用</option>
        <option value="other">その他</option>
      </select>
    </div>

    <div className="mb-4">
      <label className="block text-sm font-medium mb-2">理由</label>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-full px-3 py-2 border rounded-md"
        rows={3}
      />
    </div>

    <button
      type="submit"
      className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
    >
      申請する
    </button>
  </form>
</div>
```

**タスク:**
- [ ] 休暇申請フォーム実装
- [ ] カレンダー選択UI
- [ ] 重複チェック
- [ ] バリデーション

---

#### **3.3.2 休暇一覧・承認画面（4時間）**

**ファイル**: `app/(authenticated)/leave/page.tsx`

管理者: 全員の休暇一覧と承認機能
スタッフ: 自分の休暇一覧

```tsx
{/* 管理者向け承認待ち一覧 */}
{(role === 'admin' || role === 'manager') && (
  <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
    <h3 className="font-bold text-yellow-900 mb-3">承認待ちの休暇申請</h3>
    {pendingLeaves.map(leave => (
      <div key={leave.id} className="bg-white rounded p-3 mb-2">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-medium">{leave.user?.name}</div>
            <div className="text-sm text-gray-600">
              {leave.leave_date} ({leave.leave_type})
            </div>
            <div className="text-sm text-gray-500">{leave.reason}</div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleApprove(leave.id)}
              className="bg-green-500 text-white px-3 py-1 rounded text-sm"
            >
              承認
            </button>
            <button
              onClick={() => handleReject(leave.id)}
              className="bg-red-500 text-white px-3 py-1 rounded text-sm"
            >
              却下
            </button>
          </div>
        </div>
      </div>
    ))}
  </div>
)}

{/* 休暇カレンダー */}
<div className="bg-white shadow-sm rounded-lg p-6">
  <h2 className="text-xl font-bold mb-4">休暇カレンダー</h2>
  {/* カレンダーUI */}
</div>
```

**タスク:**
- [ ] 承認待ち一覧表示
- [ ] 承認・却下機能
- [ ] カレンダー表示
- [ ] フィルター機能

---

#### **3.3.3 スタッフ管理画面に休暇予定表示（スキップ可能）**

スタッフ詳細画面に休暇予定を表示（将来的に実装）

---

### **3.4 テスト・デバッグ（2時間）**

**タスク:**
- [ ] 休暇申請フロー全体テスト
- [ ] 承認フローテスト
- [ ] アラート除外テスト（休暇中のスタッフ）
- [ ] 本番環境での動作確認

---

## 📅 実装スケジュール

### **MVP版（4日間）**
| 日程 | 作業内容 | 工数 |
|------|----------|------|
| Day 1 | DB設計・マイグレーション・祝日API | 8h |
| Day 2 | アラート生成ロジック改修・組織設定API | 8h |
| Day 3 | フロントエンド実装（組織設定画面） | 8h |
| Day 4 | アラート一覧改善・テスト・デプロイ | 6h |

### **Phase 2: 夜勤対応（2.5日間）**
| 日程 | 作業内容 | 工数 |
|------|----------|------|
| Day 5 | DB拡張・勤務パターンAPI | 8h |
| Day 6 | アラートロジック拡張・勤務パターン管理UI | 8h |
| Day 7 | スタッフ管理拡張・テスト | 4h |

### **Phase 3: 休暇管理（2.5日間）**
| 日程 | 作業内容 | 工数 |
|------|----------|------|
| Day 8 | DB拡張・休暇申請API | 8h |
| Day 9 | アラートロジック最終版・休暇申請UI | 8h |
| Day 10 | 休暇一覧・承認画面・テスト | 4h |

---

## 🎯 成功基準

### **MVP版**
- [x] 平日（月〜金）に未出勤者にアラートが届く
- [x] 土日・祝日はアラートが送信されない
- [x] 管理者に未出勤者のサマリーアラートが届く
- [x] 組織設定画面で休日を設定できる

### **Phase 2**
- [x] 複数の勤務パターンを作成・管理できる
- [x] スタッフごとに勤務パターンを割り当てられる
- [x] 夜勤スタッフに適切な時刻でアラートが届く

### **Phase 3**
- [x] スタッフが休暇申請できる
- [x] 管理者が休暇を承認・却下できる
- [x] 休暇中のスタッフにアラートが届かない

---

## 📝 注意事項

### **有給休暇について**

#### **Phase 1（MVP版）の対応**
- 有給機能なし
- 管理者が手動でアラートを「解決済み」にする運用

#### **Phase 3実装後**
- スタッフが事前に有給申請
- 管理者が承認
- システムが自動的にアラート除外

**一時的な運用（Phase 1〜2）:**
1. スタッフが口頭・メールで有給を報告
2. 管理者が出勤していないことを確認
3. アラート画面で「解決済み」ボタンを押す
4. Phase 3実装後は自動化

---

## 🔧 技術的な補足

### **Vercel Cron の制限**
- 無料プランは1日1回まで
- Proプランは時間単位で実行可能
- MVP版では毎日1回（9:00 JST）に固定
- Phase 2で複数時刻対応が必要な場合、Cron Jobを複数設定

### **祝日APIキャッシュ**
- Vercel KV（Redis）を使用
- 1年分の祝日データをキャッシュ
- 毎日0時に更新

### **パフォーマンス最適化**
- 組織数が多い場合、バッチ処理を検討
- アラート生成は並列処理で高速化

---

## 📚 関連ドキュメント

- `docs/DATABASE_SCHEMA.md` - データベーススキーマ
- `docs/MIGRATIONS.md` - マイグレーション履歴
- `docs/manual/attendance_alerts.md` - 操作マニュアル（作成予定）

---

## ✅ チェックリスト

### **Phase 1: MVP版**
- [ ] データベースマイグレーション完了
- [ ] 祝日判定ユーティリティ実装
- [ ] アラート生成ロジック修正
- [ ] 組織設定画面実装
- [ ] アラート一覧画面改善
- [ ] テスト完了
- [ ] 本番デプロイ完了
- [ ] ドキュメント更新完了

### **Phase 2: 夜勤対応**
- [ ] work_patternsテーブル作成
- [ ] 勤務パターンAPI実装
- [ ] アラート生成ロジック拡張
- [ ] 勤務パターン管理UI実装
- [ ] スタッフ管理画面拡張
- [ ] テスト完了
- [ ] 本番デプロイ完了

### **Phase 3: 休暇管理**
- [ ] user_leave_recordsテーブル作成
- [ ] 休暇申請API実装
- [ ] アラート生成最終版
- [ ] 休暇申請UI実装
- [ ] 休暇承認UI実装
- [ ] テスト完了
- [ ] 本番デプロイ完了

---

**作成日**: 2026-01-26
**最終更新**: 2026-01-26
