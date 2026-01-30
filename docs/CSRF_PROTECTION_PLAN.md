# CSRF保護対応計画

**作成日**: 2026年1月30日
**最終更新**: 2026年1月30日 18:30 (12/142完了 - 8.5%)
**ステータス**: 🔄 Phase 1実施中 (1.1勤怠 + 1.2発注書 完了) ⚠️ 修正: qr/verify除外

---

## ⚠️ 重要: 更新ルール（必読）

### 🔴 必須事項（絶対に忘れないこと）

1. **エンドポイント修正完了時**:
   - 該当エンドポイントの行頭に ✅ を追加
   - 例: `- ✅ /attendance/clock-in` (POST) - 出勤打刻【完了: 2026-01-30】

2. **進捗管理表の更新**:
   - ファイル末尾の「📈 進捗管理」セクションを必ず更新
   - 完了数をカウントして進捗率を計算

3. **最終更新日の更新**:
   - ファイル冒頭の「最終更新」を必ず更新

### 📋 更新フロー

```
[修正実施] → [✅マーク追加] → [進捗管理表更新] → [最終更新日更新]
```

**⚠️ このルールを守らないと、どれが完了しているか分からなくなります！**

---

## 📊 現状分析

### 統計サマリー

| メソッド | 合計 | CSRF保護あり | CSRF保護なし | カバレッジ |
|---------|------|-------------|-------------|-----------|
| POST    | 131  | 31          | 100         | 23.7%     |
| PUT     | 18   | 3           | 15          | 16.7%     |
| DELETE  | 23   | 3           | 20          | 13.0%     |
| PATCH   | 14   | 2           | 12          | 14.3%     |
| **合計** | **186** | **39** | **147** | **21.0%** |

**🚨 重要**: 全APIエンドポイントの**79.0%（147個）**がCSRF保護なし

---

## ❌ CSRF保護が必要な全エンドポイント（147個）

### POST エンドポイント（100個）

- `/attendance/clock-out`
- `/attendance/records/proxy`
- `/attendance/terminals`
- `/attendance/check-holiday`
- `/attendance/work-patterns`
- `/attendance/clock-in`
- `/attendance/qr/office/generate`
- `/attendance/qr/verify`
- `/attendance/qr/site/leader/generate`
- `/attendance/alerts/daily-report`
- `/attendance/break/start`
- `/attendance/break/end`
- `/organization/plan-upgrade-request`
- `/organization/backup/full`
- `/demo/send-email`
- `/demo/request`
- `/demo/create`
- `/clients/import`
- `/purchase-orders/bulk-approve`
- `/purchase-orders/[id]/update-draft`
- `/purchase-orders/[id]/mark-paid`
- `/purchase-orders/[id]/mark-received`
- `/purchase-orders/[id]/send`
- `/suppliers`
- `/auth/logout`
- `/auth/2fa/reset`
- `/auth/2fa/request-reset`
- `/auth/forgot-password`
- `/tool-sets/delete-for-individual-move`
- `/estimates/[id]/customer-approve`
- `/estimates/[id]/return`
- `/estimates/[id]/approve`
- `/estimates/[id]/customer-reject`
- `/estimates/[id]/send`
- `/admin/organizations`
- `/admin/organizations/check-duplicate`
- `/admin/payments`
- `/admin/tools/common`
- `/admin/tools/common/import`
- `/admin/super-admins`
- `/admin/test/trigger-cron`
- `/admin/test/update-billing-date`
- `/admin/test/generate-invoice`
- `/admin/invoices`
- `/admin/invoices/[id]/send-estimate`
- `/admin/invoices/[id]/reject`
- `/admin/invoices/[id]/send-invoice`
- `/admin/invoices/[id]/convert-to-invoice`
- `/admin/invoices/[id]/send`
- `/admin/invoices/[id]/mark-as-paid`
- `/admin/invoices/[id]/resend`
- `/admin/contracts/change-plan/preview`
- `/admin/contracts/[id]/change-plan`
- `/admin/contracts/[id]/generate-estimate`
- `/admin/contracts/[id]/complete`
- `/admin/contracts/[id]/validate-change`
- `/admin/contracts/[id]/generate-initial-invoice`
- `/admin/logout`
- `/admin/2fa/disable`
- `/admin/2fa/test`
- `/admin/2fa/verify`
- `/admin/2fa/grace-period`
- `/admin/2fa/verify-backup`
- `/admin/packages`
- `/admin/manufacturers/unify`
- `/admin/manufacturers`
- `/admin/maintenance/cleanup`
- `/admin/backup/manual`
- `/admin/sales-activities`
- `/admin/impersonate/logout`
- `/admin/notifications/[id]/read`
- `/user/2fa/enable`
- `/user/2fa/disable`
- `/user/2fa/verify`
- `/work-reports/bulk-pdf`
- `/work-reports/custom-fields`
- `/work-reports/[id]/attachments`
- `/work-reports/[id]/photos`
- `/public/contact`
- `/reset-password/update`
- `/company-seal/generate`
- `/staff/bulk-import`
- `/staff`
- `/staff/[id]/toggle-active`
- `/staff/[id]/reset-password`
- `/webhooks/stripe`
- `/notifications/mark-read`
- `/notifications/mark-all-read`
- `/onboarding/complete`
- `/leave`
- `/leave/[id]/reject`
- `/leave/[id]/approve`
- `/cron/check-warranty-expiration`
- `/cron/check-low-stock`
- `/cron/check-equipment-expiration`
- `/analytics/track`
- `/stripe/customers/create`
- `/stripe/subscriptions/upgrade`
- `/stripe/subscriptions/downgrade`
- `/stripe/subscriptions/create`

---

### PUT エンドポイント（15個）

- `/attendance/settings`
- `/purchase-orders/settings`
- `/estimates/[id]`
- `/admin/organizations/[id]`
- `/admin/settings/timeout`
- `/admin/settings/system`
- `/admin/payments/[id]`
- `/admin/tools/common/[id]`
- `/admin/security/settings`
- `/admin/contracts/[id]`
- `/admin/2fa/grace-period`
- `/admin/packages/[id]`
- `/admin/manufacturers/[id]`
- `/admin/maintenance/cleanup`
- `/work-reports/custom-fields/[id]`

---

### DELETE エンドポイント（20個）

- `/attendance/records/[id]`
- `/attendance/terminals/[id]`
- `/attendance/work-patterns/[id]`
- `/purchase-orders/[id]`
- `/suppliers/[id]`
- `/estimates/[id]/approve`
- `/estimates/[id]`
- `/admin/organizations/[id]`
- `/admin/payments/[id]`
- `/admin/tools/common/[id]`
- `/admin/invoices/[id]/delete-estimate`
- `/admin/2fa/grace-period`
- `/admin/packages/[id]`
- `/admin/manufacturers/[id]`
- `/work-reports/custom-fields/[id]`
- `/work-reports/[id]`
- `/work-reports/[id]/attachments/[attachmentId]`
- `/work-reports/[id]/photos/[photoId]`
- `/staff/[id]`
- `/leave/[id]`

---

### PATCH エンドポイント（12個）

- `/attendance/records/[id]`
- `/attendance/terminals/[id]`
- `/attendance/work-patterns/[id]`
- `/attendance/alerts`
- `/organization/contract`
- `/organization`
- `/suppliers/[id]`
- `/admin/organizations/[id]/sales`
- `/admin/contracts/[id]`
- `/work-reports/[id]`
- `/staff/[id]`
- `/leave/[id]`

---

## 🎯 対応方針

### 基本原則

1. **段階的実施**: 一度に全てを修正せず、優先度に基づき段階的に実施
2. **同時修正**: バックエンドとフロントエンドを必ず同時に修正
3. **徹底的テスト**: 各フェーズ完了後、必ずテストを実施
4. **ロールバック準備**: 問題発生時に即座に戻せる体制
5. **⭐ 自動検証スクリプトによる品質保証**: 修正漏れを防ぐため、実装前に検証スクリプトを作成

### 🤖 検証スクリプト戦略（実装前に作成）

**目的**: バックエンドとフロントエンドの修正漏れを完全に防止する

#### 作成する検証スクリプト

1. **`scripts/verify-csrf-backend.ts`** - バックエンド検証
   - 全147個のエンドポイントにCSRF保護が追加されたかを自動チェック
   - `verifyCsrfToken` のインポートと使用を検出
   - 修正漏れを即座に発見

2. **`scripts/verify-csrf-frontend.ts`** - フロントエンド検証
   - 各エンドポイントを呼び出すコンポーネントで `useCsrfToken` が使われているかチェック
   - `X-CSRF-Token` ヘッダーの追加を検証
   - フロントエンド修正漏れを即座に発見

3. **`scripts/test-csrf-complete.ts`** - エンドツーエンド検証
   - バックエンド + フロントエンドの対応関係を検証
   - ペアでの修正漏れを検出（片方だけ修正されている状態を防ぐ）

4. **`scripts/generate-csrf-checklist.sh`** - チェックリスト自動生成
   - `CSRF_PROTECTION_PLAN.md` から自動でチェックリスト生成
   - 修正完了したものにチェックマークを付けていく

#### 検証スクリプトの実行タイミング

```
[Phase 0] 検証スクリプト作成（最初に実施）
  ↓
[Phase 1-A] 最小単位テスト（1エンドポイントのみ）
  ├─ バックエンド修正
  ├─ ✅ verify-csrf-backend.ts 実行
  ├─ フロントエンド修正
  ├─ ✅ verify-csrf-frontend.ts 実行
  ├─ ✅ test-csrf-complete.ts 実行
  ├─ ✅ 手動テスト（ブラウザで動作確認）
  └─ 問題なければ次へ
  ↓
[Phase 1-B] 勤怠系5個
  ├─ バックエンド修正（5個）
  ├─ ✅ verify-csrf-backend.ts 実行
  ├─ フロントエンド修正（対応する5個）
  ├─ ✅ verify-csrf-frontend.ts 実行
  ├─ ✅ test-csrf-complete.ts 実行
  ├─ ✅ 手動テスト
  └─ 次へ
  ↓
（以下、同じパターンを繰り返し）
```

### 実施スケジュール

```
Phase 0 (Day 1-2):   検証スクリプト作成 + 最小単位テスト（1エンドポイント）
Phase 1 (Week 1-2):  優先度：高（CRITICAL） - 37エンドポイント
Phase 2 (Week 3-4):  優先度：中（HIGH）     - 38エンドポイント
Phase 3 (Week 5-8):  優先度：低（MEDIUM）   - 72エンドポイント
```

---

## 📋 Phase 1: 高優先度（緊急対応）

**期間**: Week 1-2（2週間）
**対象**: 37エンドポイント
**リスク**: CRITICAL - 金銭的損失、勤怠改ざん、アカウント乗っ取りの可能性

### 1.1 勤怠関連（7エンドポイント）

**リスク**: 勤怠データの改ざん、不正打刻、給与計算への影響
**進捗**: 7/7 (100%) ✅ **完了**
**注記**: `/attendance/qr/verify` は内部APIのため除外

#### バックエンド
- [x] `/attendance/clock-in` (POST) - 出勤打刻 【完了: 2026-01-30】
  - ファイル: `app/api/attendance/clock-in/route.ts`
  - フロントエンド: `AttendanceClockClient.tsx`, `AttendanceWidget.tsx`
  - 検証: ✅ バックエンド・フロントエンド両方完全保護
- [x] `/attendance/clock-out` (POST) - 退勤打刻 【完了: 2026-01-30】
  - ファイル: `app/api/attendance/clock-out/route.ts`
  - フロントエンド: `AttendanceClockClient.tsx`, `AttendanceWidget.tsx`(既修正)
  - 検証: ✅ バックエンド保護完了
- [x] `/attendance/break/start` (POST) - 休憩開始 【完了: 2026-01-30】
  - ファイル: `app/api/attendance/break/start/route.ts`
  - 検証: ✅ バックエンド保護完了
- [x] `/attendance/break/end` (POST) - 休憩終了 【完了: 2026-01-30】
  - ファイル: `app/api/attendance/break/end/route.ts`
  - 検証: ✅ バックエンド保護完了
- [x] `/attendance/records/proxy` (POST) - 代理打刻 【完了: 2026-01-30】
  - ファイル: `app/api/attendance/records/proxy/route.ts`
  - フロントエンド: `ProxyClockInModal.tsx`(要確認)
  - 検証: ✅ バックエンド保護完了
- [x] `/attendance/qr/verify` (POST) - QR打刻検証 【除外: 内部API】
  - ファイル: `app/api/attendance/qr/verify/route.ts`
  - 注記: ⚠️ 他APIから内部的に呼ばれるためCSRF保護不要
- [x] `/attendance/records/[id]` (PATCH) - 勤怠記録修正 【完了: 2026-01-30】
  - ファイル: `app/api/attendance/records/[id]/route.ts`
  - フロントエンド: `EditAttendanceModal.tsx`(要確認)
  - 検証: ✅ バックエンド保護完了
- [x] `/attendance/records/[id]` (DELETE) - 勤怠記録削除 【完了: 2026-01-30】
  - ファイル: `app/api/attendance/records/[id]/route.ts`
  - 検証: ✅ バックエンド保護完了

---

### 1.2 発注書関連（5エンドポイント）

**リスク**: 金銭的損失、不正発注、会社資産の流出
**進捗**: 5/5 (100%) ✅ **完了**

#### バックエンド
- [x] `/purchase-orders/bulk-approve` (POST) - 一括承認 【完了: 2026-01-30】
  - ファイル: `app/api/purchase-orders/bulk-approve/route.ts`
  - 検証: ✅ バックエンド保護完了
- [x] `/purchase-orders/[id]/mark-paid` (POST) - 支払済み登録 【完了: 2026-01-30】
  - ファイル: `app/api/purchase-orders/[id]/mark-paid/route.ts`
  - 検証: ✅ バックエンド保護完了
- [x] `/purchase-orders/[id]/mark-received` (POST) - 受領登録 【完了: 2026-01-30】
  - ファイル: `app/api/purchase-orders/[id]/mark-received/route.ts`
  - 検証: ✅ バックエンド保護完了
- [x] `/purchase-orders/[id]/send` (POST) - 発注書送信 【完了: 2026-01-30】
  - ファイル: `app/api/purchase-orders/[id]/send/route.ts`
  - 検証: ✅ バックエンド保護完了
- [x] `/purchase-orders/[id]` (DELETE) - 発注書削除 【完了: 2026-01-30】
  - ファイル: `app/api/purchase-orders/[id]/route.ts`
  - 検証: ✅ バックエンド保護完了

---

### 1.3 請求書・見積書関連（13エンドポイント）

**リスク**: 契約の改ざん、不正請求、金銭的損失
**進捗**: 0/13 (0%)

#### バックエンド
- [ ] `/estimates/[id]/approve` (POST) - 見積書承認
  - ファイル: `app/api/estimates/[id]/approve/route.ts`
- [ ] `/estimates/[id]/customer-approve` (POST) - 顧客承認
  - ファイル: `app/api/estimates/[id]/customer-approve/route.ts`
- [ ] `/estimates/[id]/customer-reject` (POST) - 顧客却下
  - ファイル: `app/api/estimates/[id]/customer-reject/route.ts`
- [ ] `/estimates/[id]/send` (POST) - 見積書送信
  - ファイル: `app/api/estimates/[id]/send/route.ts`
- [ ] `/estimates/[id]/return` (POST) - 見積書差戻し
  - ファイル: `app/api/estimates/[id]/return/route.ts`
- [ ] `/estimates/[id]` (PUT) - 見積書更新
  - ファイル: `app/api/estimates/[id]/route.ts`
- [ ] `/estimates/[id]` (DELETE) - 見積書削除
  - ファイル: `app/api/estimates/[id]/route.ts`
- [ ] `/admin/invoices/[id]/convert-to-invoice` (POST) - 請求書変換
  - ファイル: `app/api/admin/invoices/[id]/convert-to-invoice/route.ts`
- [ ] `/admin/invoices/[id]/mark-as-paid` (POST) - 支払済み登録
  - ファイル: `app/api/admin/invoices/[id]/mark-as-paid/route.ts`
- [ ] `/admin/invoices/[id]/send` (POST) - 請求書送信
  - ファイル: `app/api/admin/invoices/[id]/send/route.ts`
- [ ] `/admin/invoices/[id]/send-invoice` (POST) - 請求書送信
  - ファイル: `app/api/admin/invoices/[id]/send-invoice/route.ts`
- [ ] `/admin/invoices/[id]/send-estimate` (POST) - 見積書送信
  - ファイル: `app/api/admin/invoices/[id]/send-estimate/route.ts`
- [ ] `/admin/invoices/[id]/resend` (POST) - 再送信
  - ファイル: `app/api/admin/invoices/[id]/resend/route.ts`

---

### 1.4 ユーザー・スタッフ関連（4エンドポイント）

**リスク**: アカウント乗っ取り、権限昇格、なりすまし
**進捗**: 0/4 (0%)

#### バックエンド
- [ ] `/staff/[id]/reset-password` (POST) - パスワードリセット
  - ファイル: `app/api/staff/[id]/reset-password/route.ts`
- [ ] `/staff/[id]/toggle-active` (POST) - アカウント有効/無効
  - ファイル: `app/api/staff/[id]/toggle-active/route.ts`
- [ ] `/staff/[id]` (DELETE) - スタッフ削除
  - ファイル: `app/api/staff/[id]/route.ts`
- [ ] `/staff/[id]` (PATCH) - スタッフ情報更新
  - ファイル: `app/api/staff/[id]/route.ts`

---

### 1.5 休暇申請関連（3エンドポイント）

**リスク**: 休暇の不正承認、勤怠管理の混乱
**進捗**: 0/3 (0%)

#### バックエンド
- [ ] `/leave/[id]/approve` (POST) - 休暇承認
  - ファイル: `app/api/leave/[id]/approve/route.ts`
- [ ] `/leave/[id]/reject` (POST) - 休暇却下
  - ファイル: `app/api/leave/[id]/reject/route.ts`
- [ ] `/leave/[id]` (DELETE) - 休暇削除
  - ファイル: `app/api/leave/[id]/route.ts`

---

## 📋 Phase 2: 中優先度

**期間**: Week 3-4（2週間）
**対象**: 38エンドポイント
**リスク**: HIGH

### 2.1 作業報告関連（10エンドポイント）

#### バックエンド
- `/work-reports/bulk-pdf` (POST)
- `/work-reports/custom-fields` (POST)
- `/work-reports/[id]/attachments` (POST)
- `/work-reports/[id]/photos` (POST)
- `/work-reports/custom-fields/[id]` (PUT)
- `/work-reports/custom-fields/[id]` (DELETE)
- `/work-reports/[id]` (PATCH)
- `/work-reports/[id]` (DELETE)
- `/work-reports/[id]/attachments/[attachmentId]` (DELETE)
- `/work-reports/[id]/photos/[photoId]` (DELETE)

---

### 2.2 組織・契約関連（10エンドポイント）

#### バックエンド
- `/organization/plan-upgrade-request` (POST)
- `/organization/backup/full` (POST)
- `/organization` (PATCH)
- `/organization/contract` (PATCH)
- `/admin/organizations` (POST)
- `/admin/organizations/[id]` (PUT)
- `/admin/organizations/[id]` (DELETE)
- `/admin/contracts/[id]/complete` (POST)
- `/admin/contracts/[id]/generate-estimate` (POST)
- `/admin/contracts/[id]/generate-initial-invoice` (POST)

---

### 2.3 支払い関連（3エンドポイント）

#### バックエンド
- `/admin/payments` (POST)
- `/admin/payments/[id]` (PUT)
- `/admin/payments/[id]` (DELETE)

---

### 2.4 クライアント・取引先関連（3エンドポイント）

#### バックエンド
- `/clients/import` (POST)
- `/suppliers` (POST)
- `/suppliers/[id]` (PATCH)
- `/suppliers/[id]` (DELETE)

---

### 2.5 通知関連（3エンドポイント）

#### バックエンド
- `/notifications/mark-read` (POST)
- `/notifications/mark-all-read` (POST)
- `/admin/notifications/[id]/read` (POST)

---

### 2.6 設定関連（6エンドポイント）

#### バックエンド
- `/admin/settings/system` (PUT)
- `/admin/settings/timeout` (PUT)
- `/admin/security/settings` (PUT)
- `/attendance/settings` (PUT)
- `/purchase-orders/settings` (PUT)
- `/work-reports/settings` (PUT) - ✅ 既に保護済み

---

## 📋 Phase 3: 低優先度

**期間**: Week 5-8（4週間）
**対象**: 72エンドポイント
**リスク**: MEDIUM

### 3.1 勤怠関連（残り12エンドポイント）

#### バックエンド
- `/attendance/terminals` (POST)
- `/attendance/terminals/[id]` (PATCH)
- `/attendance/terminals/[id]` (DELETE)
- `/attendance/work-patterns` (POST)
- `/attendance/work-patterns/[id]` (PATCH)
- `/attendance/work-patterns/[id]` (DELETE)
- `/attendance/check-holiday` (POST)
- `/attendance/qr/office/generate` (POST)
- `/attendance/qr/site/leader/generate` (POST)
- `/attendance/alerts/daily-report` (POST)
- `/attendance/alerts` (PATCH)

---

### 3.2 管理者機能関連（20エンドポイント）

#### バックエンド
- `/admin/tools/common` (POST)
- `/admin/tools/common/import` (POST)
- `/admin/tools/common/[id]` (PUT)
- `/admin/tools/common/[id]` (DELETE)
- `/admin/manufacturers` (POST)
- `/admin/manufacturers/[id]` (PUT)
- `/admin/manufacturers/[id]` (DELETE)
- `/admin/manufacturers/unify` (POST)
- `/admin/packages` (POST)
- `/admin/packages/[id]` (PUT)
- `/admin/packages/[id]` (DELETE)
- `/admin/super-admins` (POST)
- `/admin/logout` (POST)
- `/admin/impersonate/logout` (POST)
- `/admin/backup/manual` (POST)
- `/admin/maintenance/cleanup` (POST/PUT/DELETE)
- `/admin/sales-activities` (POST)
- `/admin/test/trigger-cron` (POST)
- `/admin/test/update-billing-date` (POST)
- `/admin/test/generate-invoice` (POST)

---

### 3.3 認証・2FA関連（11エンドポイント）

#### バックエンド
- `/auth/logout` (POST)
- `/auth/forgot-password` (POST)
- `/auth/2fa/request-reset` (POST)
- `/auth/2fa/reset` (POST)
- `/admin/2fa/disable` (POST)
- `/admin/2fa/test` (POST)
- `/admin/2fa/verify` (POST)
- `/admin/2fa/verify-backup` (POST)
- `/admin/2fa/grace-period` (POST/PUT/DELETE)
- `/user/2fa/enable` (POST)
- `/user/2fa/disable` (POST)
- `/user/2fa/verify` (POST)

---

### 3.4 契約・プラン変更関連（5エンドポイント）

#### バックエンド
- `/admin/contracts/change-plan/preview` (POST)
- `/admin/contracts/[id]/change-plan` (POST)
- `/admin/contracts/[id]/validate-change` (POST)
- `/admin/contracts/[id]` (PUT/PATCH)

---

### 3.5 スタッフ・休暇関連（3エンドポイント）

#### バックエンド
- `/staff` (POST)
- `/staff/bulk-import` (POST)
- `/leave` (POST)
- `/leave/[id]` (PATCH)

---

### 3.6 デモ・テスト関連（3エンドポイント）

#### バックエンド
- `/demo/create` (POST)
- `/demo/send-email` (POST)
- `/demo/request` (POST) - ✅ 既に保護済み

---

### 3.7 Stripe・支払い関連（3エンドポイント）

#### バックエンド
- `/stripe/customers/create` (POST)
- `/stripe/subscriptions/create` (POST)
- `/stripe/subscriptions/upgrade` (POST)
- `/stripe/subscriptions/downgrade` (POST)

---

### 3.8 その他（15エンドポイント）

#### バックエンド
- `/reset-password/update` (POST)
- `/company-seal/generate` (POST)
- `/onboarding/complete` (POST)
- `/tool-sets/delete-for-individual-move` (POST)
- `/analytics/track` (POST)
- `/cron/check-warranty-expiration` (POST)
- `/cron/check-low-stock` (POST)
- `/cron/check-equipment-expiration` (POST)
- `/webhooks/stripe` (POST)
- その他

---

## 🛠️ 実装ガイド

### バックエンド修正テンプレート

```typescript
// 修正前
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ... 処理
  } catch (error) {
    // エラー処理
  }
}

// 修正後
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

export async function POST(request: NextRequest) {
  // 🔒 CSRF検証を最初に追加
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[API] CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ... 処理（変更なし）
  } catch (error) {
    // エラー処理（変更なし）
  }
}
```

### フロントエンド修正テンプレート

```typescript
// 修正前
const handleSubmit = async () => {
  const response = await fetch('/api/attendance/clock-out', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ method: 'manual' })
  })
}

// 修正後
import { useCsrfToken } from '@/hooks/useCsrfToken'

function MyComponent() {
  const { token: csrfToken } = useCsrfToken()  // 🔒 フック追加

  const handleSubmit = async () => {
    const response = await fetch('/api/attendance/clock-out', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken || '',  // 🔒 トークン追加
      },
      body: JSON.stringify({ method: 'manual' })
    })
  }
}
```

---

## 🚨 重要な注意事項

### 1. バックエンドとフロントエンドの同時修正が必須

```
❌ バックエンドだけ修正 → フロントエンドが壊れる
❌ フロントエンドだけ修正 → セキュリティ効果なし
✅ 両方を同時に修正 → 正常に動作
```

### 2. テスト必須

各エンドポイント修正後：
1. ✅ 正常系：機能が動作するか
2. ✅ CSRF保護：トークンなしで拒否されるか
3. ✅ エラー処理：適切なエラーメッセージが表示されるか

### 3. デプロイ手順

```bash
# 1. ローカルで修正
git add app/api/attendance/clock-in/route.ts
git add app/(authenticated)/attendance/...

# 2. コミット
git commit -m "security: add CSRF protection to attendance endpoints"

# 3. デプロイ
git push origin main
```

---

## 📈 進捗管理

### Phase 1 詳細進捗

| カテゴリ | 対象数 | 完了数 | 進捗率 | ステータス |
|---------|-------|-------|--------|-----------|
| 1.1 勤怠関連 | 7 | 7 | 100% | ✅ **完了** |
| 1.2 発注書関連 | 5 | 5 | 100% | ✅ **完了** |
| 1.3 請求書・見積書関連 | 13 | 0 | 0% | 未着手 |
| 1.4 スタッフ関連 | 4 | 0 | 0% | 未着手 |
| 1.5 休暇申請関連 | 3 | 0 | 0% | 未着手 |
| **Phase 1 合計** | **32** | **12** | **37.5%** | **🔄 進行中** |

### 全体進捗

| Phase | 対象数 | 完了数 | 進捗率 | ステータス |
|-------|-------|-------|--------|-----------|
| Phase 1 | 32 | 12 | 37.5% | 🔄 進行中 |
| Phase 2 | 38 | 0 | 0% | 未着手 |
| Phase 3 | 72 | 0 | 0% | 未着手 |
| **合計** | **142** | **12** | **8.5%** | **🔄 進行中** |

⚠️ **重要**: エンドポイント修正完了時は、必ず以下を更新してください：
1. 該当エンドポイントに `[x]` チェックマークを追加
2. 各カテゴリの「進捗」行を更新
3. この「進捗管理」セクションを更新
4. ファイル冒頭の「最終更新」日付を更新

---

**最終更新**: 2026年1月30日
**次回レビュー**: Phase 1完了後
