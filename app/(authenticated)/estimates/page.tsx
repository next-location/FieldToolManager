import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function EstimateList() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  const { data: estimates } = await supabase
    .from('estimates')
    .select(`
      *,
      client:clients(name),
      project:projects(project_name)
    `)
    .eq('organization_id', userData?.organization_id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="bg-white shadow-sm rounded-lg">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">見積書一覧</h2>
        <Link
          href="/estimates/new"
          className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
        >
          新規見積書作成
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                見積番号
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                取引先
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                工事名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                見積日
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                有効期限
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                金額（税込）
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ステータス
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {estimates?.map((estimate) => (
              <tr key={estimate.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {estimate.estimate_number}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {estimate.client?.name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {estimate.project?.project_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(estimate.estimate_date).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {estimate.valid_until
                    ? new Date(estimate.valid_until).toLocaleDateString('ja-JP')
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  ¥{estimate.total_amount.toLocaleString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                    estimate.status === 'draft'
                      ? 'bg-gray-100 text-gray-800'
                      : estimate.status === 'sent'
                      ? 'bg-blue-100 text-blue-800'
                      : estimate.status === 'accepted'
                      ? 'bg-green-100 text-green-800'
                      : estimate.status === 'rejected'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {estimate.status === 'draft' ? '下書き'
                      : estimate.status === 'sent' ? '送付済'
                      : estimate.status === 'accepted' ? '承認済'
                      : estimate.status === 'rejected' ? '却下'
                      : '期限切れ'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <Link
                    href={`/estimates/${estimate.id}`}
                    className="text-blue-600 hover:text-blue-900 mr-3"
                  >
                    詳細
                  </Link>
                  {estimate.status === 'draft' && (
                    <Link
                      href={`/estimates/${estimate.id}/edit`}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      編集
                    </Link>
                  )}
                  <a
                    href={`/api/estimates/${estimate.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-900 mr-3"
                  >
                    PDF
                  </a>
                  {estimate.status === 'accepted' && (
                    <Link
                      href={`/invoices/new?estimate_id=${estimate.id}`}
                      className="text-purple-600 hover:text-purple-900"
                    >
                      請求書作成
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {(!estimates || estimates.length === 0) && (
          <div className="text-center py-8 text-gray-500">
            見積書データがありません
          </div>
        )}
      </div>
    </div>
  )
}

export default async function EstimatesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    redirect('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">見積書管理</h1>
        <p className="text-gray-600">
          見積書の作成・管理を行います
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <EstimateList />
      </Suspense>
    </div>
  )
}