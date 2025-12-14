# 見積書ワークフロー仕様

## 見積書のステータスと遷移フロー

### ステータス一覧

見積書には以下の5つのステータスがあります：

1. **`draft`** - 下書き
2. **`sent`** - 送付済
3. **`accepted`** - 承認済（顧客）
4. **`rejected`** - 却下（顧客）
5. **`expired`** - 期限切れ

### 正しいフロー

```
1. 見積書作成・編集
   ↓
   [draft] 下書き（作成途中で保存、上司の確認待ち）
   ↓
2. 上司（マネージャー・管理者）による承認
   ↓
   ✓ 承認OK
   ↓
3. 顧客への送付（メール送信 or 郵送 or PDF渡し）
   ↓
   [sent] 送付済
   ↓
4. 顧客による判断
   ↓
   ├─→ 顧客が承認 → [accepted] 承認済 → 発注書・請求書処理へ
   ├─→ 顧客が却下 → [rejected] 却下
   └─→ 期限切れ   → [expired] 期限切れ
```

## 権限設定

### 見積書の作成・編集
- **全ユーザー** (`staff`, `leader`, `manager`, `admin`, `super_admin`)
  - 見積書の作成が可能
  - 下書き保存が可能
  - 自分が作成した見積書の編集が可能

### 上司承認
- **マネージャー以上** (`manager`, `admin`, `super_admin`)
  - 見積書の承認（`draft` → 承認済みマーク）が可能
  - 承認後、送付可能な状態になる

### PDF出力
- **条件**: 上司の承認が下りた見積書のみ
  - 承認済みフラグが立っている見積書のみPDF化可能
  - 下書き状態や未承認の見積書はPDF出力不可

### 顧客への送付
- **リーダー以上** (`leader`, `manager`, `admin`, `super_admin`)
  - 承認済みの見積書を顧客に送付（ステータスを`sent`に変更）

### 顧客判断の記録
- **リーダー以上** (`leader`, `manager`, `admin`, `super_admin`)
  - 顧客の承認: `sent` → `accepted`
  - 顧客の却下: `sent` → `rejected`

## データベーススキーマ追加要件

### estimates テーブルに追加するカラム

```sql
-- 上司承認関連
approved_by_manager    UUID           -- 承認した上司のID
manager_approved_at    TIMESTAMP      -- 上司承認日時
manager_approval_status TEXT          -- 'pending', 'approved', 'rejected'
manager_approval_notes  TEXT          -- 承認時のコメント

-- 既存のカラム（確認）
approved_by            UUID           -- 顧客承認を記録したユーザーID
created_by             UUID           -- 作成者ID
```

## 実装が必要な機能

### 1. 上司承認機能
- 見積書詳細ページに「承認」ボタンを追加（マネージャー以上のみ表示）
- 承認モーダル（コメント入力可能）
- 承認履歴の表示

### 2. PDF出力制御
- 承認済みの見積書のみPDFボタンを表示
- 未承認の見積書でPDF URLに直接アクセスしてもエラーを返す

### 3. ステータス遷移制御
- 下書き → 送付済への変更は承認済みの場合のみ可能
- 編集画面のボタンを以下に変更：
  - 「下書き保存」ボタン: `draft` のまま保存
  - 「確定」ボタン（承認済みの場合のみ表示）: その他の項目を更新

### 4. 通知機能（将来実装）
- 見積書作成 → 上司に通知
- 上司承認 → 作成者に通知
- 顧客判断 → 関係者に通知

## ステータスバッジの表示

見積書一覧・詳細画面でのステータス表示：

| ステータス | 表示 | 色 |
|-----------|------|-----|
| `draft` | 下書き | グレー |
| `sent` | 送付済 | ブルー |
| `accepted` | 承認済 | グリーン |
| `rejected` | 却下 | レッド |
| `expired` | 期限切れ | イエロー |

## 承認ステータスの表示

上司承認状態の表示：

| manager_approval_status | 表示 | 色 |
|------------------------|------|-----|
| `pending` | 承認待ち | オレンジ |
| `approved` | 承認済 | グリーン |
| `rejected` | 差戻し | レッド |

## 画面遷移例

### 見積書詳細画面（作成者視点）

```
[下書き状態]
- 編集ボタン
- 削除ボタン
- ステータス: 下書き
- 承認状態: 承認待ち

[上司承認後]
- 編集ボタン（軽微な修正のみ）
- PDFダウンロードボタン ← 新規表示
- 送付ボタン ← 新規表示
- ステータス: 下書き → 送付ボタンで「送付済」に
- 承認状態: 承認済（承認者名・日時表示）
```

### 見積書詳細画面（マネージャー視点）

```
[下書き状態（承認待ち）]
- 承認ボタン ← マネージャーのみ表示
- 差戻しボタン ← マネージャーのみ表示
- 編集ボタン
- 削除ボタン

[承認後]
- 承認情報表示（自分が承認したことを表示）
- PDFダウンロードボタン
- 送付ボタン
```

## 現状分析

### データベース
- `approved_by`カラムは存在（顧客承認用）
- 上司承認用のカラムは**未実装**

### 承認機能
- **未実装**（承認ボタンやAPIが存在しない）

### PDF出力
- 現在は**誰でも、どのステータスでもPDF出力可能**
- 承認チェックなし

### 権限制御
- 見積書の作成・編集: リーダー以上のみ（**要修正**: 全ユーザーに開放すべき）

---

## 実装プラン

### Phase 1: データベーススキーマ追加【最優先】

#### マイグレーション作成

**ファイル**: `supabase/migrations/YYYYMMDDHHMMSS_add_manager_approval_to_estimates.sql`

```sql
-- 上司承認機能のためのカラム追加
ALTER TABLE estimates
ADD COLUMN manager_approved_by UUID REFERENCES users(id),
ADD COLUMN manager_approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN manager_approval_notes TEXT;

-- インデックス追加
CREATE INDEX idx_estimates_manager_approval ON estimates(manager_approved_by);

-- コメント追加
COMMENT ON COLUMN estimates.manager_approved_by IS '上司承認を行ったユーザーID（manager/admin）';
COMMENT ON COLUMN estimates.manager_approved_at IS '上司承認日時';
COMMENT ON COLUMN estimates.manager_approval_notes IS '上司承認時のコメント';
```

**実行コマンド**:
```bash
PGPASSWORD=postgres psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/YYYYMMDDHHMMSS_add_manager_approval_to_estimates.sql
```

---

### Phase 2: API実装

#### 2-1. 承認API (`/app/api/estimates/[id]/approve/route.ts`)

**新規作成**

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/estimates/[id]/approve
// 権限: manager, admin, super_admin のみ
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  // マネージャー以上のみ承認可能
  if (!['manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    return NextResponse.json({ error: '承認する権限がありません' }, { status: 403 })
  }

  const body = await request.json()
  const notes = body.notes || null

  try {
    // 見積書を承認
    const { error } = await supabase
      .from('estimates')
      .update({
        manager_approved_by: user.id,
        manager_approved_at: new Date().toISOString(),
        manager_approval_notes: notes,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)

    if (error) throw error

    return NextResponse.json({ message: '見積書を承認しました' }, { status: 200 })
  } catch (error) {
    console.error('[見積書承認API] エラー:', error)
    return NextResponse.json({ error: '承認に失敗しました' }, { status: 500 })
  }
}
```

#### 2-2. PDF出力API修正 (`/app/api/estimates/[id]/pdf/route.ts`)

**追加箇所**（見積書取得後、PDF生成前）:

```typescript
// 承認チェック
if (!estimate.manager_approved_by) {
  return NextResponse.json(
    { error: 'この見積書は未承認のためPDF出力できません' },
    { status: 403 }
  )
}
```

---

### Phase 3: UI実装

#### 3-1. 承認ボタンコンポーネント作成

**ファイル**: `/components/estimates/ApproveEstimateButton.tsx`

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface ApproveEstimateButtonProps {
  estimateId: string
  estimateNumber: string
}

export function ApproveEstimateButton({ estimateId, estimateNumber }: ApproveEstimateButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [notes, setNotes] = useState('')

  const handleApprove = async () => {
    if (!confirm(`見積書「${estimateNumber}」を承認しますか？`)) return

    setLoading(true)
    try {
      const response = await fetch(`/api/estimates/${estimateId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || '承認に失敗しました')
      }

      alert('見積書を承認しました')
      router.refresh()
      setShowModal(false)
    } catch (error) {
      alert(error instanceof Error ? error.message : '承認に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
      >
        承認
      </button>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">見積書の承認</h3>
            <p className="text-sm text-gray-600 mb-4">
              見積書「{estimateNumber}」を承認します。
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                承認コメント（任意）
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                placeholder="承認コメントを入力..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={loading}
              >
                キャンセル
              </button>
              <button
                onClick={handleApprove}
                className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600"
                disabled={loading}
              >
                {loading ? '承認中...' : '承認する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

#### 3-2. 見積書詳細ページ修正

**ファイル**: `/app/(authenticated)/estimates/[id]/page.tsx`

**追加要素**:
- 承認状態の表示
- 承認ボタンの追加（条件付き表示）
- PDFボタンの表示制御（承認済みのみ）

```typescript
// 見積書データ取得時に承認情報も取得
const { data: estimate } = await supabase
  .from('estimates')
  .select(`
    *,
    client:clients(name, postal_code, address, contact_person),
    project:projects(project_name, project_code),
    estimate_items(*),
    created_by:users!estimates_created_by_fkey(name),
    approved_by:users!estimates_approved_by_fkey(name),
    manager_approved_by_user:users!estimates_manager_approved_by_fkey(name)
  `)
  .eq('id', id)
  .eq('organization_id', userData?.organization_id)
  .single()

// 承認済みかどうか
const isApproved = !!estimate.manager_approved_by

// マネージャー以上かどうか
const isManager = ['manager', 'admin', 'super_admin'].includes(userData?.role || '')

// 表示部分
<div className="mb-4">
  {/* 承認状態表示 */}
  {isApproved ? (
    <div className="bg-green-50 border border-green-200 rounded-md p-3">
      <p className="text-sm font-medium text-green-800">✓ 承認済</p>
      <p className="text-xs text-green-600 mt-1">
        承認者: {estimate.manager_approved_by_user?.name || '不明'}
        （{new Date(estimate.manager_approved_at).toLocaleString('ja-JP')}）
      </p>
      {estimate.manager_approval_notes && (
        <p className="text-xs text-gray-600 mt-1">
          コメント: {estimate.manager_approval_notes}
        </p>
      )}
    </div>
  ) : (
    <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
      <p className="text-sm font-medium text-orange-800">承認待ち</p>
      <p className="text-xs text-orange-600 mt-1">
        マネージャーによる承認が必要です
      </p>
    </div>
  )}
</div>

{/* ボタン群 */}
<div className="flex gap-2">
  {/* 承認ボタン（未承認 & マネージャー以上のみ） */}
  {!isApproved && isManager && (
    <ApproveEstimateButton
      estimateId={estimate.id}
      estimateNumber={estimate.estimate_number}
    />
  )}

  {/* PDFボタン（承認済みのみ） */}
  {isApproved && (
    <DownloadPdfButton estimateId={estimate.id} />
  )}

  {/* 編集ボタン */}
  <Link href={`/estimates/${estimate.id}/edit`}>
    <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">
      編集
    </button>
  </Link>
</div>
```

#### 3-3. 見積書一覧ページ修正

**承認状態の列を追加**:

```typescript
<th>承認状態</th>

// データ行
<td>
  {estimate.manager_approved_by ? (
    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
      承認済
    </span>
  ) : (
    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
      承認待ち
    </span>
  )}
</td>
```

#### 3-4. 編集ページ修正

**ファイル**: `/components/estimates/EstimateEditForm.tsx`

**変更点**:
- ステータス選択欄を削除
- ボタンを「下書き保存」のみに変更

```typescript
// ステータス選択欄を削除（formDataからも削除）

// ボタン部分
<div className="flex justify-between">
  <button
    type="button"
    onClick={() => router.push(`/estimates/${estimateId}`)}
    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-400"
  >
    キャンセル
  </button>
  <button
    type="submit"
    className="bg-blue-500 text-white px-6 py-2 rounded-md hover:bg-blue-600"
    disabled={loading}
  >
    {loading ? '保存中...' : '保存'}
  </button>
</div>
```

---

### Phase 4: 権限修正

#### 見積書作成権限の開放

**ファイル**: `/app/(authenticated)/estimates/new/page.tsx`

**変更前**:
```typescript
// リーダー以上のみアクセス可能
if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
  redirect('/')
}
```

**変更後**:
```typescript
// 全ユーザーがアクセス可能（認証済みであればOK）
// アクセス制御を削除
```

---

## 実装順序（推奨）

```
1. マイグレーション実行（5分）
   ↓
2. 承認API実装（30分）
   - /app/api/estimates/[id]/approve/route.ts 作成
   ↓
3. PDF出力API修正（10分）
   - /app/api/estimates/[id]/pdf/route.ts 修正
   ↓
4. 承認ボタンコンポーネント作成（30分）
   - /components/estimates/ApproveEstimateButton.tsx 作成
   ↓
5. 見積書詳細ページ修正（30分）
   - 承認状態表示追加
   - 承認ボタン追加
   - PDFボタン表示制御
   ↓
6. 編集ページ修正（20分）
   - ステータス選択欄削除
   - ボタン整理
   ↓
7. 一覧ページ修正（20分）
   - 承認状態列追加
   ↓
8. 権限修正（10分）
   - 作成権限を全ユーザーに開放

合計: 約2.5時間
```

---

## 実装後の動作フロー

### 1. 一般ユーザーが見積書作成
- ステータス: `draft`（下書き）
- 承認状態: 未承認
- PDF出力: 不可

### 2. マネージャーが見積書を確認・承認
- 承認ボタンクリック → コメント入力 → 承認
- `manager_approved_by`, `manager_approved_at`がセット
- PDF出力: 可能に

### 3. 承認後にPDF出力可能
- PDFボタンが表示される
- PDF URLに直接アクセスしても承認チェックが働く

### 4. 送付
- リーダー以上が「送付」ボタンをクリック
- ステータス: `draft` → `sent`

### 5. 顧客判断
- 承認 → `accepted`
- 却下 → `rejected`
- 期限切れ → `expired`（自動または手動）

### 6. 次の処理へ
- `accepted`の場合: 発注書、請求書処理へ移行

---

## テスト項目

### 承認機能のテスト
- [ ] 一般ユーザーは承認ボタンが表示されない
- [ ] マネージャーは承認ボタンが表示される
- [ ] 承認後、承認情報が正しく表示される
- [ ] 承認コメントが保存される

### PDF出力制御のテスト
- [ ] 未承認の見積書はPDFボタンが表示されない
- [ ] 承認済みの見積書はPDFボタンが表示される
- [ ] 未承認の見積書のPDF URLに直接アクセスするとエラーになる
- [ ] 承認済みの見積書のPDF URLに直接アクセスするとPDFがダウンロードされる

### 権限テスト
- [ ] 全ユーザーが見積書を作成できる
- [ ] 一般ユーザーは承認できない
- [ ] マネージャー以上は承認できる

### 編集画面のテスト
- [ ] ステータス選択欄が表示されない
- [ ] 保存ボタンのみ表示される
- [ ] ステータスは変更されない（draftのまま）

---

## 将来の拡張案

### 差戻し機能
- マネージャーが見積書を差し戻す機能
- 差戻し理由の入力
- 差戻し履歴の表示

### 送付機能
- メール送信機能（PDFを添付）
- 送付履歴の記録
- 送付先の管理

### 承認フロー の柔軟化
- 複数段階の承認（課長 → 部長 → 社長）
- 承認者の自動割り当て
- 承認期限の設定

### 通知機能
- 見積書作成時にマネージャーに通知
- 承認時に作成者に通知
- 期限切れ前にアラート
