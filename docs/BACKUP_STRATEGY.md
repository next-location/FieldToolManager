# ザイロク バックアップ・データエクスポート戦略

> **最終更新**: 2025-01-22
> **ステータス**: Phase 1 & Phase 2 実装完了 ✅

## 📋 目次

1. [現状まとめ](#現状まとめ)
2. [Supabase/Vercelの設定](#supabasevercelの設定)
3. [実装が必要な機能](#実装が必要な機能)
4. [リリース前チェックリスト](#リリース前チェックリスト)
5. [詳細設計](#詳細設計)

---

## 現状まとめ

### ✅ 実装済みエクスポート機能

| 機能 | ページ | API | 形式 | 実装状況 |
|------|--------|-----|------|---------|
| **取引先エクスポート** | `/clients` | `/api/clients/export` | CSV | ✅ **動作確認済み** |
| **発注書エクスポート** | `/purchase-orders` | `/api/purchase-orders/export` | CSV | ✅ **動作確認済み** |
| **月次勤怠レポート** | `/attendance/reports/monthly` | クライアント側生成 | CSV | ✅ **動作確認済み** |
| **見積書PDF** | `/estimates/[id]` | `/api/estimates/[id]/pdf` | PDF | ✅ **動作確認済み** |
| **請求書PDF** | `/invoices/[id]` | `/api/invoices/[id]/pdf` | PDF | ✅ **動作確認済み** |
| **発注書PDF** | `/purchase-orders/[id]` | `/api/purchase-orders/[id]/pdf` | PDF | ✅ **動作確認済み** |
| **作業報告書PDF** | `/work-reports/[id]` | `/api/work-reports/[id]/pdf` | PDF | ✅ **動作確認済み** |
| **作業報告書一括PDF** | `/work-reports` | `/api/work-reports/bulk-pdf` | PDF | ✅ **動作確認済み** |

### ❌ 未実装エクスポート機能（実装必須）

| データ種別 | API | 優先度 | 理由 |
|-----------|-----|--------|------|
| **道具マスタ** | `/api/tools/export` | ⭐⭐⭐⭐⭐ | 在庫管理の基幹データ |
| **消耗品在庫** | `/api/consumables/export` | ⭐⭐⭐⭐⭐ | 在庫管理の基幹データ |
| **スタッフ情報** | `/api/staff/export` | ⭐⭐⭐⭐⭐ | 労務管理データ |
| **現場情報** | `/api/sites/export` | ⭐⭐⭐⭐⭐ | 工事管理データ |
| **在庫移動履歴** | `/api/movements/export` | ⭐⭐⭐ | 監査証跡 |
| **設備管理データ** | `/api/equipment/export` | ⭐⭐⭐ | 重機管理データ |

### ❌ 未実装バックアップ機能

| 機能 | 実装状況 | 優先度 |
|------|---------|--------|
| **データエクスポート統合UI** | ❌ 未実装 | ⭐⭐⭐⭐⭐ |
| **組織データ完全バックアップ** | ❌ 未実装 | ⭐⭐⭐⭐ |
| **自動バックアップ設定** | ❌ 未実装 | ⭐⭐⭐ |
| **リストア（復元）機能** | ❌ 未実装 | ⭐⭐ |

---

## Supabase/Vercelの設定

### Supabase Pro Planについて

#### Q: Pro Plan以外に契約が必要？

**A: いいえ、Pro Planだけでも大丈夫です。ただし、PITRは「追加オプション」です。**

| 項目 | 内容 |
|------|------|
| **Supabase Pro Plan ($25/月)** | ✅ これだけで毎日自動バックアップ（7日間保持）が含まれる |
| **PITR (Point-in-Time Recovery)** | ⭐ **追加オプション** ($100/月〜)<br>Pro Planに**追加で**申し込むもの<br>なくてもバックアップは動作する |

#### Pro Planだけの場合（$25/月）

```
✅ 毎日自動バックアップ（Nightly Backup）
✅ 7日間保持
✅ Supabase Dashboardから復元可能
⚠️  RPO（Recovery Point Objective）= 最大24時間
   → つまり、最悪の場合1日分のデータを失う可能性
```

#### PITR追加の場合（$25 + $100〜/月）

```
✅ 継続的バックアップ（WALログベース）
✅ 7日間保持
✅ 任意の時点（秒単位）に復元可能
✅ RPO = 数秒
✅ 4GB超のDBでもリソース効率的
```

### リリース時のSupabase推奨設定

#### 最小構成（$25/月）

```yaml
Supabase Plan: Pro
自動バックアップ: ON（デフォルトで有効）
PITR: OFF
→ これでも毎日バックアップは取得される
```

#### 推奨構成（$125/月）

```yaml
Supabase Plan: Pro
自動バックアップ: ON
PITR: ON ⭐ 強く推奨
→ 秒単位の復元が可能、本番運用には安心
```

### Supabaseダッシュボードでの設定手順

#### 1. バックアップ設定の確認

1. Supabase Dashboard → プロジェクト選択
2. 左メニュー「Settings」→「Database」
3. 「Backups」セクションを確認
   - Pro Planなら自動的に「Daily Backups: Enabled」になっている
   - バックアップ履歴が表示される

#### 2. PITR（オプション）の有効化

1. Supabase Dashboard → プロジェクト選択
2. 左メニュー「Settings」→「Addons」
3. 「Point in Time Recovery」を探す
4. 「Enable PITR」ボタンをクリック
5. 確認ダイアログで「Enable」

**⚠️ 注意**: PITRを有効にすると、Daily Backupsは自動的に無効になります（PITRの方が高機能なため）

#### 3. Storage Bucketの作成（将来の自動バックアップ用）

```
1. Supabase Dashboard → Storage
2. 「Create a new bucket」をクリック
3. Bucket名: organization-backups
4. Public: OFF（必ず非公開）
5. 「Save」をクリック
```

### Vercelの設定

#### Vercel Pro Planの確認

**Q: すでにPro Planとのことですが、追加設定は？**

**A: リリース時に以下の環境変数を設定するだけです。**

#### 本番環境の環境変数設定

```
Vercelダッシュボード → プロジェクト → Settings → Environment Variables

以下を「Production」環境に設定:

1. NEXT_PUBLIC_SUPABASE_URL
   値: https://xxxxx.supabase.co (本番SupabaseのURL)

2. NEXT_PUBLIC_SUPABASE_ANON_KEY
   値: eyJhbGciOiJIUz... (本番SupabaseのAnon Key)

3. SUPABASE_SERVICE_ROLE_KEY
   値: eyJhbGciOiJIUz... (本番SupabaseのService Role Key)

4. DATABASE_URL
   値: postgresql://postgres:[PASSWORD]@db.xxx.supabase.co:5432/postgres

5. NEXT_PUBLIC_APP_URL
   値: https://zairoku.com
```

#### Vercel Cron Jobs設定（Phase 2実装後）

```typescript
// vercel.json を作成
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * 0"  // 毎週日曜日 午前2時
    }
  ]
}
```

**⚠️ 注意**: Vercel Pro Planでは月1回のCronは無料、それ以上は従量課金

---

## 実装が必要な機能

### Phase 1: データエクスポート機能拡張（最優先）⭐⭐⭐⭐⭐

**実装期間**: 2週間
**優先度**: 必須（リリース前に完了すべき）

#### 実装内容

##### 1. エクスポートAPI実装

| API | ファイルパス | 実装内容 |
|-----|------------|---------|
| 道具マスタ | `app/api/tools/export/route.ts` | ✅ 既存の `/api/clients/export` を参考に実装 |
| 消耗品 | `app/api/consumables/export/route.ts` | ✅ 同上 |
| スタッフ | `app/api/staff/export/route.ts` | ⚠️ 個人情報のため権限チェック必須 |
| 現場 | `app/api/sites/export/route.ts` | ✅ 同上 |
| 移動履歴 | `app/api/movements/export/route.ts` | ✅ 大量データのためページネーション推奨 |
| 設備 | `app/api/equipment/export/route.ts` | ✅ 同上 |

**実装テンプレート**:

```typescript
// app/api/tools/export/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    // 管理者権限チェック
    if (userData.role !== 'admin' && userData.role !== 'leader') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // データ取得
    const { data: tools, error } = await supabase
      .from('tools')
      .select(`
        *,
        tool_items(id, serial_number, status, current_location),
        category:tool_categories(name)
      `)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .order('name')

    if (error) {
      return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
    }

    // CSVヘッダー
    const headers = [
      '道具名',
      'カテゴリ',
      '型番',
      'メーカー',
      '購入日',
      '購入価格',
      '在庫数',
      '最小在庫数',
      '低在庫アラート',
      '登録日',
    ]

    // CSVデータ行
    const rows = tools.map((tool) => [
      tool.name,
      tool.category?.name || '',
      tool.model_number || '',
      tool.manufacturer || '',
      tool.purchase_date || '',
      tool.purchase_price || '',
      tool.quantity || 0,
      tool.minimum_stock || 0,
      tool.enable_low_stock_alert ? 'ON' : 'OFF',
      new Date(tool.created_at).toLocaleDateString('ja-JP'),
    ])

    // CSV生成
    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
    ].join('\n')

    // BOM付きUTF-8
    const bom = '\uFEFF'
    const csvBlob = bom + csvContent

    return new NextResponse(csvBlob, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="tools_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting tools:', error)
    return NextResponse.json({ error: 'エクスポートに失敗しました' }, { status: 500 })
  }
}
```

##### 2. データエクスポート統合UI

**新規ページ**: `app/(authenticated)/settings/data-export/page.tsx`

```typescript
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import { DataExportClient } from './DataExportClient'

export default async function DataExportPage() {
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // admin権限チェック
  if (userRole !== 'admin') {
    redirect('/')
  }

  // 各データの件数を取得
  const [
    { count: toolsCount },
    { count: consumablesCount },
    { count: staffCount },
    { count: sitesCount },
    // ...
  ] = await Promise.all([
    supabase.from('tools').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).is('deleted_at', null),
    supabase.from('consumables').select('*', { count: 'exact', head: true }).eq('organization_id', organizationId).is('deleted_at', null),
    // ...
  ])

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">データエクスポート</h1>
          <p className="mt-1 text-sm text-gray-600">
            組織のデータをエクスポートして、バックアップや外部ツールでの利用が可能です。
          </p>
        </div>

        <DataExportClient
          counts={{
            tools: toolsCount || 0,
            consumables: consumablesCount || 0,
            staff: staffCount || 0,
            sites: sitesCount || 0,
          }}
        />
      </div>
    </div>
  )
}
```

**クライアントコンポーネント**: `app/(authenticated)/settings/data-export/DataExportClient.tsx`

```typescript
'use client'

import { useState } from 'react'

interface DataExportClientProps {
  counts: {
    tools: number
    consumables: number
    staff: number
    sites: number
  }
}

export function DataExportClient({ counts }: DataExportClientProps) {
  const [selections, setSelections] = useState({
    tools: false,
    consumables: false,
    staff: false,
    sites: false,
    movements: false,
    equipment: false,
  })

  const [exporting, setExporting] = useState(false)

  const handleExport = async (type: string) => {
    setExporting(true)
    try {
      const response = await fetch(`/api/${type}/export`)
      if (!response.ok) throw new Error('エクスポートに失敗しました')

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'エクスポートに失敗しました')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* マスタデータ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">マスタデータ</h2>
        <div className="space-y-3">
          <ExportRow
            label="道具マスタ"
            count={counts.tools}
            onExport={() => handleExport('tools')}
            disabled={exporting}
          />
          <ExportRow
            label="消耗品マスタ"
            count={counts.consumables}
            onExport={() => handleExport('consumables')}
            disabled={exporting}
          />
          <ExportRow
            label="スタッフ情報"
            count={counts.staff}
            onExport={() => handleExport('staff')}
            disabled={exporting}
          />
          <ExportRow
            label="現場情報"
            count={counts.sites}
            onExport={() => handleExport('sites')}
            disabled={exporting}
          />
        </div>
      </div>
    </div>
  )
}

function ExportRow({ label, count, onExport, disabled }: any) {
  return (
    <div className="flex items-center justify-between py-3 border-b last:border-b-0">
      <div>
        <span className="text-sm font-medium text-gray-900">{label}</span>
        <span className="ml-2 text-sm text-gray-500">({count}件)</span>
      </div>
      <button
        onClick={onExport}
        disabled={disabled}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
      >
        CSVエクスポート
      </button>
    </div>
  )
}
```

##### 3. サイドバーメニューに追加

`components/Sidebar.tsx` に以下を追加:

```typescript
// 設定セクション内に追加
{userRole === 'admin' && (
  <Link
    href="/settings/data-export"
    className={linkClassName('/settings/data-export')}
  >
    <DocumentArrowDownIcon className="h-5 w-5" />
    <span>データエクスポート</span>
  </Link>
)}
```

---

## 開発環境とリリースの流れ

### 💡 重要：今すぐ実装できます

**Phase 1〜2の機能は、今すぐローカル環境で実装・テスト可能です。**

リリース時は設定だけでOKになります。

#### 開発フロー

```
【今できること】
✅ Phase 1のエクスポート機能を全部実装
✅ Phase 2の自動バックアップ機能も実装
✅ ローカル環境でテスト・動作確認
✅ GitHubにプッシュ

【リリース時にやること】（設定のみ、5〜10分）
1. Supabase Pro Planに契約
2. Supabase Dashboardで設定（バックアップ、PITR、Storage）
3. Vercel Dashboardで環境変数設定
4. デプロイ → 完了！
```

#### 環境分岐の実装方法

Phase 2のSupabase Storage使用部分は、環境によって分岐させます：

```typescript
// app/api/organization/backup/full/route.ts

// ローカル環境とリリース環境で分岐
const isProduction = process.env.NODE_ENV === 'production'

if (isProduction) {
  // 本番環境: Supabase Storageにアップロード
  const { error: uploadError } = await supabase.storage
    .from('organization-backups')
    .upload(fileName, compressed, {
      contentType: 'application/gzip',
    })

  if (uploadError) throw uploadError
} else {
  // ローカル環境: ファイルシステムに保存（テスト用）
  const fs = require('fs').promises
  const path = require('path')

  const backupDir = path.join(process.cwd(), 'backups', organizationId)
  await fs.mkdir(backupDir, { recursive: true })
  await fs.writeFile(path.join(backupDir, fileName.split('/').pop()!), compressed)

  console.log(`[DEV] Backup saved locally: ${fileName}`)
}
```

#### .gitignoreに追加

ローカルバックアップファイルをGit管理から除外：

```
# .gitignore に追加
/backups/
```

これで、**今すぐ全部実装してテストでき、リリース時は設定だけで動く**状態になります。

---

### Phase 2: 自動バックアップ機能（推奨）⭐⭐⭐⭐

**実装期間**: 1週間
**優先度**: 推奨（リリース後でも可）
**開発環境**: ✅ 今すぐ実装可能（環境分岐あり）

#### 実装内容

##### 1. 組織データ完全バックアップAPI

**ファイル**: `app/api/organization/backup/full/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import pako from 'pako' // gzip圧縮用

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 認証・権限チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 全データ取得
    const [tools, consumables, staff, sites, movements] = await Promise.all([
      supabase.from('tools').select('*').eq('organization_id', userData.organization_id).is('deleted_at', null),
      supabase.from('consumables').select('*').eq('organization_id', userData.organization_id).is('deleted_at', null),
      supabase.from('users').select('*').eq('organization_id', userData.organization_id).is('deleted_at', null),
      supabase.from('sites').select('*').eq('organization_id', userData.organization_id).is('deleted_at', null),
      supabase.from('tool_movements').select('*').eq('organization_id', userData.organization_id),
    ])

    // バックアップデータ構造
    const backup = {
      version: '1.0',
      organization_id: userData.organization_id,
      backup_date: new Date().toISOString(),
      data: {
        tools: tools.data,
        consumables: consumables.data,
        staff: staff.data,
        sites: sites.data,
        movements: movements.data,
      }
    }

    // JSON → gzip圧縮
    const jsonString = JSON.stringify(backup)
    const compressed = pako.gzip(jsonString)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const fileName = `backups/${userData.organization_id}/${timestamp}_full_backup.json.gz`

    // 環境分岐：本番環境ではSupabase Storage、ローカルではファイルシステム
    const isProduction = process.env.NODE_ENV === 'production'

    if (isProduction) {
      // 本番環境: Supabase Storageにアップロード
      const { error: uploadError } = await supabase.storage
        .from('organization-backups')
        .upload(fileName, compressed, {
          contentType: 'application/gzip',
        })

      if (uploadError) {
        throw uploadError
      }
    } else {
      // ローカル環境: ファイルシステムに保存（テスト用）
      const fs = require('fs').promises
      const path = require('path')

      const backupDir = path.join(process.cwd(), 'backups', userData.organization_id)
      await fs.mkdir(backupDir, { recursive: true })
      await fs.writeFile(path.join(backupDir, fileName.split('/').pop()!), compressed)

      console.log(`[DEV] Backup saved locally: ${fileName}`)
    }

    // バックアップ履歴を記録
    await supabase.from('organization_backups').insert({
      organization_id: userData.organization_id,
      backup_type: 'full',
      file_path: fileName,
      file_size_mb: (compressed.byteLength / (1024 * 1024)).toFixed(2),
      status: 'completed',
      created_by: user.id,
    })

    return NextResponse.json({
      success: true,
      file_path: fileName,
      file_size_mb: (compressed.byteLength / (1024 * 1024)).toFixed(2),
      environment: isProduction ? 'production' : 'development',
    })
  } catch (error) {
    console.error('Backup error:', error)
    return NextResponse.json({ error: 'バックアップに失敗しました' }, { status: 500 })
  }
}
```

##### 2. データベーステーブル追加

`supabase/migrations/YYYYMMDD_add_backup_tables.sql`:

```sql
-- organization_backups テーブル
CREATE TABLE organization_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL, -- 'full', 'incremental'
  file_path TEXT NOT NULL,
  file_size_mb NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'completed', -- 'completed', 'failed'
  error_message TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLSポリシー
ALTER TABLE organization_backups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "organization_backups_select_policy" ON organization_backups
  FOR SELECT
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "organization_backups_insert_policy" ON organization_backups
  FOR INSERT
  WITH CHECK (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));
```

##### 3. Vercel Cron Job設定

**ファイル**: `app/api/cron/backup/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  try {
    // Vercel Cron Secret検証
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 全組織を取得
    const { data: organizations } = await supabase
      .from('organizations')
      .select('id')
      .eq('is_active', true)

    // 各組織のバックアップを実行
    for (const org of organizations || []) {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/organization/backup/full`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Organization-Id': org.id, // カスタムヘッダー
        },
      })
    }

    return NextResponse.json({ success: true, count: organizations?.length || 0 })
  } catch (error) {
    console.error('Cron backup error:', error)
    return NextResponse.json({ error: 'バックアップに失敗しました' }, { status: 500 })
  }
}
```

**Vercel設定ファイル**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * 0"
    }
  ]
}
```

**環境変数追加**:
```
CRON_SECRET=ランダムな長い文字列（32文字以上）
```

---

### Phase 3: リストア機能（余裕があれば）⭐⭐

**実装期間**: 1週間
**優先度**: 低（リリース後でも可）

省略（必要な場合は後ほど詳細化）

---

## リリース前チェックリスト

### 開発環境（今やること）

- [x] **Phase 1のエクスポートAPI実装**（6つのAPI） ✅ 完了
  - [x] `/api/tools/export` - 道具マスタ
  - [x] `/api/consumables/export` - 消耗品
  - [x] `/api/staff/export` - スタッフ情報
  - [x] `/api/sites/export` - 現場情報
  - [x] `/api/movements/export` - 移動履歴
  - [x] `/api/equipment/export` - 設備管理
- [x] **Phase 1のエクスポートUI実装**（`/settings/data-export` ページ） ✅ 完了
  - [x] `app/(authenticated)/settings/data-export/page.tsx`
  - [x] `app/(authenticated)/settings/data-export/DataExportClient.tsx`
  - [x] サイドバーメニュー追加
- [x] **Phase 2のバックアップAPI実装**（環境分岐あり） ✅ 完了
  - [x] `supabase/migrations/20250122000000_add_backup_tables.sql` - バックアップテーブル作成
  - [x] `app/api/organization/backup/full/route.ts` - フルバックアップAPI（環境分岐対応）
  - [x] `app/api/cron/backup/route.ts` - Vercel Cron Job
  - [x] `vercel.json` - Cron設定追加
  - [x] `CRON_SECRET` 環境変数確認済み
- [x] **`.gitignore`に`/backups/`追加** ✅ 完了
- [ ] **ローカル環境でテスト完了**
- [ ] **GitHubにプッシュ**

### データベース（リリース時）

- [ ] **Supabase Pro Planに契約済み**
- [ ] **Daily Backupsが有効** （Pro Planならデフォルトで有効）
- [ ] **PITR有効化** （推奨、オプション）
- [ ] **Storage Bucket作成** （`organization-backups`、Phase 2実装時）

### 環境変数（Vercel Production）

- [ ] `NEXT_PUBLIC_SUPABASE_URL` 設定済み
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 設定済み
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 設定済み
- [ ] `DATABASE_URL` 設定済み
- [ ] `NEXT_PUBLIC_APP_URL` 設定済み

### Phase 1: エクスポート機能

- [ ] `/api/tools/export` 実装・テスト完了
- [ ] `/api/consumables/export` 実装・テスト完了
- [ ] `/api/staff/export` 実装・テスト完了
- [ ] `/api/sites/export` 実装・テスト完了
- [ ] `/api/movements/export` 実装・テスト完了
- [ ] `/api/equipment/export` 実装・テスト完了
- [ ] `/settings/data-export` ページ実装完了
- [ ] サイドバーメニュー追加完了
- [ ] 権限チェック動作確認

### Phase 2: 自動バックアップ（オプション）

- [x] `organization_backups` テーブル作成 ✅
- [x] `/api/organization/backup/full` 実装 ✅
- [ ] Supabase Storage Bucket作成（リリース時）
- [x] `/api/cron/backup` 実装 ✅
- [x] `vercel.json` Cron設定 ✅
- [x] `CRON_SECRET` 環境変数設定 ✅

---

## 詳細設計

### エクスポートCSVフォーマット仕様

#### 道具マスタ (tools_YYYY-MM-DD.csv)

```csv
道具名,カテゴリ,型番,メーカー,購入日,購入価格,在庫数,最小在庫数,低在庫アラート,登録日
"電動ドリル","電動工具","DRL-5000","マキタ","2024-01-15","25000","5","2","ON","2024-01-15"
```

#### 消耗品 (consumables_YYYY-MM-DD.csv)

```csv
消耗品名,カテゴリ,型番,在庫数,最小在庫数,単価,最終調整日,低在庫アラート,登録日
"ビス 4×50mm","金物","BS-450","5000","1000","0.5","2025-01-20","ON","2024-03-10"
```

#### スタッフ (staff_YYYY-MM-DD.csv)

```csv
スタッフ名,メールアドレス,ロール,部署,電話番号,入社日,有効フラグ,登録日
"山田太郎","yamada@example.com","leader","施工部","090-1234-5678","2023-04-01","有効","2023-04-01"
```

#### 現場 (sites_YYYY-MM-DD.csv)

```csv
現場名,現場コード,住所,開始日,終了日,ステータス,担当リーダー,予算,備考,登録日
"○○ビル新築工事","SITE-001","東京都渋谷区...","2025-01-10","2025-12-31","進行中","山田太郎","50000000","","2025-01-10"
```

### バックアップファイル構造

```json
{
  "version": "1.0",
  "organization_id": "uuid",
  "backup_date": "2025-01-22T02:00:00.000Z",
  "data": {
    "tools": [...],
    "consumables": [...],
    "staff": [...],
    "sites": [...],
    "movements": [...]
  }
}
```

---

## コスト試算

### Supabase（本番環境）

| 項目 | プラン | 月額 | 備考 |
|------|--------|------|------|
| **基本プラン** | Pro | $25 | データベース・Storage含む |
| **PITR（推奨）** | Add-on | $100〜 | オプション（追加契約） |
| **Storage超過** | 従量課金 | $0.021/GB | 100GB超過時 |
| **合計** | - | **$25〜$125/月** | PITRなしなら$25のみ |

### Vercel（本番環境）

| 項目 | プラン | 月額 | 備考 |
|------|--------|------|------|
| **基本プラン** | Pro | $20 | ✅ すでに契約済み |
| **Cron Jobs** | 無料枠 | $0 | 月1回まで無料 |

### 総コスト

```
最小構成: $25（Supabase Pro のみ）
推奨構成: $125（Supabase Pro + PITR）
```

---

## まとめ

### リリース時に絶対必要なこと

1. ✅ **Supabase Pro Planに契約**（$25/月）
2. ✅ **Phase 1のエクスポート機能を実装**（必須）
3. ⭐ **PITRを有効化**（推奨、$100/月追加）

### リリース後でも良いこと

- Phase 2: 自動バックアップ機能
- Phase 3: リストア機能

### Supabaseの追加契約について

**Q: Pro Plan以外に契約が必要？**

**A: PITRは「追加オプション」です。Pro Planとは別に申し込みます。**

```
✅ Supabase Pro Plan ($25/月) ← これだけでも毎日バックアップあり
⭐ + PITR ($100/月) ← 追加で申し込むオプション（推奨）
```

PITRがなくても、Pro Planの毎日バックアップで最低限のBCP対策はできています。
