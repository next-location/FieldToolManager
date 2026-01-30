#!/bin/bash

###############################################################################
# CSRF保護対応チェックリスト自動生成スクリプト
#
# 目的: CSRF_PROTECTION_PLAN.md から自動でチェックリストを生成
#       修正完了したものにチェックマークを付けていく
#
# 使用方法:
#   ./scripts/generate-csrf-checklist.sh > docs/CSRF_PROTECTION_CHECKLIST.md
###############################################################################

cat <<'EOF'
# CSRF保護対応チェックリスト

**作成日**: $(date '+%Y年%m月%d日')
**自動生成**: このファイルは `scripts/generate-csrf-checklist.sh` により自動生成されました

---

## 📋 Phase 1: 高優先度（CRITICAL）

### 1.1 勤怠関連（12エンドポイント）

#### バックエンド
- [ ] `/api/attendance/clock-in` (POST) - 出勤打刻
- [ ] `/api/attendance/clock-out` (POST) - 退勤打刻
- [ ] `/api/attendance/break/start` (POST) - 休憩開始
- [ ] `/api/attendance/break/end` (POST) - 休憩終了
- [ ] `/api/attendance/records/proxy` (POST) - 代理打刻
- [ ] `/api/attendance/qr/verify` (POST) - QR打刻検証
- [ ] `/api/attendance/records/[id]` (PATCH) - 勤怠記録修正
- [ ] `/api/attendance/records/[id]` (DELETE) - 勤怠記録削除

#### フロントエンド
- [ ] `app/(authenticated)/attendance/records/ProxyClockInModal.tsx`
- [ ] `app/(authenticated)/attendance/records/EditAttendanceModal.tsx`
- [ ] 勤怠打刻関連コンポーネント（検証中）

---

### 1.2 発注書関連（5エンドポイント）

#### バックエンド
- [ ] `/api/purchase-orders/bulk-approve` (POST) - 一括承認
- [ ] `/api/purchase-orders/[id]/mark-paid` (POST) - 支払済み登録
- [ ] `/api/purchase-orders/[id]/mark-received` (POST) - 受領登録
- [ ] `/api/purchase-orders/[id]/send` (POST) - 発注書送信
- [ ] `/api/purchase-orders/[id]` (DELETE) - 発注書削除

#### フロントエンド
- [ ] `app/(authenticated)/purchase-orders/[id]/page.tsx`
- [ ] `app/(authenticated)/purchase-orders/list/PurchaseOrdersTable.tsx`

---

### 1.3 請求書・見積書関連（13エンドポイント）

#### バックエンド
- [ ] `/api/estimates/[id]/approve` (POST) - 見積書承認
- [ ] `/api/estimates/[id]/customer-approve` (POST) - 顧客承認
- [ ] `/api/estimates/[id]/customer-reject` (POST) - 顧客却下
- [ ] `/api/estimates/[id]/send` (POST) - 見積書送信
- [ ] `/api/estimates/[id]/return` (POST) - 見積書差戻し
- [ ] `/api/estimates/[id]` (PUT) - 見積書更新
- [ ] `/api/estimates/[id]` (DELETE) - 見積書削除
- [ ] `/api/admin/invoices/[id]/convert-to-invoice` (POST) - 請求書変換
- [ ] `/api/admin/invoices/[id]/mark-as-paid` (POST) - 支払済み登録
- [ ] `/api/admin/invoices/[id]/send` (POST) - 請求書送信
- [ ] `/api/admin/invoices/[id]/send-invoice` (POST) - 請求書送信
- [ ] `/api/admin/invoices/[id]/send-estimate` (POST) - 見積書送信
- [ ] `/api/admin/invoices/[id]/resend` (POST) - 再送信

#### フロントエンド
- [ ] `app/(authenticated)/estimates/[id]/page.tsx`
- [ ] `app/(authenticated)/invoices/[id]/page.tsx`
- [ ] `app/admin/invoices/[id]/page.tsx`

---

### 1.4 ユーザー・スタッフ関連（4エンドポイント）

#### バックエンド
- [ ] `/api/staff/[id]/reset-password` (POST) - パスワードリセット
- [ ] `/api/staff/[id]/toggle-active` (POST) - アカウント有効/無効
- [ ] `/api/staff/[id]` (DELETE) - スタッフ削除
- [ ] `/api/staff/[id]` (PATCH) - スタッフ情報更新

#### フロントエンド
- [ ] `app/(authenticated)/staff/[id]/page.tsx`
- [ ] `app/(authenticated)/staff/list/StaffTable.tsx`

---

### 1.5 休暇申請関連（3エンドポイント）

#### バックエンド
- [ ] `/api/leave/[id]/approve` (POST) - 休暇承認
- [ ] `/api/leave/[id]/reject` (POST) - 休暇却下
- [ ] `/api/leave/[id]` (DELETE) - 休暇削除

#### フロントエンド
- [ ] 休暇申請関連コンポーネント（検証中）

---

## 📊 Phase 1 進捗

| カテゴリ | バックエンド | フロントエンド | 完了率 |
|---------|------------|--------------|--------|
| 勤怠 | 0/8 | 0/3 | 0% |
| 発注書 | 0/5 | 0/2 | 0% |
| 請求書・見積書 | 0/13 | 0/3 | 0% |
| スタッフ | 0/4 | 0/2 | 0% |
| 休暇 | 0/3 | 0/1 | 0% |
| **合計** | **0/33** | **0/11** | **0%** |

---

## ✅ 検証コマンド

修正後、以下のコマンドで検証してください：

```bash
# バックエンド検証
npx tsx scripts/verify-csrf-backend.ts

# フロントエンド検証
npx tsx scripts/verify-csrf-frontend.ts

# エンドツーエンド検証
npx tsx scripts/test-csrf-complete.ts
```

---

## 📝 更新履歴

- **2026年1月30日**: チェックリスト作成

EOF
