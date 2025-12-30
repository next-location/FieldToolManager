# プラン変更仕様の簡素化実装記録

**実装日**: 2025-12-30
**目的**: プラン変更を30日前申請・次回請求日切り替えに統一し、日割り計算を廃止してシンプルな仕様に変更

---

## 📋 変更概要

### 旧仕様（廃止）
- プラン変更時に日割り計算を実行
- `pending_prorated_charge` に差額を保存
- 即座に `organizations` テーブルを更新（問題あり）
- グレードアップ/ダウンの期限なし

### 新仕様
- **申請期限**: 請求日の30日前まで（グレードアップ/ダウンの両方）
- **反映タイミング**: 次回請求日から適用
- **日割り計算**: 廃止（シンプル化）
- **料金**: 次回請求書から新プラン料金
- **ダウングレード時**: 3日間猶予 + 自動ユーザー無効化

---

## 🗂️ 実装内容

### Phase 1: データベーススキーマ変更

**ファイル**: `/supabase/migrations/20251230000001_simplify_plan_change.sql`

#### 削除したカラム
```sql
- pending_prorated_charge (日割り差額)
- pending_prorated_description (日割り説明)
```

#### 追加したカラム
```sql
- pending_plan_change JSONB -- プラン変更予約データ
- plan_change_requested_at TIMESTAMP -- 申請日時
- plan_change_grace_deadline TIMESTAMP -- ユーザー削減猶予期限（切り替え日+3日）
```

#### `pending_plan_change` の構造
```json
{
  "new_plan": "start",
  "new_base_fee": 18000,
  "new_user_limit": 10,
  "new_package_ids": ["pkg-id-1", "pkg-id-2"],
  "old_plan": "standard",
  "old_base_fee": 45000,
  "old_user_limit": 30,
  "old_package_ids": ["pkg-id-3"],
  "effective_date": "2025-01-01",
  "is_downgrade": true,
  "current_user_count": 25,
  "user_exceeded": true,
  "requested_by": "admin-id",
  "requested_at": "2024-12-01T00:00:00Z"
}
```

---

### Phase 2: プラン変更API修正

**ファイル**: `/app/api/admin/contracts/[id]/change-plan/route.ts`

#### 主な変更点

1. **30日前チェック追加**
   ```typescript
   const daysUntilBilling = Math.ceil(
     (nextBillingDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
   );

   if (daysUntilBilling < 30) {
     return NextResponse.json({
       error: 'プラン変更は請求日の30日前までに申請してください',
       next_available_date: nextNextBillingDate.toISOString().split('T')[0]
     }, { status: 400 });
   }
   ```

2. **ユーザー数チェック（ダウングレード時）**
   ```typescript
   const { count: currentUserCount } = await supabase
     .from('users')
     .select('*', { count: 'exact', head: true })
     .eq('organization_id', organization.id)
     .is('deleted_at', null);

   const isDowngrade = new_user_limit < (contract.user_limit || organization.max_users);
   const userExceeded = isDowngrade && actualUserCount > new_user_limit;
   ```

3. **pending_plan_change に保存**
   ```typescript
   await supabase
     .from('contracts')
     .update({
       pending_plan_change: pendingPlanChange,
       plan_change_requested_at: new Date().toISOString(),
       plan_change_type: isDowngrade ? 'downgrade' : 'upgrade'
     })
     .eq('id', contractId);
   ```

4. **organizations テーブルは更新しない**
   - 旧実装では即座に更新していたが、次回請求日まで待つように変更

#### レスポンス例（ユーザー数超過時）
```json
{
  "success": true,
  "message": "プラン変更を予約しました。2025/1/1から適用されます。\n⚠️ 警告: 現在25名のユーザーが登録されていますが、新プランの上限は10名です。15名を削減してください。",
  "effective_date": "2025-01-01",
  "is_downgrade": true,
  "user_warning": {
    "current_user_count": 25,
    "new_user_limit": 10,
    "excess_count": 15
  }
}
```

---

### Phase 3: 通知メール関数作成

**ファイル**: `/lib/email/plan-change-notifications.ts`

#### 実装した5つのメール関数

1. **`sendInitialPlanChangeWarning`** - 初回警告（請求書送信時）
   - タイミング: 請求日の20日前
   - 対象: ユーザー数超過の契約
   - 内容: プラン変更日、現在のユーザー数、削減が必要な人数、猶予期限

2. **`sendThreeDaysBeforeWarning`** - 切り替え3日前警告
   - タイミング: プラン切り替えの3日前
   - 内容: カウントダウン、最終確認

3. **`sendGracePeriodDailyWarning`** - 猶予期間毎日警告
   - タイミング: プラン切り替え日〜猶予期限（毎日）
   - 内容: 残り日数、自動無効化の警告
   - パラメータ: `daysRemaining` (0, 1, 2)

4. **`sendAutoDeactivationNotice`** - 自動無効化完了通知（管理者宛）
   - タイミング: 猶予期限翌日（無効化実行後）
   - 内容: 無効化されたユーザーリスト

5. **`sendUserDeactivatedNotice`** - 個別ユーザー無効化通知
   - タイミング: 猶予期限翌日（無効化実行後）
   - 対象: 無効化されたユーザー本人
   - 内容: アカウント無効化の理由

#### メール送信タイムライン例

```
【前提】
- 現在: スタンダードプラン（30名）、ユーザー数25名
- 変更先: スタートプラン（10名）
- 請求日: 毎月1日

【タイムライン】
12/1  : プラン変更申請
12/11 : ⚠️ sendInitialPlanChangeWarning (請求書送信時)
12/29 : ⚠️ sendThreeDaysBeforeWarning (3日前警告)
1/1   : プラン切り替え実行
1/1   : ⚠️ sendGracePeriodDailyWarning (残り3日)
1/2   : ⚠️ sendGracePeriodDailyWarning (残り2日)
1/3   : ⚠️ sendGracePeriodDailyWarning (残り1日)
1/4   : ⚠️ sendGracePeriodDailyWarning (残り0日 = 本日が最終日)
1/5   : 🚨 自動無効化実行
        - sendAutoDeactivationNotice (管理者宛)
        - sendUserDeactivatedNotice × 15名 (無効化されたユーザー宛)
```

---

## 🔄 ユーザー状態管理

### `users` テーブルの状態フラグ

| 状態 | `is_active` | `deleted_at` | ログイン | 過去データ表示 | 用途 |
|------|-------------|--------------|----------|----------------|------|
| **有効** | `true` | `NULL` | ✅ 可能 | ✅ 表示 | 通常ユーザー |
| **無効化** | `false` | `NULL` | ❌ 不可 | ✅ 表示 | プランダウングレード超過分 |
| **削除** | `false` | タイムスタンプ | ❌ 不可 | ✅ 表示 | 退職者など |

### 自動無効化の選定基準

```sql
-- 最も新しく作成されたユーザーから順に無効化
SELECT id, name, email, created_at
FROM users
WHERE organization_id = 'org-id'
  AND deleted_at IS NULL
  AND is_active = true
ORDER BY created_at DESC
LIMIT 15;  -- 超過人数分
```

---

## ✅ 実装完了（全Phase）

### Phase 4: 請求書生成Cron修正 ✅
**ファイル**: `/app/api/cron/create-monthly-invoices/route.ts`
- ✅ `pending_plan_change` をチェック（184-232行目）
- ✅ ユーザー数超過なら初回警告メール送信
- ✅ 新プラン料金で請求書生成

### Phase 5: プラン切り替えCron作成 ✅
**ファイル**: `/app/api/cron/apply-plan-changes/route.ts` (新規作成)
- ✅ 毎日実行、effective_dateが今日の契約を処理
- ✅ `pending_plan_change` を適用
- ✅ contract_packages 更新
- ✅ `organizations` と `contracts` を更新
- ✅ `plan_change_grace_deadline` を設定（請求日+3日）
- ✅ `pending_plan_change` をクリア

### Phase 6: 通知Cron作成 ✅
**ファイル**: `/app/api/cron/send-plan-change-notifications/route.ts` (新規作成)
- ✅ 毎日実行
- ✅ 切り替え3日前警告チェック
- ✅ 猶予期間毎日警告チェック（残り0〜3日）
- ✅ ユーザー数を再確認してからメール送信

### Phase 7: ユーザー自動無効化Cron作成 ✅
**ファイル**: `/app/api/cron/auto-deactivate-users/route.ts` (新規作成)
- ✅ 毎日実行
- ✅ `plan_change_grace_deadline` が今日の契約をチェック
- ✅ ユーザー数超過なら created_at 降順で自動無効化
- ✅ `is_active = false` に変更（`deleted_at` は NULL のまま）
- ✅ 管理者に無効化完了通知
- ✅ 無効化されたユーザーに個別通知
- ✅ `plan_change_grace_deadline` をクリア

---

## 🔍 削除されたコード（参考）

### 日割り計算ロジック（廃止）

```typescript
// 旧実装（削除済み）
const totalDaysInMonth = Math.ceil(
  (billingPeriodEnd.getTime() - billingPeriodStart.getTime()) / (1000 * 60 * 60 * 24)
) + 1;

const remainingDays = Math.ceil(
  (billingPeriodEnd.getTime() - effectiveChangeDate.getTime()) / (1000 * 60 * 60 * 24)
) + 1;

const oldPlanProrated = -Math.round((oldMonthlyFee * remainingDays) / totalDaysInMonth);
const newPlanProrated = Math.round((newMonthlyFee * remainingDays) / totalDaysInMonth);
const proratedDifference = oldPlanProrated + newPlanProrated;
```

### 即座のorganizations更新（廃止）

```typescript
// 旧実装（削除済み）
const organizationUpdateData: any = {};

if (new_user_limit !== undefined) {
  organizationUpdateData.max_users = new_user_limit;
}
if (new_plan) {
  organizationUpdateData.plan = new_plan;
}

organizationUpdateData.has_asset_package = packageKeys.includes('asset') || packageKeys.includes('full');
organizationUpdateData.has_dx_efficiency_package = packageKeys.includes('dx') || packageKeys.includes('full');

if (Object.keys(organizationUpdateData).length > 0) {
  await supabase
    .from('organizations')
    .update(organizationUpdateData)
    .eq('id', contract.organization_id);
}
```

---

## 🎯 テスト項目

### プラン変更API
- [ ] 30日前チェック（期限内・期限外）
- [ ] ユーザー数超過時の警告表示
- [ ] pending_plan_change の保存
- [ ] organizations テーブルが更新されないことを確認

### 通知メール
- [ ] 初回警告メールの送信
- [ ] 3日前警告メールの送信
- [ ] 猶予期間毎日警告メールの送信（残り3日、2日、1日、0日）
- [ ] 自動無効化完了通知の送信
- [ ] 個別ユーザー無効化通知の送信

### データベース
- [ ] マイグレーション実行（本番環境）
- [ ] pending_plan_change カラムの確認
- [ ] 旧カラム（pending_prorated_charge）の削除確認

---

## 📚 関連ドキュメント

- `/docs/DATABASE_SCHEMA.md` - データベーススキーマ定義（更新予定）
- `/docs/MIGRATIONS.md` - マイグレーション履歴（更新予定）
- `/docs/PRICING_STRATEGY.md` - 料金体系

---

## 🚀 デプロイ手順

1. **ローカル環境でテスト**
   ```bash
   npm run dev
   ```

2. **マイグレーション実行（本番環境）**
   ```bash
   # 本番DBに接続してマイグレーション実行
   export PGPASSWORD='cF1!hVERlDgjMD'
   psql -h db.ecehilhaxgwphvamvabj.supabase.co -p 5432 -U postgres -d postgres \
     -f supabase/migrations/20251230000001_simplify_plan_change.sql
   ```

3. **Git コミット**
   ```bash
   git add .
   git commit -m "feat: プラン変更仕様の簡素化（30日前申請・日割り廃止）"
   git push origin main
   ```

4. **Vercel 自動デプロイ確認**

5. **Cron設定（Vercel）**
   - `/api/cron/create-monthly-invoices` - 毎日実行（既存）
   - `/api/cron/apply-plan-changes` - 毎日実行（新規）
   - `/api/cron/send-plan-change-notifications` - 毎日実行（新規）
   - `/api/cron/auto-deactivate-users` - 毎日実行（新規）

---

**実装者**: Claude (AI Assistant)
**レビュー**: 未実施
**ステータス**: ✅ 全Phase完了（Phase 1-7）
