# 通知機能 要件定義書

## 目次

1. [概要](#概要)
2. [既存実装済み通知](#既存実装済み通知)
3. [未実装通知の洗い出し](#未実装通知の洗い出し)
4. [最優先実装通知の詳細](#最優先実装通知の詳細)
5. [実装優先順位](#実装優先順位)
6. [通知システムの設計方針](#通知システムの設計方針)

---

## 概要

ザイロクの通知システムは、ユーザーの業務効率化とリスク低減を目的としています。
本ドキュメントでは、現在実装済みの通知と、新たに必要と判断された通知の要件を定義します。

### 通知の目的

- **業務効率化**: 重要なイベントをタイムリーに通知し、対応漏れを防ぐ
- **リスク低減**: 期限切れ、予算超過、在庫不足などのリスクを早期に検知
- **承認フロー**: 承認待ち、承認結果などのワークフロー通知
- **セキュリティ**: 権限変更、不正アクセス検知などのセキュリティ通知

### 通知の送信方法

- **in_app**: アプリ内通知（通知一覧ページ、ベルアイコン）
- **email**: メール通知（組織設定で有効化）
- **SMS**: SMS通知（将来実装検討）

---

## 既存実装済み通知

以下の通知は既に実装されています。

### 1. 作業報告書関連

#### 1.1 作業報告書提出通知
- **トリガー**: スタッフが作業報告書を提出した時
- **送信先**: Leader/Admin
- **実装場所**: `lib/notifications/work-report-notifications.ts` - `notifyWorkReportSubmitted()`
- **通知内容**: 「{スタッフ名}さんが{日付}の作業報告書（{現場名}）を提出しました」

#### 1.2 作業報告書承認通知
- **トリガー**: Leader/Adminが作業報告書を承認した時
- **送信先**: 作成者（スタッフ）
- **実装場所**: `lib/notifications/work-report-notifications.ts` - `notifyWorkReportApproved()`
- **通知内容**: 「{承認者名}さんが{日付}の作業報告書（{現場名}）を承認しました」
- **severity**: success

#### 1.3 作業報告書却下通知
- **トリガー**: Leader/Adminが作業報告書を却下した時
- **送信先**: 作成者（スタッフ）
- **実装場所**: `lib/notifications/work-report-notifications.ts` - `notifyWorkReportRejected()`
- **通知内容**: 「{承認者名}さんが{日付}の作業報告書（{現場名}）を却下しました」
- **severity**: warning

### 2. 発注書関連

#### 2.1 発注書承認通知
- **トリガー**: Manager/Adminが発注書を承認した時
- **送信先**: 発注書作成者
- **実装場所**: `app/api/purchase-orders/[id]/approve/route.ts`
- **通知内容**: 「発注書「{発注書番号}」が承認されました」
- **severity**: success

#### 2.2 発注書差し戻し通知
- **トリガー**: Manager/Adminが発注書を差し戻した時
- **送信先**: 発注書作成者
- **実装場所**: `app/api/purchase-orders/[id]/reject/route.ts`
- **通知内容**: 「発注書「{発注書番号}」が差し戻されました。理由: {理由}」
- **severity**: warning

### 3. 請求書関連

#### 3.1 請求書承認通知
- **トリガー**: Manager/Adminが請求書を承認した時
- **送信先**: 請求書作成者
- **実装場所**: `app/api/invoices/[id]/approve/route.ts`
- **通知内容**: 「請求書が承認されました」
- **severity**: success

#### 3.2 請求書差し戻し通知
- **トリガー**: Manager/Adminが請求書を差し戻した時
- **送信先**: 請求書作成者
- **実装場所**: `app/api/invoices/[id]/return/route.ts`
- **通知内容**: 「請求書が差し戻されました」
- **severity**: warning

#### 3.3 請求書支払い記録通知
- **トリガー**: 請求書に支払いが記録された時
- **送信先**: Manager/Admin
- **実装場所**: `app/api/invoices/[id]/payment/route.ts`
- **通知内容**: 「請求書の支払いが記録されました」
- **severity**: info

### 4. 在庫・道具関連

#### 4.1 低在庫アラート
- **トリガー**: 道具/消耗品の在庫が最小値を下回った時（cronジョブで定期チェック）
- **送信先**: Manager/Admin
- **実装場所**: `app/api/cron/check-low-stock/route.ts`
- **通知内容**: 「{道具名}の在庫が{現在数}個になりました（最小在庫数: {最小数}個）」
- **severity**: warning
- **送信方法**: email + in_app

#### 4.2 保証期限切れアラート
- **トリガー**: 道具の保証期限が近づいている時（cronジョブで定期チェック）
- **送信先**: Manager/Admin
- **実装場所**: `app/api/cron/check-warranty-expiration/route.ts`
- **severity**: warning

#### 4.3 点検期限切れアラート
- **トリガー**: 重機の点検期限が近づいている時（cronジョブで定期チェック）
- **送信先**: Manager/Admin
- **実装場所**: `app/api/cron/check-equipment-expiration/route.ts`
- **severity**: warning

### 5. 勤怠管理関連

#### 5.1 出勤忘れアラート
- **トリガー**: 10:00時点で出勤打刻がないスタッフ
- **送信先**: 対象スタッフ本人
- **実装場所**: cronジョブ（詳細確認が必要）
- **severity**: warning

#### 5.2 退勤忘れアラート
- **トリガー**: 20:00時点で退勤打刻がないスタッフ
- **送信先**: 対象スタッフ本人
- **実装場所**: cronジョブ（詳細確認が必要）
- **severity**: warning

#### 5.3 管理者向け日次レポート
- **トリガー**: 毎日10:00
- **送信先**: Manager/Admin
- **実装場所**: cronジョブ（詳細確認が必要）
- **severity**: info

---

## 未実装通知の洗い出し

全機能を詳細に分析した結果、**36種類の未実装通知**が必要と判断されました。

### 機能パック: Asset Pack（資産管理のみ）

#### 道具・消耗品管理

##### 1. 道具移動時の承認通知
- **トリガー**: 特定の現場への道具移動時（高額道具、重要道具）
- **送信先**: Manager/Admin
- **重要度**: 中
- **理由**: 高額な道具や重要な道具の移動を管理者が把握することで、紛失リスクを低減できる

##### 2. 道具返却遅延アラート ⭐
- **トリガー**: 道具の返却予定日を過ぎても返却されていない
- **送信先**: 借りているスタッフ + Manager/Admin
- **重要度**: 高
- **理由**: 道具の長期借用による業務への影響を防ぐため。現場での道具不足を未然に防ぐ
- **前提条件**: tool_itemsテーブルにexpected_return_dateカラムが必要

##### 3. 消耗品発注完了通知
- **トリガー**: 消耗品の発注ステータスが「納品済み」になった時
- **送信先**: 発注したスタッフ + 在庫管理担当者
- **重要度**: 中
- **理由**: 発注した消耗品が納品されたことを確認し、在庫に追加する作業をスムーズに行える

##### 4. 消耗品使用期限アラート
- **トリガー**: 消耗品の使用期限が30日前、7日前、当日
- **送信先**: Manager/Admin
- **重要度**: 中
- **理由**: 期限切れ消耗品の使用を防ぎ、安全性と品質を確保する

##### 5. 一括移動完了通知
- **トリガー**: 道具セットの一括移動が完了した時
- **送信先**: 移動を実行したスタッフ + Manager/Admin
- **重要度**: 低
- **理由**: 大量の道具移動が完了したことを確認し、作業の進捗を把握できる

#### 重機管理

##### 6. 重機点検期限アラート（事前通知の強化）⭐
- **トリガー**: 点検期限の30日前、14日前、7日前、当日
- **送信先**: Manager/Admin + 重機担当スタッフ
- **重要度**: 高
- **理由**: 法定点検の期限切れは法令違反につながるため、複数段階での通知が必要。既存の「点検期限切れアラート」は当日のみのため、事前通知を追加
- **現状**: 基本機能は実装済みだが、事前通知は未実装

##### 7. 重機保険期限アラート ⭐
- **トリガー**: 保険期限の60日前、30日前、14日前、当日
- **送信先**: Admin
- **重要度**: 高
- **理由**: 保険切れによる事故時のリスクを回避するため、余裕を持った更新が必要

##### 8. 重機稼働時間アラート
- **トリガー**: 累計稼働時間が一定時間を超えた時（例: 500時間ごと）
- **送信先**: Manager/Admin
- **重要度**: 中
- **理由**: 定期メンテナンスのタイミングを適切に把握し、故障を未然に防ぐ

##### 9. 重機メンテナンス記録通知
- **トリガー**: 重機のメンテナンスが記録された時
- **送信先**: Manager/Admin
- **重要度**: 低
- **理由**: メンテナンス履歴を管理者が把握し、重機の状態を追跡できる

#### 現場管理

##### 10. 現場クローズアラート
- **トリガー**: 現場の終了予定日の7日前、3日前、当日
- **送信先**: 現場リーダー + Manager/Admin
- **重要度**: 中
- **理由**: 現場終了に向けた道具・重機の返却、片付けの準備を促す

##### 11. 現場在庫不足アラート
- **トリガー**: 特定の現場で消耗品が不足している時
- **送信先**: 現場リーダー + Manager/Admin
- **重要度**: 高
- **理由**: 現場での作業遅延を防ぐため、早急に消耗品を補充する必要がある

---

### 機能パック: DX Pack（フル機能）

#### 見積書管理

##### 12. 見積書有効期限アラート
- **トリガー**: 見積書の有効期限の7日前、3日前、当日
- **送信先**: 作成者（Leader以上） + Manager/Admin
- **重要度**: 中
- **理由**: 見積書の有効期限切れを防ぎ、顧客への再見積もり対応を適切に行える

##### 13. 見積書未提出アラート
- **トリガー**: 下書き状態の見積書が一定期間（例: 7日間）放置されている
- **送信先**: 作成者（Leader以上）
- **重要度**: 低
- **理由**: 見積書の提出忘れを防ぎ、業務の滞りを解消する

##### 14. 見積書→注文受注通知
- **トリガー**: 見積書から工事（Project）が作成された時
- **送信先**: 見積書作成者 + Manager/Admin
- **重要度**: 中
- **理由**: 見積もりから受注につながったことを把握し、工事準備を開始できる

#### 請求書管理

##### 15. 請求書送付通知
- **トリガー**: 請求書が顧客へ送付された時
- **送信先**: 作成者
- **重要度**: 低
- **理由**: 請求書が顧客に送られたことを確認し、入金待ちの状態を把握できる

##### 16. 請求書支払期日アラート ⭐
- **トリガー**: 支払期日の7日前、3日前、当日、超過後
- **送信先**: Manager/Admin
- **重要度**: 高
- **理由**: 未入金の請求書を適切に管理し、資金繰りを円滑にする

##### 17. 請求書一部入金通知
- **トリガー**: 請求書に一部入金が記録された時
- **送信先**: Manager/Admin
- **重要度**: 中
- **理由**: 一部入金の状況を把握し、残額の回収を管理できる

#### 工事管理（Project）

##### 18. 工事開始日リマインダー
- **トリガー**: 工事開始日の3日前、前日
- **送信先**: 工事担当者（Leader以上） + Manager/Admin
- **重要度**: 中
- **理由**: 工事開始の準備（道具・スタッフ・資材の手配）を適切に行える

##### 19. 工事進捗遅延アラート
- **トリガー**: 工事の進捗率が予定より遅れている時（自動判定）
- **送信先**: 工事担当者 + Manager/Admin
- **重要度**: 高
- **理由**: 工事の遅延を早期に発見し、リソース追加や工程調整を行える

##### 20. 工事完了予定日アラート
- **トリガー**: 工事完了予定日の7日前、3日前、当日
- **送信先**: 工事担当者 + Manager/Admin
- **重要度**: 中
- **理由**: 工事完了に向けた準備（検査、引き渡し書類作成）を促す

##### 21. 工事予算超過アラート ⭐
- **トリガー**: 工事の実費が予算の80%, 100%, 120%を超えた時
- **送信先**: Manager/Admin
- **重要度**: 高
- **理由**: 予算超過による赤字を未然に防ぐため、早期に対策を講じる必要がある

#### 入出金管理

##### 22. 入金遅延アラート ⭐
- **トリガー**: 入金予定日を過ぎても入金がない時（7日後、14日後、30日後）
- **送信先**: Manager/Admin
- **重要度**: 高
- **理由**: 売掛金の回収遅れを早期に把握し、督促や回収対応を行える

##### 23. 支払期日リマインダー（買掛金）
- **トリガー**: 支払期日の7日前、3日前、当日
- **送信先**: Manager/Admin
- **重要度**: 高
- **理由**: 支払い遅延による信用失墜や取引停止を防ぐため、確実に支払いを実行する

##### 24. 大口入金通知
- **トリガー**: 一定金額以上（例: 100万円以上）の入金があった時
- **送信先**: Admin
- **重要度**: 中
- **理由**: 重要な入金を管理者が把握し、資金管理を適切に行える

##### 25. 大口支出通知
- **トリガー**: 一定金額以上（例: 50万円以上）の支出があった時
- **送信先**: Admin
- **重要度**: 中
- **理由**: 大きな支出を管理者が把握し、不正や誤操作を防ぐ

---

### 共通機能

#### スタッフ管理

##### 26. スタッフプラン上限到達アラート
- **トリガー**: スタッフ数が上限の80%, 90%, 100%に達した時
- **送信先**: Admin
- **重要度**: 中
- **理由**: プランアップグレードを促し、スタッフ追加ができない状況を回避する

##### 27. スタッフ招待期限切れアラート
- **トリガー**: スタッフ招待リンクの有効期限が近づいている（3日前、1日前、当日）
- **送信先**: Admin
- **重要度**: 低
- **理由**: 招待リンクの再発行が必要な場合を早期に把握できる

##### 28. スタッフパスワードリセット完了通知
- **トリガー**: 管理者によるパスワードリセットが完了した時
- **送信先**: 対象スタッフ
- **重要度**: 高
- **理由**: セキュリティ上、パスワード変更を本人に通知する必要がある

##### 29. 長期未ログインスタッフアラート
- **トリガー**: スタッフが30日以上ログインしていない時
- **送信先**: Admin
- **重要度**: 低
- **理由**: 不要なアカウントの整理や、スタッフの利用状況を把握できる

#### 組織・システム設定

##### 30. 契約更新期限アラート
- **トリガー**: 契約更新日の30日前、14日前、7日前
- **送信先**: Admin
- **重要度**: 高
- **理由**: サービス停止を防ぐため、契約更新を適切に行う必要がある

##### 31. システムメンテナンス通知
- **トリガー**: システムメンテナンスの24時間前、1時間前
- **送信先**: 全ユーザー
- **重要度**: 高
- **理由**: メンテナンス中のサービス停止を事前に通知し、業務への影響を最小化する

##### 32. 新機能追加通知
- **トリガー**: 新機能がリリースされた時
- **送信先**: Admin（または全ユーザー）
- **重要度**: 低
- **理由**: 新機能の利用を促し、システムの価値を最大化する

##### 33. データエクスポート完了通知
- **トリガー**: 大規模なデータエクスポート（CSV等）が完了した時
- **送信先**: エクスポートを実行したユーザー
- **重要度**: 低
- **理由**: 長時間かかるエクスポート処理の完了を通知し、ユーザビリティを向上させる

#### 権限・セキュリティ

##### 34. 権限変更通知 ⭐
- **トリガー**: スタッフの権限（Role）が変更された時
- **送信先**: 対象スタッフ + Admin
- **重要度**: 高
- **理由**: セキュリティ上、権限変更を本人と管理者に通知する必要がある

##### 35. 不正アクセス検知アラート
- **トリガー**: 同じIPアドレスから短時間に複数回ログイン失敗があった時
- **送信先**: Admin
- **重要度**: 高
- **理由**: 不正アクセスの試行を検知し、セキュリティ対策を強化する

##### 36. パスワード有効期限アラート
- **トリガー**: パスワード変更から90日経過した時（ポリシーに応じて）
- **送信先**: 対象スタッフ
- **重要度**: 中
- **理由**: 定期的なパスワード変更を促し、セキュリティを向上させる

---

## 最優先実装通知の詳細

以下の7つの通知は、ユーザーにとって特に価値が高く、業務の効率化・リスク低減に大きく貢献するため、最優先で実装すべきです。

### 1. 道具返却遅延アラート

#### 概要
- **機能パック**: Asset Pack
- **重要度**: 高
- **実装難易度**: ❌ 高（DB変更必要）

#### 詳細仕様

##### トリガー
- 道具の返却予定日（expected_return_date）を過ぎても返却されていない

##### 送信先
- 借りているスタッフ本人
- Manager/Admin

##### 通知タイミング
- 返却予定日当日（朝9:00）
- 返却予定日超過後1日目、3日目、7日目

##### 通知内容
```
件名: 道具の返却期限が過ぎています
本文:
{スタッフ名}さん

以下の道具の返却期限が{超過日数}日過ぎています。
早急に返却をお願いします。

道具名: {道具名}
管理番号: {管理番号}
返却予定日: {返却予定日}
現在の場所: {現在地}
```

##### 実装場所
- 新規cronジョブ: `/api/cron/check-tool-return-overdue/route.ts`
- 実行頻度: 毎日朝9:00

##### 前提条件（⚠️ 重要）
**現在、tool_itemsテーブルに返却予定日フィールドが存在しないため、実装不可**

実装に必要な前提作業:
1. `tool_items`テーブルに`expected_return_date DATE`カラムを追加
2. チェックアウト時に返却予定日を入力するUI追加
3. チェックイン時に`expected_return_date`をクリアする処理追加

```sql
-- Migration: 返却予定日フィールド追加
ALTER TABLE tool_items
  ADD COLUMN expected_return_date DATE DEFAULT NULL;

COMMENT ON COLUMN tool_items.expected_return_date IS '返却予定日（チェックアウト時に設定）';

CREATE INDEX idx_tool_items_expected_return_date
  ON tool_items(expected_return_date)
  WHERE expected_return_date IS NOT NULL AND status = 'checked_out';
```

##### 判定ロジック
```typescript
// 返却遅延の道具を検索
const { data: overdueTools } = await supabase
  .from('tool_items')
  .select(`
    *,
    tool:tools(name),
    checked_out_by_user:users!tool_items_checked_out_by_fkey(id, name, email),
    location:sites(name)
  `)
  .eq('status', 'checked_out')
  .not('expected_return_date', 'is', null)
  .lt('expected_return_date', new Date().toISOString().split('T')[0])
```

#### 優先度判断
- **現状**: DB設計変更が必要なため、実装は保留
- **代替案**: チェックアウト機能の改善を先に実施し、返却予定日機能を追加してから実装

---

### 2. 重機点検期限アラート（事前通知の強化）

#### 概要
- **機能パック**: Asset Pack
- **重要度**: 高
- **実装難易度**: ⚠️ 低（既存機能の拡張）

#### 詳細仕様

##### トリガー
- 重機の点検期限（next_inspection_date）の30日前、14日前、7日前、当日

##### 送信先
- Manager/Admin
- 重機担当スタッフ（将来実装: heavy_equipmentにassigned_to追加時）

##### 通知タイミング
- 30日前（朝9:00）: 「点検期限が1ヶ月後に迫っています」
- 14日前（朝9:00）: 「点検期限が2週間後に迫っています」
- 7日前（朝9:00）: 「点検期限が1週間後に迫っています」
- 当日（朝9:00）: 「本日が点検期限日です」

##### 通知内容
```
件名: 【重要】重機点検期限のお知らせ（{残り日数}日）
本文:
以下の重機の点検期限が{残り日数}日後に迫っています。

重機名: {重機名}
管理番号: {管理番号}
点検期限: {点検期限日}
前回点検日: {前回点検日}

法定点検の期限切れは法令違反となりますので、早急に点検の手配をお願いします。
```

##### 実装場所
- 既存cronジョブの拡張: `/api/cron/check-equipment-expiration/route.ts`
- 実行頻度: 毎日朝9:00

##### 現状の実装
既存の`check-equipment-expiration`は実装済みだが、**事前通知（30日前、14日前など）が未実装**

##### 必要な改修
```typescript
// 現在の実装: 当日のみ
const { data: equipment } = await supabase
  .from('heavy_equipment')
  .select('*')
  .lte('next_inspection_date', new Date().toISOString())

// 改修後: 複数段階の事前通知
const today = new Date()
const in30Days = addDays(today, 30)
const in14Days = addDays(today, 14)
const in7Days = addDays(today, 7)

// 30日前
const { data: equipment30 } = await supabase
  .from('heavy_equipment')
  .select('*')
  .eq('next_inspection_date', in30Days.toISOString().split('T')[0])
  .is('deleted_at', null)

// 通知を送信し、重複防止のため最終通知日を記録
await sendNotification({
  type: 'inspection_due_30days',
  title: '【重要】重機点検期限のお知らせ（30日前）',
  severity: 'warning',
  related_equipment_id: equipment.id,
})
```

##### 重複通知の防止
同じ重機について同じタイミングの通知を複数回送らないよう、`notifications`テーブルに記録して判定する

```typescript
// 既に同じ通知を送信済みかチェック
const { data: existingNotification } = await supabase
  .from('notifications')
  .select('id')
  .eq('type', 'inspection_due_30days')
  .eq('related_equipment_id', equipment.id)
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // 24時間以内
  .single()

if (existingNotification) {
  // 既に通知済み
  continue
}
```

#### 優先度判断
- **優先度**: 高（法令遵守のため必須）
- **実装順序**: 2番目（既存機能の拡張で実装が容易）

---

### 3. 重機保険期限アラート

#### 概要
- **機能パック**: Asset Pack
- **重要度**: 高
- **実装難易度**: ✅ 中（新規cronジョブ作成）

#### 詳細仕様

##### トリガー
- 重機の保険期限（insurance_expiration_date）の60日前、30日前、14日前、当日

##### 送信先
- Admin

##### 通知タイミング
- 60日前（朝9:00）: 「保険期限が2ヶ月後に迫っています」
- 30日前（朝9:00）: 「保険期限が1ヶ月後に迫っています」
- 14日前（朝9:00）: 「保険期限が2週間後に迫っています」
- 当日（朝9:00）: 「本日が保険期限日です」

##### 通知内容
```
件名: 【緊急】重機保険期限のお知らせ（{残り日数}日）
本文:
以下の重機の保険期限が{残り日数}日後に迫っています。

重機名: {重機名}
管理番号: {管理番号}
保険期限: {保険期限日}
保険会社: {保険会社名}（メタデータに保存されている場合）

保険切れによる事故時のリスクを回避するため、早急に保険の更新手続きをお願いします。
```

##### 実装場所
- 新規cronジョブ: `/api/cron/check-insurance-expiration/route.ts`
- 実行頻度: 毎日朝9:00

##### データベース確認
`heavy_equipment`テーブルに`insurance_expiration_date`カラムが存在するか確認が必要

##### 実装コード（例）
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // 認証トークンチェック
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const supabase = await createClient()
    const today = new Date()

    const checkDates = [
      { days: 60, label: '60日前', severity: 'warning' as const },
      { days: 30, label: '30日前', severity: 'warning' as const },
      { days: 14, label: '14日前', severity: 'error' as const },
      { days: 0, label: '当日', severity: 'error' as const },
    ]

    let totalNotificationsSent = 0

    for (const check of checkDates) {
      const targetDate = new Date(today)
      targetDate.setDate(today.getDate() + check.days)
      const targetDateStr = targetDate.toISOString().split('T')[0]

      const { data: equipment, error } = await supabase
        .from('heavy_equipment')
        .select('*, organization:organizations(id, name)')
        .eq('insurance_expiration_date', targetDateStr)
        .is('deleted_at', null)

      if (error || !equipment || equipment.length === 0) continue

      for (const item of equipment) {
        // 重複通知チェック
        const { data: existing } = await supabase
          .from('notifications')
          .select('id')
          .eq('type', 'insurance_expiration')
          .eq('related_equipment_id', item.id)
          .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .single()

        if (existing) continue

        // 通知作成
        await supabase.from('notifications').insert({
          organization_id: item.organization_id,
          type: 'insurance_expiration',
          title: `【緊急】重機保険期限のお知らせ（${check.label}）`,
          message: `${item.name}の保険期限が${check.days}日後に迫っています（期限: ${item.insurance_expiration_date}）`,
          severity: check.severity,
          related_equipment_id: item.id,
          metadata: {
            days_until_expiration: check.days,
            expiration_date: item.insurance_expiration_date,
          },
          sent_via: ['in_app'],
          sent_at: new Date().toISOString(),
        })

        totalNotificationsSent++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Insurance expiration check completed. ${totalNotificationsSent} notifications sent.`,
      notificationsSent: totalNotificationsSent,
    })
  } catch (error: any) {
    console.error('Insurance expiration check error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
```

##### Vercel Cron設定
`vercel.json`に追加:
```json
{
  "crons": [
    {
      "path": "/api/cron/check-insurance-expiration",
      "schedule": "0 9 * * *"
    }
  ]
}
```

#### 優先度判断
- **優先度**: 高（事故時のリスク回避のため重要）
- **実装順序**: 3番目（新規cronだが実装は比較的容易）

---

### 4. 請求書支払期日アラート

#### 概要
- **機能パック**: DX Pack
- **重要度**: 高
- **実装難易度**: ✅ 中（新規cronジョブ作成）

#### 詳細仕様

##### トリガー
- 請求書の支払期日（due_date）の7日前、3日前、当日

##### 送信先
- Manager/Admin

##### 通知タイミング
- 7日前（朝9:00）: 「支払期日が1週間後に迫っています」
- 3日前（朝9:00）: 「支払期日が3日後に迫っています」
- 当日（朝9:00）: 「本日が支払期日です」

##### 通知内容
```
件名: 請求書の支払期日が近づいています（{残り日数}日）
本文:
以下の請求書の支払期日が{残り日数}日後に迫っています。

請求書番号: {請求書番号}
取引先: {取引先名}
金額: ¥{金額}
支払期日: {支払期日}
ステータス: {支払状況}

資金繰りの確認をお願いします。
```

##### 実装場所
- 新規cronジョブ: `/api/cron/check-invoice-due-date/route.ts`
- 実行頻度: 毎日朝9:00

##### 対象レコード
- `invoices`テーブル
- 条件:
  - `status = 'approved'`（承認済み）
  - `payment_status != 'paid'`（未払い）
  - `due_date`が7日後、3日後、当日

##### 実装コード（例）
```typescript
const checkDates = [
  { days: 7, label: '7日前' },
  { days: 3, label: '3日前' },
  { days: 0, label: '当日' },
]

for (const check of checkDates) {
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() + check.days)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  const { data: invoices } = await supabase
    .from('invoices')
    .select('*, customer:customers(name)')
    .eq('status', 'approved')
    .neq('payment_status', 'paid')
    .eq('due_date', targetDateStr)
    .is('deleted_at', null)

  for (const invoice of invoices || []) {
    await supabase.from('notifications').insert({
      organization_id: invoice.organization_id,
      type: 'invoice_due_date',
      title: `請求書の支払期日が近づいています（${check.label}）`,
      message: `請求書「${invoice.invoice_number}」の支払期日が${check.days}日後です（取引先: ${invoice.customer?.name}、金額: ¥${invoice.total_amount?.toLocaleString()}）`,
      severity: check.days === 0 ? 'error' : 'warning',
      related_invoice_id: invoice.id,
      metadata: {
        days_until_due: check.days,
        due_date: invoice.due_date,
        total_amount: invoice.total_amount,
      },
      sent_via: ['in_app'],
      sent_at: new Date().toISOString(),
    })
  }
}
```

#### 優先度判断
- **優先度**: 高（資金繰り管理のため重要）
- **実装順序**: 4番目

---

### 5. 入金遅延アラート

#### 概要
- **機能パック**: DX Pack
- **重要度**: 高
- **実装難易度**: ✅ 中（新規cronジョブ作成）

#### 詳細仕様

##### トリガー
- 請求書の支払期日を過ぎても入金がない場合（7日後、14日後、30日後）

##### 送信先
- Manager/Admin

##### 通知タイミング
- 支払期日超過7日後（朝9:00）: 「入金が1週間遅れています」
- 支払期日超過14日後（朝9:00）: 「入金が2週間遅れています」
- 支払期日超過30日後（朝9:00）: 「入金が1ヶ月遅れています」

##### 通知内容
```
件名: 【重要】入金遅延のお知らせ（{超過日数}日超過）
本文:
以下の請求書の入金が{超過日数}日遅れています。

請求書番号: {請求書番号}
取引先: {取引先名}
金額: ¥{金額}
支払期日: {支払期日}
超過日数: {超過日数}日

売掛金回収のため、早急に取引先への確認・督促をお願いします。
```

##### 実装場所
- 新規cronジョブ: `/api/cron/check-overdue-invoices/route.ts`
- 実行頻度: 毎日朝9:00

##### 対象レコード
- `invoices`テーブル
- 条件:
  - `status = 'approved'`（承認済み）
  - `payment_status = 'unpaid'`（未払い）
  - `due_date < 今日`（期日超過）

##### 実装コード（例）
```typescript
const overdueChecks = [
  { days: 7, label: '1週間', severity: 'warning' as const },
  { days: 14, label: '2週間', severity: 'warning' as const },
  { days: 30, label: '1ヶ月', severity: 'error' as const },
]

for (const check of overdueChecks) {
  const targetDate = new Date(today)
  targetDate.setDate(today.getDate() - check.days)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  const { data: overdueInvoices } = await supabase
    .from('invoices')
    .select('*, customer:customers(name)')
    .eq('status', 'approved')
    .eq('payment_status', 'unpaid')
    .eq('due_date', targetDateStr)
    .is('deleted_at', null)

  for (const invoice of overdueInvoices || []) {
    // 重複通知チェック
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'invoice_overdue')
      .eq('related_invoice_id', invoice.id)
      .eq('metadata->>overdue_days', check.days.toString())
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .single()

    if (existing) continue

    await supabase.from('notifications').insert({
      organization_id: invoice.organization_id,
      type: 'invoice_overdue',
      title: `【重要】入金遅延のお知らせ（${check.label}超過）`,
      message: `請求書「${invoice.invoice_number}」の入金が${check.days}日遅れています（取引先: ${invoice.customer?.name}、金額: ¥${invoice.total_amount?.toLocaleString()}）`,
      severity: check.severity,
      related_invoice_id: invoice.id,
      metadata: {
        overdue_days: check.days,
        due_date: invoice.due_date,
        total_amount: invoice.total_amount,
      },
      sent_via: ['in_app', 'email'],
      sent_at: new Date().toISOString(),
    })
  }
}
```

#### 優先度判断
- **優先度**: 高（売掛金回収管理のため重要）
- **実装順序**: 5番目

---

### 6. 工事予算超過アラート

#### 概要
- **機能パック**: DX Pack
- **重要度**: 高
- **実装難易度**: ❓ 不明（projectsテーブル確認が必要）

#### 詳細仕様

##### トリガー
- 工事の実費が予算の80%, 100%, 120%を超えた時

##### 送信先
- Manager/Admin
- 工事担当者（将来実装時）

##### 通知タイミング
- 予算の80%到達時: 「予算の80%に達しました」（警告）
- 予算の100%到達時: 「予算に到達しました」（重大警告）
- 予算の120%到達時: 「予算を20%超過しています」（緊急）

##### 通知内容
```
件名: 【警告】工事予算超過のお知らせ（{進捗率}%）
本文:
以下の工事の実費が予算の{進捗率}%に達しました。

工事名: {工事名}
予算: ¥{予算}
実費: ¥{実費}
進捗率: {進捗率}%
超過額: ¥{超過額}（超過時のみ）

予算超過による赤字を防ぐため、早急に対策をご検討ください。
```

##### 実装場所
- 方法1: 経費記録時にリアルタイムチェック（推奨）
  - `/api/projects/[id]/expenses/route.ts`
- 方法2: cronジョブで定期チェック
  - `/api/cron/check-project-budget/route.ts`

##### 前提条件（⚠️ 要確認）
`projects`テーブルの存在と構造を確認する必要がある:
- `budget`カラム（予算）
- 経費テーブル（`project_expenses`など）との関連
- 実費の計算方法

##### 判定ロジック（想定）
```typescript
// 工事の全経費を集計
const { data: expenses } = await supabase
  .from('project_expenses')
  .select('amount')
  .eq('project_id', projectId)

const totalExpenses = expenses?.reduce((sum, e) => sum + e.amount, 0) || 0
const budgetProgress = (totalExpenses / project.budget) * 100

// 80%, 100%, 120%の閾値でチェック
const thresholds = [
  { percent: 80, severity: 'warning' as const, label: '80%到達' },
  { percent: 100, severity: 'error' as const, label: '予算到達' },
  { percent: 120, severity: 'error' as const, label: '20%超過' },
]

for (const threshold of thresholds) {
  if (budgetProgress >= threshold.percent) {
    // 既に同じ閾値の通知を送信済みかチェック
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('type', 'project_budget_alert')
      .eq('related_project_id', project.id)
      .eq('metadata->>threshold', threshold.percent.toString())
      .single()

    if (!existing) {
      await supabase.from('notifications').insert({
        organization_id: project.organization_id,
        type: 'project_budget_alert',
        title: `【警告】工事予算超過のお知らせ（${threshold.label}）`,
        message: `工事「${project.name}」の実費が予算の${threshold.percent}%に達しました（予算: ¥${project.budget.toLocaleString()}、実費: ¥${totalExpenses.toLocaleString()}）`,
        severity: threshold.severity,
        related_project_id: project.id,
        metadata: {
          threshold: threshold.percent,
          budget: project.budget,
          total_expenses: totalExpenses,
          progress: budgetProgress,
        },
        sent_via: ['in_app', 'email'],
        sent_at: new Date().toISOString(),
      })
    }
  }
}
```

#### 優先度判断
- **優先度**: 高（赤字防止のため重要）
- **実装順序**: 6番目（projectsテーブルの確認が必要）
- **調査が必要**: データベース構造の確認

---

### 7. 権限変更通知

#### 概要
- **機能パック**: 共通機能（全パック）
- **重要度**: 高
- **実装難易度**: ✅ 低（既存処理に追加するだけ）

#### 詳細仕様

##### トリガー
- スタッフの権限（role）が変更された時

##### 送信先
- 対象スタッフ本人
- Admin（実行者が別の場合）

##### 通知タイミング
- 権限変更直後（リアルタイム）

##### 通知内容
```
件名: あなたの権限が変更されました
本文:
{スタッフ名}さん

あなたの権限が変更されました。

変更前: {旧権限}
変更後: {新権限}
変更者: {変更者名}
変更日時: {変更日時}

権限の変更により、利用可能な機能が変わる場合があります。
ご不明な点がございましたら、管理者にお問い合わせください。
```

##### 実装場所
- スタッフ編集処理: `/app/(authenticated)/staff/[id]/edit/actions.ts`
- 関数: `updateStaffMember()`

##### 実装コード（例）
```typescript
export async function updateStaffMember(formData: FormData) {
  const supabase = await createClient()

  // ... 既存の更新処理 ...

  const staffId = formData.get('staffId') as string
  const newRole = formData.get('role') as string

  // 現在のroleを取得
  const { data: currentStaff } = await supabase
    .from('users')
    .select('role, name, email')
    .eq('id', staffId)
    .single()

  const oldRole = currentStaff?.role

  // 権限が変更された場合のみ通知
  if (oldRole !== newRole) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: updater } = await supabase
      .from('users')
      .select('name, organization_id')
      .eq('id', user?.id)
      .single()

    const roleLabels: Record<string, string> = {
      staff: 'スタッフ',
      leader: 'リーダー',
      manager: 'マネージャー',
      admin: '管理者',
    }

    // 対象スタッフへの通知
    await supabase.from('notifications').insert({
      organization_id: updater?.organization_id,
      type: 'role_changed',
      title: 'あなたの権限が変更されました',
      message: `あなたの権限が「${roleLabels[oldRole]}」から「${roleLabels[newRole]}」に変更されました（変更者: ${updater?.name}）`,
      severity: 'info',
      target_user_id: staffId,
      related_user_id: user?.id,
      metadata: {
        old_role: oldRole,
        new_role: newRole,
        changed_by: updater?.name,
      },
      sent_via: ['in_app', 'email'],
      sent_at: new Date().toISOString(),
    })

    // 管理者への通知（変更者が本人でない場合）
    if (user?.id !== staffId) {
      // Admin全員に通知
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .eq('organization_id', updater?.organization_id)
        .eq('role', 'admin')
        .neq('id', user?.id) // 実行者自身は除外
        .is('deleted_at', null)

      for (const admin of admins || []) {
        await supabase.from('notifications').insert({
          organization_id: updater?.organization_id,
          type: 'role_changed_admin',
          title: 'スタッフの権限が変更されました',
          message: `${currentStaff?.name}さんの権限が「${roleLabels[oldRole]}」から「${roleLabels[newRole]}」に変更されました（変更者: ${updater?.name}）`,
          severity: 'info',
          target_user_id: admin.id,
          related_user_id: staffId,
          metadata: {
            old_role: oldRole,
            new_role: newRole,
            changed_by: updater?.name,
            staff_name: currentStaff?.name,
          },
          sent_via: ['in_app'],
          sent_at: new Date().toISOString(),
        })
      }
    }
  }

  // ... 続きの処理 ...
}
```

#### 優先度判断
- **優先度**: 高（セキュリティ確保のため必須）
- **実装順序**: 1番目（最も簡単で重要）

---

## 実装優先順位

### 推奨実装順序

#### フェーズ1: 即座に実装可能な通知（高優先度）

1. **権限変更通知** ✅
   - 難易度: 低
   - 実装場所: スタッフ編集処理に追加
   - 所要時間: 1時間
   - 重要度: 高（セキュリティ）

2. **重機点検期限アラート（事前通知）** ⚠️
   - 難易度: 低（既存機能の拡張）
   - 実装場所: 既存cronの改修
   - 所要時間: 2時間
   - 重要度: 高（法令遵守）

3. **重機保険期限アラート** ✅
   - 難易度: 中
   - 実装場所: 新規cronジョブ
   - 所要時間: 3時間
   - 重要度: 高（事故リスク回避）

#### フェーズ2: DX Pack関連通知（高優先度）

4. **請求書支払期日アラート** ✅
   - 難易度: 中
   - 実装場所: 新規cronジョブ
   - 所要時間: 3時間
   - 重要度: 高（資金繰り管理）

5. **入金遅延アラート** ✅
   - 難易度: 中
   - 実装場所: 新規cronジョブ
   - 所要時間: 3時間
   - 重要度: 高（売掛金回収）

#### フェーズ3: 調査が必要な通知

6. **工事予算超過アラート** ❓
   - 難易度: 不明（DB構造確認が必要）
   - 実装場所: 経費記録処理またはcronジョブ
   - 所要時間: 調査後に判断
   - 重要度: 高（赤字防止）

#### フェーズ4: DB設計変更が必要な通知（保留）

7. **道具返却遅延アラート** ❌
   - 難易度: 高（DB変更必要）
   - 前提作業: 返却予定日フィールド追加、UI実装
   - 所要時間: 5時間以上
   - 重要度: 高（道具不足防止）
   - **推奨**: チェックアウト機能の改善と合わせて実装

---

### その他の優先度中〜低の通知

#### 優先度: 中（将来実装推奨）

- **現場在庫不足アラート**（Asset Pack）
- **工事進捗遅延アラート**（DX Pack）
- **支払期日リマインダー（買掛金）**（DX Pack）
- **見積書有効期限アラート**（DX Pack）
- **スタッフプラン上限到達アラート**（共通）
- **消耗品使用期限アラート**（Asset Pack）
- **重機稼働時間アラート**（Asset Pack）

#### 優先度: 低（将来検討）

- 消耗品発注完了通知
- 一括移動完了通知
- 重機メンテナンス記録通知
- 現場クローズアラート
- 見積書未提出アラート
- 見積書→注文受注通知
- 請求書送付通知
- 請求書一部入金通知
- 工事開始日リマインダー
- 工事完了予定日アラート
- 大口入金・支出通知
- スタッフ招待期限切れアラート
- スタッフパスワードリセット完了通知
- 長期未ログインスタッフアラート
- 契約更新期限アラート
- システムメンテナンス通知
- 新機能追加通知
- データエクスポート完了通知
- 不正アクセス検知アラート
- パスワード有効期限アラート

---

## 通知システムの設計方針

### 1. 通知の重複防止

#### 原則
同じ通知を短期間に複数回送信しないよう、以下のルールを適用する:

- **時間ベースの重複チェック**: 同じ`type`と`related_*_id`の組み合わせで、24時間以内に送信済みの通知がある場合は送信しない
- **閾値ベースの重複チェック**: 段階的な通知（80%, 100%, 120%など）の場合、各閾値ごとに1回のみ送信
- **日付ベースの重複チェック**: 「30日前」「14日前」などの通知は、同じ日付に1回のみ送信

#### 実装例
```typescript
// 重複通知チェック
const { data: existingNotification } = await supabase
  .from('notifications')
  .select('id')
  .eq('type', notificationType)
  .eq('related_tool_id', toolId) // または related_invoice_id など
  .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  .single()

if (existingNotification) {
  console.log('Duplicate notification prevented')
  continue
}
```

### 2. 通知の優先度（severity）

| severity | 用途 | 表示色 | 例 |
|----------|------|--------|-----|
| `success` | 成功通知 | 緑 | 承認完了、処理成功 |
| `info` | 情報通知 | 青 | 権限変更、新機能追加 |
| `warning` | 警告 | 黄 | 期限7日前、在庫不足 |
| `error` | 緊急 | 赤 | 期限当日、大幅超過 |

### 3. 通知の送信方法

#### in_app（アプリ内通知）
- 全ての通知で使用
- 通知一覧ページ、ベルアイコンで表示
- 既読/未読管理

#### email（メール通知）
- 重要度の高い通知のみ
- 組織設定（`organization_settings.enable_email_notifications`）で有効化
- 例: 低在庫アラート、入金遅延、予算超過

#### SMS（将来実装）
- 超緊急の通知のみ
- 例: システム障害、セキュリティアラート

### 4. 通知の対象者制御

#### target_user_id
- 特定のユーザー宛の通知
- 例: 作業報告書承認結果、権限変更通知

#### target_user_id = NULL
- 組織全体への通知
- 権限（role）に応じて表示制御
- 例: 低在庫アラート（Manager/Adminのみ）、システムメンテナンス（全員）

#### 実装例
```typescript
// 通知一覧取得時の権限制御
const { data: notifications } = await supabase
  .from('notifications')
  .select('*')
  .eq('organization_id', organizationId)
  .is('deleted_at', null)
  .or(`target_user_id.eq.${userId},target_user_id.is.null`)
  .order('created_at', { ascending: false })

// フロントエンドでさらにフィルタリング（権限ベース）
const filteredNotifications = notifications.filter(n => {
  // target_user_idが設定されている場合は必ず表示
  if (n.target_user_id) return true

  // 組織全体通知の場合、typeに応じて権限チェック
  const managerOnlyTypes = ['low_stock', 'insurance_expiration', 'invoice_due_date', 'invoice_overdue']
  if (managerOnlyTypes.includes(n.type)) {
    return userRole === 'manager' || userRole === 'admin'
  }

  return true
})
```

### 5. 通知の既読管理

#### 既読処理
- ユーザーが通知をクリックした時に`is_read = true`に更新
- `read_at`に既読日時、`read_by`に既読者IDを記録

#### 一括既読
- 「全て既読にする」機能を提供
- 組織内の自分宛の未読通知を一括で既読にする

```typescript
// 個別既読
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      read_by: user.id,
    })
    .eq('id', notificationId)

  return !error
}

// 一括既読
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) return false

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
      read_by: user.id,
    })
    .eq('organization_id', userData.organization_id)
    .or(`target_user_id.eq.${user.id},target_user_id.is.null`)
    .eq('is_read', false)

  return !error
}
```

### 6. Cronジョブの設計

#### 実行頻度
- 毎日朝9:00に実行（日本時間 = UTC 0:00）
- Vercel Cronを使用

#### vercel.json設定
```json
{
  "crons": [
    {
      "path": "/api/cron/check-low-stock",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/check-equipment-expiration",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/check-insurance-expiration",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/check-invoice-due-date",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/check-overdue-invoices",
      "schedule": "0 0 * * *"
    }
  ]
}
```

#### 認証
環境変数`CRON_SECRET`を使用してcronジョブを保護

```typescript
const authHeader = request.headers.get('authorization')
const cronSecret = process.env.CRON_SECRET

if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
}
```

#### エラーハンドリング
- 各組織・各アイテムごとにtry-catchで囲む
- エラーが発生しても他の処理を継続
- エラーログをコンソールに出力

```typescript
for (const org of organizations) {
  try {
    // 通知処理
  } catch (error) {
    console.error(`Notification error for org ${org.id}:`, error)
    // 次の組織の処理を継続
  }
}
```

### 7. 通知の削除（ソフトデリート）

- 通知は物理削除せず、`deleted_at`カラムでソフトデリート
- ユーザーが「削除」ボタンをクリックした時に`deleted_at`を設定
- 削除された通知は通知一覧に表示されない

```typescript
export async function deleteNotification(notificationId: string): Promise<boolean> {
  const supabase = await createClient()

  const { error } = await supabase
    .from('notifications')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', notificationId)

  return !error
}
```

### 8. 通知設定（将来実装）

現在は組織単位での通知設定（`organization_settings`）のみですが、将来的にはユーザー個別の通知設定を実装する予定:

- 通知タイプごとのON/OFF
- 送信方法の選択（in_app / email / SMS）
- 通知頻度の調整（即時 / 1日1回まとめて）

#### 実装案（将来）
```sql
CREATE TABLE user_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  notification_type TEXT NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  send_via TEXT[] DEFAULT ARRAY['in_app'],
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, notification_type)
);
```

---

## まとめ

### 実装済み通知（10種類）
- 作業報告書関連（3種類）
- 発注書関連（2種類）
- 請求書関連（3種類）
- 在庫・道具関連（2種類）

### 未実装通知（36種類）
- Asset Pack: 11種類
- DX Pack: 14種類
- 共通機能: 11種類

### 最優先実装（7種類）
1. ✅ 権限変更通知（難易度: 低）
2. ⚠️ 重機点検期限アラート（難易度: 低、既存拡張）
3. ✅ 重機保険期限アラート（難易度: 中）
4. ✅ 請求書支払期日アラート（難易度: 中）
5. ✅ 入金遅延アラート（難易度: 中）
6. ❓ 工事予算超過アラート（難易度: 不明、要調査）
7. ❌ 道具返却遅延アラート（難易度: 高、DB変更必要）

### 推奨実装順序
1. 権限変更通知（1時間）
2. 重機点検期限アラート（2時間）
3. 重機保険期限アラート（3時間）
4. 請求書支払期日アラート（3時間）
5. 入金遅延アラート（3時間）
6. 工事予算超過アラート（要調査）
7. 道具返却遅延アラート（保留、チェックアウト機能改善後）

---

## 次のステップ

1. **フェーズ1の実装**（権限変更通知、重機点検・保険期限アラート）を開始
2. **DB構造の確認**（projectsテーブル、経費管理）を実施
3. **通知設定UIの検討**（将来的なユーザー個別設定）
4. **通知の効果測定**（ユーザーの反応、業務改善効果の検証）
