import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function ReportsContent() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role, organization_id')
    .eq('id', user.id)
    .single()

  // 管理者以上のみアクセス可能
  if (!['admin', 'super_admin'].includes(userData?.role || '')) {
    redirect('/')
  }

  // データ件数を取得
  const { count: estimateCount } = await supabase
    .from('estimates')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', userData?.organization_id)

  const { count: invoiceCount } = await supabase
    .from('billing_invoices')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', userData?.organization_id)

  const { count: poCount } = await supabase
    .from('purchase_orders')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', userData?.organization_id)

  const { count: paymentCount } = await supabase
    .from('payments')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', userData?.organization_id)

  const { count: clientCount } = await supabase
    .from('clients')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', userData?.organization_id)

  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', userData?.organization_id)

  const reports = [
    {
      id: 'estimates',
      name: '見積書データ',
      description: '全見積書のデータをCSV形式でエクスポート',
      count: estimateCount || 0,
      endpoint: '/api/reports/estimates',
      icon: '📝',
      category: '帳票'
    },
    {
      id: 'invoices',
      name: '請求書データ',
      description: '全請求書のデータをCSV形式でエクスポート',
      count: invoiceCount || 0,
      endpoint: '/api/reports/invoices',
      icon: '📄',
      category: '帳票'
    },
    {
      id: 'purchase-orders',
      name: '発注書データ',
      description: '全発注書のデータをCSV形式でエクスポート',
      count: poCount || 0,
      endpoint: '/api/reports/purchase-orders',
      icon: '📋',
      category: '帳票'
    },
    {
      id: 'payments',
      name: '入出金データ',
      description: '全入出金履歴をCSV形式でエクスポート',
      count: paymentCount || 0,
      endpoint: '/api/reports/payments',
      icon: '💰',
      category: '財務'
    },
    {
      id: 'clients',
      name: '取引先マスタ',
      description: '取引先情報をCSV形式でエクスポート',
      count: clientCount || 0,
      endpoint: '/api/reports/clients',
      icon: '🏢',
      category: 'マスタ'
    },
    {
      id: 'projects',
      name: '工事マスタ',
      description: '工事情報をCSV形式でエクスポート',
      count: projectCount || 0,
      endpoint: '/api/reports/projects',
      icon: '🏗️',
      category: 'マスタ'
    },
    {
      id: 'sales-summary',
      name: '売上集計レポート',
      description: '月次・取引先別・工事別の売上集計',
      count: invoiceCount || 0,
      endpoint: '/api/reports/sales-summary',
      icon: '📊',
      category: '分析'
    },
    {
      id: 'profit-loss',
      name: '工事別損益レポート',
      description: '全工事の収支・粗利益・粗利率データ',
      count: projectCount || 0,
      endpoint: '/api/reports/profit-loss',
      icon: '💹',
      category: '分析'
    },
    {
      id: 'cashflow',
      name: 'キャッシュフローレポート',
      description: '月別の入出金予定・実績データ',
      count: (invoiceCount || 0) + (poCount || 0),
      endpoint: '/api/reports/cashflow',
      icon: '💵',
      category: '分析'
    },
    {
      id: 'receivables',
      name: '売掛金レポート',
      description: '取引先別の未回収額一覧',
      count: invoiceCount || 0,
      endpoint: '/api/reports/receivables',
      icon: '📈',
      category: '財務'
    },
    {
      id: 'payables',
      name: '買掛金レポート',
      description: '仕入先別の未払額一覧',
      count: poCount || 0,
      endpoint: '/api/reports/payables',
      icon: '📉',
      category: '財務'
    }
  ]

  const categories = ['帳票', 'マスタ', '財務', '分析']

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">各種レポート出力</h1>
        <p className="text-gray-600">各種データをCSV形式でエクスポートできます</p>
      </div>

      {/* 注意事項 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h3 className="font-bold text-blue-900 mb-2">📌 レポート出力について</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• CSVファイルはShift-JIS形式で出力されます（Excelで直接開けます）</li>
          <li>• 大量データの場合、出力に時間がかかる場合があります</li>
          <li>• 出力されるデータは現在の組織のデータのみです</li>
          <li>• 会計ソフトへのインポートに対応した形式で出力されます</li>
        </ul>
      </div>

      {/* カテゴリ別レポート一覧 */}
      {categories.map((category) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-bold mb-4 pb-2 border-b">{category}レポート</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reports
              .filter((report) => report.category === category)
              .map((report) => (
                <div key={report.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="text-4xl">{report.icon}</div>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs font-medium">
                        {report.count}件
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2">{report.name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{report.description}</p>
                    <button
                      className="w-full bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-sm font-medium"
                      onClick={() => {
                        // 実装時にAPIエンドポイントを呼び出してCSVダウンロード
                        alert('CSV出力機能は各APIエンドポイント実装時に有効化されます')
                      }}
                    >
                      CSV出力
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      ))}

      {/* 会計ソフト連携 */}
      <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
        <h2 className="text-xl font-bold mb-4">会計ソフト連携</h2>
        <p className="text-gray-600 mb-4">
          出力されたCSVファイルは以下の会計ソフトでインポート可能な形式です：
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">弥生会計</h3>
            <p className="text-sm text-gray-600">仕訳データとしてインポート可能</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">freee</h3>
            <p className="text-sm text-gray-600">取引データとしてインポート可能</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">マネーフォワード</h3>
            <p className="text-sm text-gray-600">仕訳データとしてインポート可能</p>
          </div>
        </div>
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            ⚠️ 会計ソフトへのインポート方法は各ソフトのマニュアルをご確認ください。
            データ形式のカスタマイズが必要な場合はサポートまでお問い合わせください。
          </p>
        </div>
      </div>

      {/* 定期レポート設定（Phase 5で実装予定） */}
      <div className="bg-gray-50 rounded-lg p-6 mt-8">
        <h2 className="text-xl font-bold mb-4">定期レポート配信（近日実装予定）</h2>
        <p className="text-gray-600 mb-4">
          月次・週次で自動的にレポートを生成し、メールで送信する機能を実装予定です。
        </p>
        <div className="space-y-2 text-sm text-gray-600">
          <p>• 📧 月次売上レポートの自動配信</p>
          <p>• 📊 週次キャッシュフローレポート</p>
          <p>• 🔔 支払期限アラート付きレポート</p>
          <p>• 📈 四半期決算サマリー</p>
        </div>
      </div>
      </div>
    </div>
  )
}

export default async function ReportsPage() {
  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <ReportsContent />
      </Suspense>
      </div>
    </div>
  )
}
