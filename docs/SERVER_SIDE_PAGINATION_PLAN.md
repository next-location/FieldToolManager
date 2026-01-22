# サーバー側ページネーション実装計画

## 📌 概要

全ページをクライアント側ページネーションからサーバー側ページネーションに変更する。
これにより、大規模データでも安定したパフォーマンスを実現する。

---

## 🎯 目的

- **スケーラビリティ**: 小規模企業から大規模企業まで対応
- **パフォーマンス**: データ量に関わらず一定の速度を維持
- **メモリ効率**: ブラウザのメモリ使用量を削減
- **SaaS対応**: 様々な企業規模に対応できる仕組み

---

## 📋 変更対象ファイル一覧（全24ファイル）

### フェーズ1: 見積書一覧（サンプル実装）

#### サーバー側
1. `/app/api/estimates/route.ts` - ページネーションAPI追加

#### クライアント側
2. `/components/estimates/EstimateListClient.tsx` - 大幅変更
3. `/app/(authenticated)/estimates/page.tsx` - 変更

---

### フェーズ2: 他の7ページ（同じパターン適用）

#### サーバー側API変更（7ファイル）
4. `/app/api/invoices/route.ts`
5. `/app/api/purchase-orders/route.ts`
6. `/app/api/payments/route.ts`
7. `/app/api/clients/route.ts` (新規作成の可能性)
8. `/app/api/projects/route.ts` (新規作成の可能性)
9. `/app/api/suppliers/route.ts`
10. `/app/api/staff/route.ts` (既存を確認)

#### クライアント側変更（7ファイル）
11. `/components/invoices/InvoiceListClient.tsx`
12. `/app/(authenticated)/purchase-orders/PurchaseOrderListClient.tsx`
13. `/components/payments/PaymentListClient.tsx`
14. `/app/(authenticated)/clients/ClientTabs.tsx`
15. `/components/projects/ProjectListClient.tsx`
16. `/app/(authenticated)/suppliers/SupplierListClient.tsx`
17. `/app/(authenticated)/staff/StaffListClient.tsx`

#### ページコンポーネント変更（7ファイル）
18. `/app/(authenticated)/invoices/page.tsx`
19. `/app/(authenticated)/purchase-orders/page.tsx`
20. `/app/(authenticated)/payments/page.tsx`
21. `/app/(authenticated)/clients/page.tsx`
22. `/app/(authenticated)/projects/page.tsx`
23. `/app/(authenticated)/suppliers/page.tsx`
24. `/app/(authenticated)/staff/page.tsx`

---

## 🔧 技術仕様

### 1. APIエンドポイント仕様（共通）

#### リクエスト例
```
GET /api/estimates?page=1&limit=20&search=田中&status=draft&sortField=estimate_date&sortOrder=desc
```

#### クエリパラメータ
```typescript
interface PaginationParams {
  page: number          // ページ番号（1始まり）
  limit: number         // 1ページあたりの件数（デフォルト20）
  search?: string       // 検索キーワード
  // 各ページ固有のフィルター
  status?: string
  creator?: string
  sortField?: string
  sortOrder?: 'asc' | 'desc'
}
```

#### レスポンス形式
```typescript
interface PaginationResponse<T> {
  data: T[]            // 該当ページのデータ
  total: number        // 全データ件数
  page: number         // 現在のページ
  limit: number        // 1ページの件数
  totalPages: number   // 全ページ数
}
```

#### レスポンス例
```json
{
  "data": [...],
  "total": 600,
  "page": 1,
  "limit": 20,
  "totalPages": 30
}
```

---

### 2. サーバー側実装パターン

#### `/app/api/estimates/route.ts` の実装例

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/auth/page-auth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  // パラメータ取得
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const search = searchParams.get('search') || ''
  const status = searchParams.get('status') || 'all'
  const creator = searchParams.get('creator') || ''
  const sortField = searchParams.get('sortField') || 'estimate_date'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  // ユーザー認証
  const { userId, organizationId, supabase } = await requireAuth()

  // 1. 件数取得用クエリ
  let countQuery = supabase
    .from('estimates')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // 2. データ取得用クエリ
  let dataQuery = supabase
    .from('estimates')
    .select(`
      *,
      client:clients(name),
      project:projects(project_name),
      created_by_user:users!estimates_created_by_fkey(id, name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)

  // 3. 検索フィルター（両方のクエリに適用）
  if (search) {
    const searchFilter = `estimate_number.ilike.%${search}%,client.name.ilike.%${search}%`
    countQuery = countQuery.or(searchFilter)
    dataQuery = dataQuery.or(searchFilter)
  }

  // 4. ステータスフィルター
  if (status !== 'all') {
    countQuery = countQuery.eq('status', status)
    dataQuery = dataQuery.eq('status', status)
  }

  // 5. 作成者フィルター
  if (creator) {
    countQuery = countQuery.eq('created_by', creator)
    dataQuery = dataQuery.eq('created_by', creator)
  }

  // 6. ソート
  dataQuery = dataQuery.order(sortField, { ascending: sortOrder === 'asc' })

  // 7. ページネーション
  const from = (page - 1) * limit
  const to = from + limit - 1
  dataQuery = dataQuery.range(from, to)

  // 8. クエリ実行（並列）
  const [{ count }, { data, error }] = await Promise.all([
    countQuery,
    dataQuery
  ])

  if (error) {
    console.error('[Estimates API] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: data || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit)
  })
}
```

---

### 3. クライアント側実装パターン

#### `/components/estimates/EstimateListClient.tsx` の変更内容

##### 変更前（現在のクライアント側ページネーション）

```typescript
interface EstimateListClientProps {
  estimates: Estimate[]  // ← propsで全データを受け取る
  userRole: string
  staffList: Staff[]
}

export function EstimateListClient({ estimates: initialEstimates, userRole, staffList }: EstimateListClientProps) {
  const [estimates, setEstimates] = useState(initialEstimates)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // クライアント側でフィルタリング
  const filteredAndSortedEstimates = useMemo(() => {
    return estimates.filter((estimate) => {
      // 検索・フィルター処理
      const matchesSearch = !searchQuery || estimate.estimate_number.includes(searchQuery)
      const matchesStatus = statusFilter === 'all' || estimate.status === statusFilter
      return matchesSearch && matchesStatus
    }).sort((a, b) => {
      // ソート処理
      return sortOrder === 'asc' ? a.estimate_date > b.estimate_date : a.estimate_date < b.estimate_date
    })
  }, [estimates, searchQuery, statusFilter, sortField, sortOrder])

  // クライアント側でページネーション
  const paginatedEstimates = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedEstimates.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedEstimates, currentPage])

  return (
    <>
      {paginatedEstimates.map((estimate) => (
        <div key={estimate.id}>...</div>
      ))}
    </>
  )
}
```

##### 変更後（サーバー側ページネーション）

```typescript
interface EstimateListClientProps {
  // propsからestimatesを削除
  userRole: string
  staffList: Staff[]
}

export function EstimateListClient({ userRole, staffList }: EstimateListClientProps) {
  // データはstateで管理
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // フィルター・ソート条件
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [creatorFilter, setCreatorFilter] = useState('')
  const [sortField, setSortField] = useState<'estimate_date' | 'valid_until' | 'total_amount'>('estimate_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // API呼び出し関数
  const fetchEstimates = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        search: searchQuery,
        status: statusFilter,
        creator: creatorFilter,
        sortField,
        sortOrder
      })

      const response = await fetch(`/api/estimates?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch estimates')
      }

      const result = await response.json()

      setEstimates(result.data)
      setTotal(result.total)
      setTotalPages(result.totalPages)
    } catch (error) {
      console.error('Failed to fetch estimates:', error)
      alert('見積書の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // 初回読み込み + ページ・フィルター変更時
  useEffect(() => {
    fetchEstimates()
  }, [currentPage, searchQuery, statusFilter, creatorFilter, sortField, sortOrder])

  // フィルター・ソート条件変更時は1ページ目に戻す
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [searchQuery, statusFilter, creatorFilter, sortField, sortOrder])

  // ローディング表示
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">読み込み中...</span>
      </div>
    )
  }

  return (
    <>
      {/* 検索・フィルター */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="検索..."
      />

      {/* 件数表示 */}
      <div className="text-sm text-gray-700">
        全 {total} 件中 {estimates.length} 件を表示（{currentPage}/{totalPages} ページ）
      </div>

      {/* データ表示 */}
      {estimates.map((estimate) => (
        <div key={estimate.id}>...</div>
      ))}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || loading}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="text-sm text-gray-700">
            {currentPage} / {totalPages} ページ
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || loading}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}
    </>
  )
}
```

---

### 4. ページコンポーネント変更

#### `/app/(authenticated)/estimates/page.tsx`

##### 変更前（Server Componentで全データ取得）

```typescript
export default async function EstimatesPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // 全データを取得してクライアントに渡す
  const { data: estimates } = await supabase
    .from('estimates')
    .select(`
      *,
      client:clients(name),
      project:projects(project_name)
    `)
    .eq('organization_id', organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  const { data: staff } = await supabase
    .from('users')
    .select('id, name')
    .eq('organization_id', organizationId)

  return <EstimateListClient estimates={estimates || []} staffList={staff || []} />
}
```

##### 変更後（軽量なデータのみ取得）

```typescript
export default async function EstimatesPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // スタッフリストだけ取得（軽量）
  const { data: staff } = await supabase
    .from('users')
    .select('id, name')
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  // 見積データはクライアント側でAPIから取得
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <EstimateListClient
        userRole={userRole || 'staff'}
        staffList={staff || []}
      />
    </div>
  )
}
```

---

## 📊 各ページ固有のフィルター仕様

### 1. 見積書一覧 (`/api/estimates`)
```typescript
interface EstimateFilters {
  search: string         // 見積番号、取引先名、工事名
  status: string         // draft, submitted, sent, accepted, rejected, expired
  creator: string        // 作成者ID
  sortField: string      // estimate_date, valid_until, total_amount
  sortOrder: string      // asc, desc
}
```

### 2. 請求書一覧 (`/api/invoices`)
```typescript
interface InvoiceFilters {
  search: string         // 請求番号、取引先名、工事名
  status: string         // draft, submitted, approved, sent, paid
  paymentFilter: string  // all, paid, partial, unpaid
  staffFilter: string    // 作成スタッフ名
  sortField: string      // invoice_date, due_date, total_amount
  sortOrder: string      // asc, desc
}
```

### 3. 発注書一覧 (`/api/purchase-orders`)
```typescript
interface PurchaseOrderFilters {
  search: string         // 発注番号、仕入先名、工事名
  status: string         // draft, submitted, approved, rejected, ordered, received, paid
  creator: string        // 作成者ID
}
```

### 4. 入金管理 (`/api/payments`)
```typescript
interface PaymentFilters {
  search: string              // 取引先名、請求番号
  year: number                // 年
  month: number               // 月
  startDate: string           // 開始日
  endDate: string             // 終了日
  paymentType: string         // all, receipt, payment
  paymentMethod: string       // all, cash, bank_transfer, credit_card, etc.
  useMonthFilter: boolean     // 月単位フィルターを使用するか
}
```

### 5. 取引先一覧 (`/api/clients`)
```typescript
interface ClientFilters {
  search: string         // 名前、カナ、コード、住所、電話番号
  clientType: string     // all, customer, supplier, partner, both
}
```

### 6. 案件一覧 (`/api/projects`)
```typescript
interface ProjectFilters {
  search: string         // 案件コード、案件名、取引先名
  status: string         // all, planning, in_progress, completed, suspended
  sortField: string      // start_date, end_date, contract_amount
  sortOrder: string      // asc, desc
}
```

### 7. 仕入先一覧 (`/api/suppliers`)
```typescript
interface SupplierFilters {
  search: string         // 名前、カナ、コード、住所、電話番号
}
```

### 8. スタッフ一覧 (`/api/staff`)
```typescript
interface StaffFilters {
  search: string         // 名前、メール、社員番号
  department: string     // 部署
  role: string           // staff, leader, manager, admin, super_admin
  status: string         // all, active, inactive
}
```

---

## ⚙️ データベース最適化

### インデックスの確認・追加

各テーブルで以下のカラムにインデックスが必要:

#### estimates テーブル
```sql
CREATE INDEX IF NOT EXISTS idx_estimates_organization_deleted
  ON estimates(organization_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_estimates_status
  ON estimates(status);

CREATE INDEX IF NOT EXISTS idx_estimates_created_by
  ON estimates(created_by);

CREATE INDEX IF NOT EXISTS idx_estimates_estimate_date
  ON estimates(estimate_date DESC);
```

#### invoices テーブル
```sql
CREATE INDEX IF NOT EXISTS idx_invoices_organization_deleted
  ON billing_invoices(organization_id, deleted_at);

CREATE INDEX IF NOT EXISTS idx_invoices_status
  ON billing_invoices(status);

CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date
  ON billing_invoices(invoice_date DESC);
```

#### purchase_orders テーブル
```sql
CREATE INDEX IF NOT EXISTS idx_purchase_orders_organization
  ON purchase_orders(organization_id);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_status
  ON purchase_orders(status);
```

#### payments テーブル
```sql
CREATE INDEX IF NOT EXISTS idx_payments_organization
  ON payments(organization_id);

CREATE INDEX IF NOT EXISTS idx_payments_date
  ON payments(payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_payments_type
  ON payments(payment_type);
```

#### clients テーブル
```sql
CREATE INDEX IF NOT EXISTS idx_clients_organization_active
  ON clients(organization_id, is_active, deleted_at);

CREATE INDEX IF NOT EXISTS idx_clients_type
  ON clients(client_type);
```

#### projects テーブル
```sql
CREATE INDEX IF NOT EXISTS idx_projects_organization
  ON projects(organization_id);

CREATE INDEX IF NOT EXISTS idx_projects_status
  ON projects(status);

CREATE INDEX IF NOT EXISTS idx_projects_start_date
  ON projects(start_date DESC);
```

---

## 📈 パフォーマンス比較

### 変更前（クライアント側ページネーション）

| データ件数 | 初回読み込み | ページ切り替え | 検索 | メモリ使用量 |
|-----------|------------|--------------|------|------------|
| 100件 | 0.5秒 | 即座 | 即座 | 100KB |
| 1,000件 | 1.5秒 | 即座 | 即座 | 1MB |
| 10,000件 | 8秒 | 即座 | 即座 | 10MB |
| 100,000件 | 80秒 | 即座 | 即座 | 100MB ❌ |

### 変更後（サーバー側ページネーション）

| データ件数 | 初回読み込み | ページ切り替え | 検索 | メモリ使用量 |
|-----------|------------|--------------|------|------------|
| 100件 | 0.3秒 | 0.3秒 | 0.5秒 | 20KB |
| 1,000件 | 0.3秒 | 0.3秒 | 0.5秒 | 20KB |
| 10,000件 | 0.4秒 | 0.3秒 | 0.6秒 | 20KB |
| 100,000件 | 0.5秒 | 0.4秒 | 0.7秒 | 20KB ✅ |

---

## 🎯 実装手順

### フェーズ1: 見積書一覧で実装・テスト（1日）

1. ✅ `/app/api/estimates/route.ts` にページネーション実装
2. ✅ `/components/estimates/EstimateListClient.tsx` 変更
3. ✅ `/app/(authenticated)/estimates/page.tsx` 変更
4. ✅ 動作確認・デバッグ
5. ✅ パフォーマンステスト

### フェーズ2: 他7ページに展開（2日）

6. ✅ 請求書一覧
7. ✅ 発注書一覧
8. ✅ 入金管理
9. ✅ 取引先一覧
10. ✅ 案件一覧
11. ✅ 仕入先一覧
12. ✅ スタッフ一覧

### フェーズ3: インデックス最適化（0.5日）

13. ✅ 各テーブルにインデックス追加
14. ✅ クエリパフォーマンス測定

### フェーズ4: 統合テスト（0.5日）

15. ✅ 全ページの動作確認
16. ✅ 大量データでのテスト
17. ✅ 本番環境デプロイ

---

## 📝 テストシナリオ

### 1. 基本機能テスト
- [ ] ページネーションボタンが正常に動作するか
- [ ] 検索機能が全データから検索できるか
- [ ] フィルターが正常に動作するか
- [ ] ソートが正常に動作するか

### 2. パフォーマンステスト
- [ ] 初回読み込みが2秒以内か
- [ ] ページ切り替えが1秒以内か
- [ ] 検索が1秒以内か

### 3. エッジケーステスト
- [ ] データが0件の場合
- [ ] データが1件の場合
- [ ] データが10,000件以上の場合
- [ ] 検索結果が0件の場合
- [ ] ネットワークエラー時の挙動

### 4. UXテスト
- [ ] ローディング表示が適切か
- [ ] エラーメッセージが適切か
- [ ] ページ遷移が自然か

---

## 🚨 リスクと対策

### リスク1: サーバー負荷の増加
**対策:**
- データベースインデックスの最適化
- キャッシュの導入（Redis等）
- APIレート制限の実装

### リスク2: ユーザー体験の低下
**対策:**
- ローディング状態の明確な表示
- 楽観的UI更新（Optimistic Update）
- デバウンス処理で不要なAPI呼び出しを削減

### リスク3: 実装の複雑化
**対策:**
- 共通化されたAPI実装パターン
- 再利用可能なフック（usePagination）
- 十分なドキュメント

---

## 📊 作業量見積もり

| フェーズ | 作業内容 | ファイル数 | 所要時間 |
|---------|---------|-----------|---------|
| フェーズ1 | 見積書一覧実装・テスト | 3 | 1日 |
| フェーズ2 | 他7ページ展開 | 21 | 2日 |
| フェーズ3 | インデックス最適化 | - | 0.5日 |
| フェーズ4 | 統合テスト | - | 0.5日 |
| **合計** | | **24** | **4日** |

---

## ✅ 完了条件

- [ ] 全8ページがサーバー側ページネーションで動作
- [ ] 検索・フィルター・ソートが正常動作
- [ ] 10,000件のデータでも1秒以内に応答
- [ ] エラーハンドリングが適切
- [ ] ローディング表示が適切
- [ ] データベースインデックスが設定済み
- [ ] テストが全て通過
- [ ] ドキュメントが更新済み

---

## 📚 参考資料

- [Supabase Pagination Guide](https://supabase.com/docs/guides/api/pagination)
- [Next.js Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [PostgreSQL Index Best Practices](https://www.postgresql.org/docs/current/indexes.html)

---

## 更新履歴

- 2026-01-23: 初版作成
