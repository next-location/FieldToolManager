# 請求書管理機能 完全仕様書

## 📋 目次
1. [概要](#概要)
2. [権限とアクセス制御](#権限とアクセス制御)
3. [請求書のステータスフロー](#請求書のステータスフロー)
4. [データベース設計](#データベース設計)
5. [API設計](#api設計)
6. [UI/UX仕様](#uiux仕様)
7. [実装タスク](#実装タスク)

---

## 概要

請求書管理機能は、見積書の承認フローと同様の承認プロセスを持ち、作成から入金完了までのライフサイクル全体を管理します。

### 主要機能
- 請求書の作成・編集（リーダー以上）
- 承認ワークフロー（マネージャー以上が承認）
- 顧客への送付管理
- 入金記録・管理
- 操作履歴の完全な記録
- PDF出力

---

## 権限とアクセス制御

### アクセス権限

| 機能 | スタッフ | リーダー | マネージャー | 管理者 |
|------|---------|---------|-------------|--------|
| 請求書一覧閲覧 | ❌ | ✅ | ✅ | ✅ |
| 請求書詳細閲覧 | ❌ | ✅ | ✅ | ✅ |
| 請求書作成 | ❌ | ✅ | ✅ | ✅ |
| 請求書編集（下書き） | ❌ | ✅（自分の）| ✅ | ✅ |
| 請求書提出 | ❌ | ✅ | ✅ | ✅ |
| 請求書承認 | ❌ | ❌ | ✅ | ✅ |
| 顧客送付 | ❌ | ❌ | ✅ | ✅ |
| 入金記録 | ❌ | ✅ | ✅ | ✅ |
| PDF出力 | ❌ | ✅ | ✅ | ✅ |

---

## 請求書のステータスフロー

### ステータス定義

| ステータス | 値 | 説明 | 次のアクション |
|-----------|-----|------|---------------|
| 下書き | \`draft\` | 作成中、編集可能 | 確定・提出 or 削除 |
| 提出済み | \`submitted\` | リーダーが提出、承認待ち | 承認 or 差し戻し |
| 承認済み | \`approved\` | マネージャーが承認済み | 顧客送付 |
| 送付済み | \`sent\` | 顧客に送付済み | 入金記録 |
| 入金済み | \`paid\` | 入金完了（最終状態） | - |

### フローチャート

```
┌─────────┐
│  作成   │
└────┬────┘
     │
     ▼
┌─────────┐     下書き保存      ┌─────────┐
│  draft  │◄──────────────────►│  編集   │
└────┬────┘                     └─────────┘
     │
     │ 確定・提出
     ▼
┌──────────┐
│submitted │ ◄────┐
└────┬─────┘      │
     │            │ 差し戻し
     │ 承認       │
     ▼            │
┌──────────┐      │
│approved  │──────┘
└────┬─────┘
     │
     │ 顧客送付
     ▼
┌──────────┐
│  sent    │
└────┬─────┘
     │
     │ 入金記録
     ▼
┌──────────┐
│  paid    │ （最終状態）
└──────────┘
```

### ロール別のフロー

#### リーダーの場合
1. 請求書作成
2. **下書き保存**: \`draft\` 状態で保存（何度でも編集可能）
3. **確定・提出**: \`submitted\` 状態に変更（マネージャーに承認依頼）
4. マネージャーの承認待ち
5. 承認後、入金記録が可能

#### マネージャー以上の場合
1. 請求書作成
2. **下書き保存**: \`draft\` 状態で保存（何度でも編集可能）
3. **確定・承認**: \`approved\` 状態に変更（即座に承認）
4. 顧客送付
5. 入金記録

---

## データベース設計

### 1. invoice_history テーブル（新規作成）

請求書の操作履歴を記録するテーブル。

\`\`\`sql
CREATE TABLE invoice_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES billing_invoices(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  action_type TEXT NOT NULL, -- 'created', 'draft_saved', 'submitted', 'approved', 'returned', 'sent', 'pdf_generated', 'payment_recorded', 'payment_completed'
  performed_by UUID NOT NULL REFERENCES users(id),
  performed_by_name TEXT NOT NULL, -- スナップショット
  notes TEXT, -- 備考・メモ
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_invoice_history_invoice_id ON invoice_history(invoice_id);
CREATE INDEX idx_invoice_history_organization_id ON invoice_history(organization_id);
CREATE INDEX idx_invoice_history_created_at ON invoice_history(created_at DESC);

-- RLS ポリシー
ALTER TABLE invoice_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view invoice history in their organization"
  ON invoice_history
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert invoice history in their organization"
  ON invoice_history
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
\`\`\`

### 2. billing_invoices テーブル（既存）

以下のカラムが必要：

\`\`\`sql
-- 既存カラム確認
- id UUID PRIMARY KEY
- organization_id UUID NOT NULL
- invoice_number TEXT NOT NULL
- client_id UUID REFERENCES clients(id)
- project_id UUID REFERENCES projects(id)
- estimate_id UUID REFERENCES estimates(id)
- invoice_date DATE NOT NULL
- due_date DATE NOT NULL
- title TEXT NOT NULL
- status TEXT NOT NULL DEFAULT 'draft'
- subtotal NUMERIC(12,2) NOT NULL
- tax_amount NUMERIC(12,2) NOT NULL
- total_amount NUMERIC(12,2) NOT NULL
- paid_amount NUMERIC(12,2) DEFAULT 0
- is_qualified_invoice BOOLEAN DEFAULT false
- invoice_registration_number TEXT
- notes TEXT
- internal_notes TEXT
- created_by UUID REFERENCES users(id)
- created_at TIMESTAMPTZ DEFAULT NOW()
- updated_at TIMESTAMPTZ DEFAULT NOW()

-- 承認関連カラム（追加が必要な場合）
- manager_approved_at TIMESTAMPTZ
- manager_approved_by UUID REFERENCES users(id)
- sent_at TIMESTAMPTZ
- sent_by UUID REFERENCES users(id)
\`\`\`

### 3. TypeScript型定義

\`\`\`typescript
// lib/invoice-history.ts
export type InvoiceActionType =
  | 'created'
  | 'draft_saved'
  | 'submitted'
  | 'approved'
  | 'returned'
  | 'sent'
  | 'pdf_generated'
  | 'payment_recorded'
  | 'payment_completed'

interface InvoiceHistory {
  id: string
  invoice_id: string
  organization_id: string
  action_type: InvoiceActionType
  performed_by: string
  performed_by_name: string
  notes?: string
  created_at: string
}
\`\`\`

---

## API設計

### 1. 請求書承認API

**エンドポイント**: \`POST /api/invoices/[id]/approve\`

**権限**: マネージャー、管理者のみ

**リクエストボディ**:
\`\`\`json
{
  "notes": "承認コメント（任意）"
}
\`\`\`

**処理内容**:
1. 請求書のステータスを \`submitted\` → \`approved\` に更新
2. \`manager_approved_at\`, \`manager_approved_by\` を設定
3. 履歴レコードを作成（action_type: 'approved'）
4. 通知を送信（作成者へ）

**レスポンス**:
\`\`\`json
{
  "success": true,
  "invoice": { ... }
}
\`\`\`

---

### 2. 請求書送付API

**エンドポイント**: \`POST /api/invoices/[id]/send\`

**権限**: マネージャー、管理者のみ

**リクエストボディ**:
\`\`\`json
{
  "email": "customer@example.com",
  "message": "送付メッセージ（任意）"
}
\`\`\`

**処理内容**:
1. 請求書のステータスを \`approved\` → \`sent\` に更新
2. \`sent_at\`, \`sent_by\` を設定
3. 履歴レコードを作成（action_type: 'sent'）
4. 顧客へメール送信（PDF添付）

**レスポンス**:
\`\`\`json
{
  "success": true,
  "invoice": { ... }
}
\`\`\`

---

### 3. 請求書差し戻しAPI

**エンドポイント**: \`POST /api/invoices/[id]/return\`

**権限**: マネージャー、管理者のみ

**リクエストボディ**:
\`\`\`json
{
  "reason": "差し戻し理由"
}
\`\`\`

**処理内容**:
1. 請求書のステータスを \`submitted\` → \`draft\` に更新
2. 履歴レコードを作成（action_type: 'returned'）
3. 通知を送信（作成者へ）

**レスポンス**:
\`\`\`json
{
  "success": true,
  "invoice": { ... }
}
\`\`\`

---

## UI/UX仕様

### 1. 請求書一覧画面

**パス**: \`/invoices\`

**表示内容**:
- カード形式の一覧（見積もり一覧と同様）
- フィルター: ステータス、入金状況、キーワード
- ソート: 請求日、支払期日、金額

**カード内容**:
- ステータスバッジ（左上）
- 請求番号（左上）
- 請求日・支払期日（右上）
- 取引先名・工事名
- 作成者・承認者（マネージャー以上のみ表示）
- 入金状況（入金済/一部入金/未入金）
- 金額（大きく表示）

**アクションボタン**:
- 編集（下書きのみ）
- PDF出力
- 送付（承認済みのみ）
- 入金登録（未入金のみ）

---

### 2. 請求書詳細画面

**パス**: \`/invoices/[id]\`

**表示内容**:

#### ステータスバー（上部）
- 現在のステータス（大きく表示）
- 入金状況
- アクションボタン（権限と状態に応じて表示）

**アクションボタンの表示ロジック**:

| 状態 | ロール | 表示ボタン |
|------|--------|-----------|
| draft | 作成者 | 編集、削除 |
| submitted | マネージャー以上 | 承認、差し戻し |
| approved | マネージャー以上 | 送付 |
| sent | リーダー以上 | 入金登録 |
| paid | - | （なし） |

#### 請求書本体
- 印刷可能なフォーマット
- 取引先情報
- 明細一覧
- 合計金額
- 振込先情報
- 備考

#### 操作履歴（下部）
タイムライン形式で表示：

\`\`\`
┌────────────────────────────────────────┐
│ 📝 作成                                │
│ 山田太郎 - 2025/12/16 10:00           │
│ 請求書を新規作成しました              │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ 💾 下書き保存                          │
│ 山田太郎 - 2025/12/16 10:15           │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ 📤 確定・提出                          │
│ 山田太郎 - 2025/12/16 14:00           │
│ マネージャーに承認申請しました        │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ ✅ 承認                                │
│ 鈴木次郎 - 2025/12/16 15:30           │
│ 承認しました                          │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ 📧 顧客送付                            │
│ 鈴木次郎 - 2025/12/16 16:00           │
│ 顧客へメール送信しました              │
└────────────────────────────────────────┘
┌────────────────────────────────────────┐
│ 💰 入金記録                            │
│ 山田太郎 - 2025/12/20 10:00           │
│ 入金額: ¥1,000,000                    │
└────────────────────────────────────────┘
\`\`\`

---

### 3. 請求書作成・編集画面

**パス**:
- 新規作成: \`/invoices/new\`
- 編集: \`/invoices/[id]/edit\`

**権限**: リーダー以上のみアクセス可能

**フォーム内容**:
1. 基本情報
   - 請求番号（自動生成）
   - 取引先（必須）
   - 工事（任意）
   - 請求日（必須）
   - 支払期日（必須）
   - 件名（必須）

2. 明細（カード形式）
   - 種別、項目名、説明
   - 数量、単位、単価、税率
   - 金額（自動計算）

3. 備考
   - 備考（請求書に記載）
   - 社内メモ（非表示）

**ボタン**:
- キャンセル
- 下書き保存（グレー）
- 確定・提出 / 確定・承認（青）
  - リーダー: 「確定・提出」→ \`submitted\`
  - マネージャー以上: 「確定・承認」→ \`approved\`

---

## 実装タスク

### Phase 1: データベースとマイグレーション ✅
- [x] \`invoice_history\` テーブルのマイグレーション作成
- [x] \`billing_invoices\` テーブルに不足カラムの追加
  - \`manager_approved_at\`
  - \`manager_approved_by\`
  - \`sent_at\`
  - \`sent_by\`
- [x] マイグレーション実行と確認

### Phase 2: 履歴管理機能 ✅
- [x] \`lib/invoice-history.ts\` 作成（完了）
- [x] 請求書作成時に履歴記録
- [ ] 請求書編集時に履歴記録
- [x] 請求書提出時に履歴記録

### Phase 3: API実装 ✅
- [x] 承認API（\`/api/invoices/[id]/approve\`）
- [x] 送付API（\`/api/invoices/[id]/send\`）
- [x] 差し戻しAPI（\`/api/invoices/[id]/return\`）
- [x] 各APIで履歴記録を実装

### Phase 4: UI実装 ✅
- [x] 請求書詳細ページの改修
  - [x] 承認ボタンコンポーネント（\`ApproveInvoiceButton.tsx\`）
  - [x] 送付ボタンコンポーネント（\`SendInvoiceButton.tsx\`）
  - [x] 差し戻しボタンコンポーネント（\`ReturnInvoiceButton.tsx\`）
  - [x] 履歴タイムライン表示（\`InvoiceHistoryTimeline.tsx\`）
  - [x] 詳細ページへの統合（\`app/(authenticated)/invoices/[id]/page.tsx\`）
- [ ] 請求書一覧の通知バッジ実装

### Phase 5: 通知機能 ✅
- [x] 承認時の通知（作成者へ）
  - APIで通知レコードを作成（`/api/invoices/[id]/approve`）
- [x] 差し戻し時の通知（作成者へ）
  - APIで通知レコードを作成（`/api/invoices/[id]/return`）
- [x] 送付時の通知（顧客へメール）
  - `lib/email/project-invoice.ts` にメール送信関数を実装
  - `/api/invoices/[id]/send` でメール送信を実装
  - Resend（本番）とSMTP（開発）の両方に対応

### Phase 6: テストと検証 🧪
- [ ] リーダーのフローテスト
  - [ ] 請求書新規作成（下書き保存）
  - [ ] 請求書提出（submitted状態へ遷移）
  - [ ] 承認待ち状態の確認
  - [ ] 提出済み請求書の編集不可確認
- [ ] マネージャーのフローテスト
  - [ ] 提出済み請求書の承認
  - [ ] 提出済み請求書の差し戻し
  - [ ] 承認済み請求書の顧客送付
  - [ ] メール送信確認（Mailhog: http://localhost:8025）
- [ ] 履歴記録の確認
  - [ ] 作成・下書き保存の履歴記録
  - [ ] 提出・承認・差し戻しの履歴記録
  - [ ] 送付の履歴記録
  - [ ] 履歴タイムラインの表示確認
- [ ] 通知機能の確認
  - [ ] 承認時の通知（作成者へ）
  - [ ] 差し戻し時の通知（作成者へ）
  - [ ] メール送信（顧客へ）
- [ ] 権限チェックの確認
  - [ ] リーダーは承認・差し戻し・送付ボタンが非表示
  - [ ] マネージャーは全てのボタンが表示
  - [ ] APIレベルでの権限チェック確認

**テスト環境**:
- 開発サーバー: http://localhost:3000
- Mailhog（メール確認）: http://localhost:8025
- テストユーザー:
  - リーダー: `rida@test.jp`
  - マネージャー: `manager@test.jp`（存在する場合）

---

## 送付後のフロー

### 顧客送付後の処理

1. **送付時**:
   - ステータス: \`approved\` → \`sent\`
   - \`sent_at\`, \`sent_by\` を記録
   - 履歴記録（action_type: 'sent'）
   - 顧客へメール送信（PDF添付）

2. **入金記録**:
   - リーダー以上が入金額を記録
   - \`paid_amount\` を更新
   - 履歴記録（action_type: 'payment_recorded'）
   - 一部入金・全額入金を判定

3. **入金完了**:
   - \`paid_amount >= total_amount\` の場合
   - ステータス: \`sent\` → \`paid\`
   - 履歴記録（action_type: 'payment_completed'）
   - 最終状態（これ以上の変更なし）

### 入金状況の表示

- **未入金**: \`paid_amount = 0\`
- **一部入金**: \`0 < paid_amount < total_amount\`
- **入金済**: \`paid_amount >= total_amount\`

---

## セキュリティとバリデーション

### 承認時のチェック
- ステータスが \`submitted\` であることを確認
- 実行者がマネージャー以上であることを確認
- 自分が作成した請求書でないことを確認（推奨）

### 送付時のチェック
- ステータスが \`approved\` であることを確認
- 実行者がマネージャー以上であることを確認
- 取引先のメールアドレスが設定されていることを確認

### 差し戻し時のチェック
- ステータスが \`submitted\` であることを確認
- 実行者がマネージャー以上であることを確認
- 差し戻し理由が入力されていることを確認

---

## まとめ

この仕様書に基づいて、請求書管理機能を見積もり管理と同様の品質で実装します。特に以下の点を重視します：

1. ✅ **明確な権限制御**: リーダー以上のみアクセス
2. ✅ **完全な履歴管理**: すべての操作を記録
3. ✅ **承認フロー**: マネージャーによる承認プロセス
4. ✅ **入金管理**: 一部入金・全額入金の管理
5. ✅ **通知機能**: 適切なタイミングで通知

実装は上記のPhaseに従って段階的に進めます。
