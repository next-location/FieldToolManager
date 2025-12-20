import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

async function RecurringInvoicesContent() {
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">定期請求管理</h1>
        <p className="text-gray-600">毎月自動で請求書を発行する設定を管理します</p>
      </div>

      {/* 定期請求の説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
        <h3 className="font-bold text-blue-900 mb-3">💡 定期請求機能について</h3>
        <div className="text-sm text-blue-800 space-y-2">
          <p>• 毎月同じ内容の請求書を自動生成できます</p>
          <p>• 保守契約、リース料、定期サービスなどに最適です</p>
          <p>• 請求日、支払期日、金額を設定できます</p>
          <p>• 請求書は下書き状態で作成され、確認後に送付できます</p>
        </div>
      </div>

      {/* 定期請求設定一覧 */}
      <div className="bg-white rounded-lg shadow-sm mb-6">
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-bold">定期請求設定</h2>
          <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-sm">
            + 新規設定
          </button>
        </div>
        <div className="p-8 text-center text-gray-500">
          <p className="mb-4">定期請求の設定がありません</p>
          <p className="text-sm">「+ 新規設定」ボタンから定期請求を作成してください</p>
        </div>
      </div>

      {/* 定期請求テンプレート例 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-bold mb-4">設定例</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">🔧 保守契約（月次）</h3>
            <div className="text-sm space-y-1 text-gray-600">
              <p>• 請求先: 株式会社〇〇</p>
              <p>• 請求日: 毎月1日</p>
              <p>• 支払期日: 請求日の翌月末</p>
              <p>• 金額: ¥50,000/月</p>
              <p>• 内容: システム保守費用</p>
            </div>
            <button className="mt-3 w-full bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
              このテンプレートを使用
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">📱 サブスクリプション</h3>
            <div className="text-sm space-y-1 text-gray-600">
              <p>• 請求先: 株式会社△△</p>
              <p>• 請求日: 毎月15日</p>
              <p>• 支払期日: 請求日の翌月15日</p>
              <p>• 金額: ¥100,000/月</p>
              <p>• 内容: SaaSライセンス料</p>
            </div>
            <button className="mt-3 w-full bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
              このテンプレートを使用
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">🏢 賃貸料（月次）</h3>
            <div className="text-sm space-y-1 text-gray-600">
              <p>• 請求先: 株式会社××</p>
              <p>• 請求日: 毎月25日</p>
              <p>• 支払期日: 請求日の翌月10日</p>
              <p>• 金額: ¥200,000/月</p>
              <p>• 内容: 事務所賃貸料</p>
            </div>
            <button className="mt-3 w-full bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
              このテンプレートを使用
            </button>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-bold mb-2">📊 コンサルティング</h3>
            <div className="text-sm space-y-1 text-gray-600">
              <p>• 請求先: 株式会社◇◇</p>
              <p>• 請求日: 毎月末日</p>
              <p>• 支払期日: 請求日の翌々月末</p>
              <p>• 金額: ¥300,000/月</p>
              <p>• 内容: 経営コンサルティング</p>
            </div>
            <button className="mt-3 w-full bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200">
              このテンプレートを使用
            </button>
          </div>
        </div>
      </div>

      {/* 実装予定の機能 */}
      <div className="bg-gray-50 rounded-lg p-6 mt-6">
        <h2 className="text-lg font-bold mb-4">今後実装予定の機能</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>定期請求の自動生成（指定日に自動作成）</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>自動メール送信（請求書作成時に通知）</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>消費税率の自動適用</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>複数明細項目の設定</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>期間限定の定期請求（開始日・終了日設定）</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>請求金額の自動変動（数量×単価）</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>定期請求の一時停止機能</span>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <span>請求履歴の自動集計とレポート</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function RecurringInvoicesPage() {
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
        <RecurringInvoicesContent />
      </Suspense>
      </div>
    </div>
  )
}
