import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/page-auth'
import Link from 'next/link'
import { DownloadPdfButton } from './DownloadPdfButton'
import { SubmitInvoiceButton } from '@/components/invoices/SubmitInvoiceButton'
import { ApproveInvoiceButton } from '@/components/invoices/ApproveInvoiceButton'
import { SendInvoiceButton } from '@/components/invoices/SendInvoiceButton'
import { ReturnInvoiceButton } from '@/components/invoices/ReturnInvoiceButton'
import { InvoiceHistoryTimeline } from '@/components/invoices/InvoiceHistoryTimeline'
import { getInvoiceHistory } from '@/lib/invoice-history'

// キャッシュを無効化
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function InvoiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { userId, organizationId, userRole, supabase } = await requireAuth()

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userRole || '')) {
    redirect('/')
  }

  // 請求書データを取得
  const { data: invoice } = await supabase
    .from('billing_invoices')
    .select(`
      *,
      client:clients(*),
      project:projects(*),
      billing_invoice_items(*)
    `)
    .eq('id', id)
    .eq('organization_id', organizationId)
    .single()

  if (!invoice) {
    redirect('/invoices')
  }

  // 操作履歴を取得
  const history = await getInvoiceHistory(id)

  const isPaid = invoice.paid_amount >= invoice.total_amount
  const isPartiallyPaid = invoice.paid_amount > 0 && !isPaid
  const isOverdue = !isPaid && new Date(invoice.due_date) < new Date()

  const getStatusBadge = (status: string) => {
    if (isOverdue && status !== 'paid') return 'bg-red-100 text-red-800'
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'submitted':
        return 'bg-orange-100 text-orange-800'
      case 'approved':
        return 'bg-blue-100 text-blue-800'
      case 'sent':
        return 'bg-purple-100 text-purple-800'
      case 'paid':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: string) => {
    if (isOverdue && status !== 'paid') return '期限超過'
    switch (status) {
      case 'draft': return '下書き'
      case 'submitted': return '提出済み'
      case 'approved': return '承認済'
      case 'sent': return '送付済'
      case 'paid': return '入金済'
      default: return status
    }
  }

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 py-6 sm:px-0">
      <div className="mb-6">
        {/* スマホ: 縦並び、PC: 横並び（見積書と同じレイアウト） */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          {/* 左: タイトルと番号 */}
          <div>
            <h1 className="text-lg sm:text-2xl font-bold mb-2">請求書詳細</h1>
            <p className="text-sm sm:text-base text-gray-600">{invoice.invoice_number}</p>
          </div>

          {/* 右: アクションボタン（スマホ: 縦並び、PC: 横並び） */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2">
            {/* 一覧に戻る（常に表示・最初に配置） */}
            <Link
              href="/invoices"
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 text-center"
            >
              一覧に戻る
            </Link>

            {/* 下書き状態: 編集・提出が可能 */}
            {invoice.status === 'draft' && (
              <>
                <Link
                  href={`/invoices/${id}/edit`}
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 text-center"
                >
                  編集
                </Link>
                <SubmitInvoiceButton invoiceId={id} />
              </>
            )}

            {/* 提出済み状態: 承認・差し戻しボタン（manager/admin のみ） */}
            {invoice.status === 'submitted' && (
              <>
                <ReturnInvoiceButton invoiceId={id} userRole={userRole || ''} />
                <ApproveInvoiceButton invoiceId={id} userRole={userRole || ''} />
              </>
            )}

            {/* 承認済み状態: PDF出力・送付ボタン */}
            {invoice.status === 'approved' && (
              <>
                <DownloadPdfButton invoiceId={id} />
                <SendInvoiceButton
                  invoiceId={id}
                  status={invoice.status}
                  isApproved={true}
                  userRole={userRole || ''}
                  userId={userId}
                  createdById={invoice.created_by}
                />
              </>
            )}

            {/* 送付済み状態: PDF・入金登録ボタン */}
            {invoice.status === 'sent' && (
              <>
                {/* PDF出力: マネージャー以上のみ */}
                {['manager', 'admin', 'super_admin'].includes(userRole || '') && (
                  <DownloadPdfButton invoiceId={id} />
                )}
                {/* 入金登録: 未入金・マネージャー以上のみ */}
                {!isPaid && ['manager', 'admin', 'super_admin'].includes(userRole || '') && (
                  <Link
                    href={`/payments/new?invoice_id=${id}`}
                    className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600 text-center"
                  >
                    入金登録
                  </Link>
                )}
              </>
            )}

            {/* 入金済み状態: PDF出力のみ（マネージャー以上） */}
            {invoice.status === 'paid' && ['manager', 'admin', 'super_admin'].includes(userRole || '') && (
              <DownloadPdfButton invoiceId={id} />
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-8 print:shadow-none">
        {/* ヘッダー部分 */}
        <div className="border-b pb-6 mb-6">
          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-bold">請　求　書</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            {/* 宛先 */}
            <div>
              <div className="mb-4">
                <p className="text-lg font-bold border-b-2 border-black pb-1 mb-2">
                  {invoice.client?.name} 様
                </p>
                {invoice.client?.postal_code && (
                  <p className="text-sm text-gray-600">〒{invoice.client.postal_code}</p>
                )}
                {invoice.client?.address && (
                  <p className="text-sm text-gray-600">{invoice.client.address}</p>
                )}
                {invoice.client?.contact_person && (
                  <p className="text-sm text-gray-600">ご担当: {invoice.client.contact_person} 様</p>
                )}
              </div>
              <div className="mt-6">
                <p className="text-sm mb-2">下記のとおり請求申し上げます。</p>
                <div className="bg-blue-50 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-1">請求金額（税込）</p>
                  <p className="text-3xl font-bold">¥{invoice.total_amount.toLocaleString()}</p>
                </div>
              </div>
            </div>

            {/* 発行者情報 */}
            <div className="text-left sm:text-right">
              <div className="mb-4">
                <p className="text-xs text-gray-600 mb-1">請求番号: {invoice.invoice_number}</p>
                <p className="text-xs text-gray-600 mb-1">
                  請求日: {new Date(invoice.invoice_date).toLocaleDateString('ja-JP')}
                </p>
                <p className="text-xs text-gray-600 mb-1 font-medium">
                  支払期日: {new Date(invoice.due_date).toLocaleDateString('ja-JP')}
                </p>
              </div>

              <div className="mt-4">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(invoice.status)}`}>
                  {getStatusText(invoice.status)}
                </span>
                {isPaid && (
                  <span className="ml-2 text-green-600 font-medium text-sm">✓ 入金完了</span>
                )}
                {isPartiallyPaid && (
                  <span className="ml-2 text-yellow-600 font-medium text-sm">
                    一部入金済 (¥{invoice.paid_amount.toLocaleString()})
                  </span>
                )}
                {isOverdue && (
                  <span className="ml-2 text-red-600 font-medium text-sm">⚠ 期限超過</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 件名 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">件名</h3>
          <p className="text-lg">{invoice.title}</p>
          {invoice.project && (
            <p className="text-sm text-gray-600 mt-1">
              工事: {invoice.project.project_name} ({invoice.project.project_code})
            </p>
          )}
        </div>

        {/* 明細 */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold mb-2">明細</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="inline-block min-w-full align-middle px-4 sm:px-0">
              <table className="min-w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-t border-b">
                    <th className="text-left p-2 text-xs sm:text-sm">項目</th>
                    <th className="text-left p-2 text-xs sm:text-sm hidden sm:table-cell">説明</th>
                    <th className="text-right p-2 text-xs sm:text-sm">数量</th>
                    <th className="text-center p-2 text-xs sm:text-sm hidden md:table-cell">単位</th>
                    <th className="text-right p-2 text-xs sm:text-sm hidden lg:table-cell">単価</th>
                    <th className="text-right p-2 text-xs sm:text-sm">金額</th>
                    <th className="text-center p-2 text-xs sm:text-sm hidden md:table-cell">税率</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.billing_invoice_items?.sort((a: any, b: any) => a.display_order - b.display_order)
                    .map((item: any) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-2 text-xs sm:text-sm">{item.item_name}</td>
                      <td className="p-2 text-xs sm:text-sm text-gray-600 hidden sm:table-cell">{item.description}</td>
                      <td className="p-2 text-xs sm:text-sm text-right">{item.quantity}</td>
                      <td className="p-2 text-xs sm:text-sm text-center hidden md:table-cell">{item.unit}</td>
                      <td className="p-2 text-xs sm:text-sm text-right hidden lg:table-cell">¥{item.unit_price.toLocaleString()}</td>
                      <td className="p-2 text-xs sm:text-sm text-right font-medium">¥{item.amount.toLocaleString()}</td>
                      <td className="p-2 text-xs sm:text-sm text-center hidden md:table-cell">{item.tax_rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* 合計 */}
        <div className="flex justify-end mb-6">
          <div className="w-full sm:w-80">
            <div className="flex justify-between py-2">
              <span className="text-sm">小計:</span>
              <span className="text-sm font-medium">¥{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-sm">消費税:</span>
              <span className="text-sm font-medium">¥{invoice.tax_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-3">
              <span className="font-bold">合計:</span>
              <span className="text-xl font-bold">¥{invoice.total_amount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 備考 */}
        {invoice.notes && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold mb-2">備考</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{invoice.notes}</p>
          </div>
        )}

        {/* 社内メモ（印刷時は非表示） */}
        {invoice.internal_notes && (
          <div className="mb-6 p-4 bg-yellow-50 rounded print:hidden">
            <h3 className="text-sm font-semibold mb-2 text-yellow-800">社内メモ</h3>
            <p className="text-sm text-yellow-700 whitespace-pre-wrap">{invoice.internal_notes}</p>
          </div>
        )}

        {/* 承認情報（印刷時は非表示） */}
        {invoice.manager_approved_at && (
          <div className="mb-6 p-4 bg-green-50 rounded print:hidden">
            <h3 className="text-sm font-semibold mb-2 text-green-800">✓ 承認済み</h3>
            <div className="text-sm text-green-700">
              <p>承認者: {invoice.approved_by_user?.name}</p>
              <p>承認日時: {new Date(invoice.manager_approved_at).toLocaleString('ja-JP')}</p>
            </div>
          </div>
        )}

        {/* 操作履歴 */}
        <div className="mt-8 print:hidden">
          <h2 className="text-xl font-bold mb-4">操作履歴</h2>
          <InvoiceHistoryTimeline history={history} />
        </div>
      </div>
      </div>
    </div>
  )
}
