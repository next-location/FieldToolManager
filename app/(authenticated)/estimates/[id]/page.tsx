import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { DownloadPdfButton } from './DownloadPdfButton'
import { ApproveEstimateButton } from '@/components/estimates/ApproveEstimateButton'
import { SendToCustomerButton } from '@/components/estimates/SendToCustomerButton'
import { CustomerDecisionButtons } from '@/components/estimates/CustomerDecisionButtons'

// キャッシュを無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function EstimateDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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

  // 全ユーザーがアクセス可能（権限チェックなし）

  // 見積書データを取得
  const { data: estimate, error: estimateError } = await supabase
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

  console.log('[見積書詳細] 見積書ID:', id)
  console.log('[見積書詳細] 見積書データ:', estimate)
  console.log('[見積書詳細] 明細件数:', estimate?.estimate_items?.length || 0)
  console.log('[見積書詳細] エラー:', estimateError)

  if (!estimate) {
    redirect('/estimates')
  }

  // 組織情報を取得
  const { data: organization } = await supabase
    .from('organizations')
    .select('name, address, phone, invoice_registration_number')
    .eq('id', userData?.organization_id)
    .single()

  const subtotal = estimate.estimate_items?.reduce((sum: number, item: any) => sum + item.amount, 0) || 0
  const taxAmount = estimate.estimate_items?.reduce((sum: number, item: any) =>
    sum + (item.amount * item.tax_rate / 100), 0) || 0
  const total = subtotal + taxAmount

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'submitted':
        return 'bg-orange-100 text-orange-800'
      case 'sent':
        return 'bg-blue-100 text-blue-800'
      case 'accepted':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'expired':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'draft': return '下書き'
      case 'submitted': return '提出済み'
      case 'sent': return '顧客送付済'
      case 'accepted': return '顧客承認'
      case 'rejected': return '顧客却下'
      case 'expired': return '期限切れ'
      default: return status
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">見積書詳細</h1>
          <p className="text-gray-600">{estimate.estimate_number}</p>
        </div>
        <div className="space-x-2">
          {/* 下書き状態: 編集のみ可能 */}
          {estimate.status === 'draft' && (
            <Link
              href={`/estimates/${id}/edit`}
              className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
            >
              編集
            </Link>
          )}

          {/* 提出済み状態: 承認ボタンのみ表示（manager/admin のみ）、編集不可 */}
          {estimate.status === 'submitted' && !estimate.manager_approved_at && (
            <ApproveEstimateButton
              estimateId={id}
              isApproved={false}
              userRole={userData?.role || ''}
            />
          )}

          {/* 提出済み&承認済み: 承認取り消しボタン、PDF、顧客送付ボタン */}
          {estimate.status === 'submitted' && estimate.manager_approved_at && (
            <>
              <ApproveEstimateButton
                estimateId={id}
                isApproved={true}
                userRole={userData?.role || ''}
              />
              <DownloadPdfButton estimateId={id} />
              <SendToCustomerButton
                estimateId={id}
                status={estimate.status}
                isApproved={true}
                userRole={userData?.role || ''}
              />
            </>
          )}

          {/* 顧客送付済み: PDF、顧客判断ボタン */}
          {estimate.status === 'sent' && (
            <>
              <DownloadPdfButton estimateId={id} />
              <CustomerDecisionButtons
                estimateId={id}
                status={estimate.status}
                userRole={userData?.role || ''}
              />
            </>
          )}

          {/* 顧客承認済み: PDF、請求書作成ボタン */}
          {estimate.status === 'accepted' && (
            <>
              <DownloadPdfButton estimateId={id} />
              <Link
                href={`/invoices/new?estimate_id=${id}`}
                className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600"
              >
                請求書作成
              </Link>
            </>
          )}

          {/* 顧客却下済み: PDFのみ */}
          {estimate.status === 'rejected' && (
            <DownloadPdfButton estimateId={id} />
          )}

          <Link
            href="/estimates"
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            一覧に戻る
          </Link>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-8 print:shadow-none">
        {/* ヘッダー部分 */}
        <div className="border-b pb-6 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold">見　積　書</h2>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* 宛先 */}
            <div>
              <div className="mb-4">
                <p className="text-lg font-bold border-b-2 border-black pb-1 mb-2">
                  {estimate.client?.name} 様
                </p>
                {estimate.client?.postal_code && (
                  <p className="text-sm text-gray-600">〒{estimate.client.postal_code}</p>
                )}
                {estimate.client?.address && (
                  <p className="text-sm text-gray-600">{estimate.client.address}</p>
                )}
                {estimate.client?.contact_person && (
                  <p className="text-sm text-gray-600">ご担当: {estimate.client.contact_person} 様</p>
                )}
              </div>
              <div className="mt-6">
                <p className="text-sm mb-2">下記のとおり見積申し上げます。</p>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-1">見積金額（税込）</p>
                  <p className="text-3xl font-bold">¥{Math.floor(total).toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* 発行者情報 */}
            <div className="text-right">
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-1">見積番号: {estimate.estimate_number}</p>
                {organization?.invoice_registration_number && (
                  <p className="text-xs text-gray-600 mb-1">登録番号: {organization.invoice_registration_number}</p>
                )}
                <p className="text-xs text-gray-600 mb-1">
                  見積日: {new Date(estimate.estimate_date).toLocaleDateString('ja-JP')}
                </p>
                {estimate.valid_until && (
                  <p className="text-xs text-gray-600 mb-1">
                    有効期限: {new Date(estimate.valid_until).toLocaleDateString('ja-JP')}
                  </p>
                )}
              </div>

              <div className="inline-block text-left">
                <p className="font-bold text-lg mb-2">{organization?.name}</p>
                {organization?.address && (
                  <p className="text-sm text-gray-600">{organization.address}</p>
                )}
                {organization?.phone && (
                  <p className="text-sm text-gray-600">TEL: {organization.phone}</p>
                )}
              </div>

              <div className="mt-4">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(estimate.status)}`}>
                  {getStatusText(estimate.status)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 件名 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">件名</h3>
          <p className="text-lg">{estimate.title}</p>
          {estimate.project && (
            <p className="text-sm text-gray-600 mt-1">
              工事: {estimate.project.project_name} ({estimate.project.project_code})
            </p>
          )}
        </div>

        {/* 明細 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">明細</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-t border-b">
                <th className="text-left p-2 text-sm">項目</th>
                <th className="text-left p-2 text-sm">説明</th>
                <th className="text-right p-2 text-sm">数量</th>
                <th className="text-center p-2 text-sm">単位</th>
                <th className="text-right p-2 text-sm">単価</th>
                <th className="text-right p-2 text-sm">金額</th>
                <th className="text-center p-2 text-sm">税率</th>
              </tr>
            </thead>
            <tbody>
              {estimate.estimate_items?.sort((a: any, b: any) => a.display_order - b.display_order)
                .map((item: any) => (
                <tr key={item.id} className="border-b">
                  <td className="p-2 text-sm">{item.item_name}</td>
                  <td className="p-2 text-sm text-gray-600">{item.description}</td>
                  <td className="p-2 text-sm text-right">{item.quantity}</td>
                  <td className="p-2 text-sm text-center">{item.unit}</td>
                  <td className="p-2 text-sm text-right">¥{item.unit_price.toLocaleString()}</td>
                  <td className="p-2 text-sm text-right font-medium">¥{item.amount.toLocaleString()}</td>
                  <td className="p-2 text-sm text-center">{item.tax_rate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 合計 */}
        <div className="flex justify-end mb-6">
          <div className="w-80">
            <div className="flex justify-between py-2">
              <span className="text-sm">小計:</span>
              <span className="text-sm font-medium">¥{subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">消費税:</span>
              <span className="text-sm font-medium">¥{Math.floor(taxAmount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="font-bold">合計:</span>
              <span className="text-xl font-bold">¥{Math.floor(total).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 備考 */}
        {estimate.notes && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">備考</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}

        {/* 社内メモ（印刷時は非表示） */}
        {estimate.internal_notes && (
          <div className="mb-6 p-4 bg-yellow-50 rounded print:hidden">
            <h3 className="text-sm font-semibold mb-2 text-yellow-800">社内メモ</h3>
            <p className="text-sm text-yellow-700 whitespace-pre-wrap">{estimate.internal_notes}</p>
          </div>
        )}

        {/* 承認情報（印刷時は非表示） */}
        {estimate.manager_approved_at && (
          <div className="mb-6 p-4 bg-green-50 rounded print:hidden">
            <h3 className="text-sm font-semibold mb-2 text-green-800">✓ 承認済み</h3>
            <div className="text-sm text-green-700">
              <p>承認者: {estimate.manager_approved_by_user?.name}</p>
              <p>承認日時: {new Date(estimate.manager_approved_at).toLocaleString('ja-JP')}</p>
              {estimate.manager_approval_notes && (
                <p className="mt-2 whitespace-pre-wrap">メモ: {estimate.manager_approval_notes}</p>
              )}
            </div>
          </div>
        )}

        {/* 差し戻し理由（下書きステータスで差し戻し理由がある場合のみ表示） */}
        {estimate.status === 'draft' && estimate.manager_approval_notes?.startsWith('【差し戻し理由】') && (
          <div className="mb-6 p-4 bg-orange-50 border-l-4 border-orange-500 rounded print:hidden">
            <h3 className="text-sm font-semibold mb-2 text-orange-800">⚠ 差し戻されました</h3>
            <div className="text-sm text-orange-700">
              <p className="whitespace-pre-wrap">{estimate.manager_approval_notes.replace('【差し戻し理由】', '')}</p>
            </div>
          </div>
        )}

        {/* メタデータ */}
        <div className="text-xs text-gray-500 pt-6 border-t print:hidden">
          <p>作成者: {estimate.created_by?.name} - {new Date(estimate.created_at).toLocaleString('ja-JP')}</p>
          {estimate.approved_by && (
            <p>承認者: {estimate.approved_by.name}</p>
          )}
          <p>最終更新: {new Date(estimate.updated_at).toLocaleString('ja-JP')}</p>
        </div>
      </div>
    </div>
  )
}