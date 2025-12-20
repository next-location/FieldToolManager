import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  // リーダー以上のみアクセス可能
  if (!['leader', 'manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
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
    .eq('organization_id', userData?.organization_id)
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
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold mb-2">請求書詳細</h1>
          <p className="text-gray-600">{invoice.invoice_number}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* 下書き状態: 編集・提出が可能 */}
          {invoice.status === 'draft' && (
            <>
              <Link
                href={`/invoices/${id}/edit`}
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
              >
                編集
              </Link>
              <SubmitInvoiceButton invoiceId={id} />
            </>
          )}

          {/* 提出済み状態: 承認・差し戻しボタン（manager/admin のみ） */}
          {invoice.status === 'submitted' && (
            <>
              <ApproveInvoiceButton invoiceId={id} userRole={userData?.role || ''} />
              <ReturnInvoiceButton invoiceId={id} userRole={userData?.role || ''} />
            </>
          )}

          {/* 承認済み状態: 送付ボタン・PDF出力 */}
          {invoice.status === 'approved' && (
            <>
              <SendInvoiceButton
                invoiceId={id}
                status={invoice.status}
                isApproved={true}
                userRole={userData?.role || ''}
                userId={user.id}
                createdById={invoice.created_by}
              />
              <DownloadPdfButton invoiceId={id} />
            </>
          )}

          {/* 送付済み状態: 入金登録・PDFボタンの順（入金登録を先に配置） */}
          {invoice.status === 'sent' && (
            <>
              {/* 入金登録: 未入金・マネージャー以上のみ */}
              {!isPaid && ['manager', 'admin', 'super_admin'].includes(userData?.role || '') && (
                <Link
                  href={`/payments/new?invoice_id=${id}`}
                  className="bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600"
                >
                  入金登録
                </Link>
              )}
              {/* PDF出力: マネージャー以上のみ */}
              {['manager', 'admin', 'super_admin'].includes(userData?.role || '') && (
                <DownloadPdfButton invoiceId={id} />
              )}
            </>
          )}

          {/* 入金済み状態: PDF出力のみ（マネージャー以上） */}
          {invoice.status === 'paid' && ['manager', 'admin', 'super_admin'].includes(userData?.role || '') && (
            <DownloadPdfButton invoiceId={id} />
          )}

          {/* 一覧に戻るボタン（常に表示・最後に配置） */}
          <Link
            href="/invoices"
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
          >
            一覧に戻る
          </Link>
        </div>
      </div>

      {/* ステータス表示 */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-4">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusBadge(invoice.status)}`}>
            {getStatusText(invoice.status)}
          </span>

          {isPaid ? (
            <span className="text-green-600 font-medium">✓ 入金完了</span>
          ) : isPartiallyPaid ? (
            <span className="text-yellow-600 font-medium">
              一部入金済 (¥{invoice.paid_amount.toLocaleString()} / ¥{invoice.total_amount.toLocaleString()})
            </span>
          ) : isOverdue ? (
            <span className="text-red-600 font-medium">⚠ 支払期限超過</span>
          ) : (
            <span className="text-gray-500">未入金</span>
          )}
        </div>
      </div>

      {/* 請求書本体 */}
      <div className="bg-white shadow-sm rounded-lg p-8 print:shadow-none mb-6">
        <div className="border-2 border-gray-300 p-8 print:border-gray-800">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">請 求 書</h1>
            <p className="text-sm text-gray-600">Invoice</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* 宛先 */}
            <div>
              <div className="border-b-2 border-gray-800 pb-2 mb-4">
                <p className="text-lg font-bold">{invoice.client?.name || '取引先名'} 御中</p>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                下記の通りご請求申し上げます。
              </p>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm mb-2">ご請求金額</p>
                <p className="text-3xl font-bold">¥{invoice.total_amount.toLocaleString()}</p>
              </div>
            </div>

            {/* 発行者情報 */}
            <div className="text-right">
              <p className="mb-2">請求番号: {invoice.invoice_number}</p>
              <p className="mb-2">請求日: {new Date(invoice.invoice_date).toLocaleDateString('ja-JP')}</p>
              <p className="mb-2 font-medium">支払期日: {new Date(invoice.due_date).toLocaleDateString('ja-JP')}</p>
            </div>
          </div>

          {/* 件名 */}
          <div className="mb-8">
            <h2 className="text-lg font-bold border-b-2 border-gray-300 pb-2 mb-4">件名</h2>
            <p className="text-lg">{invoice.title}</p>
          </div>

          {/* 明細 */}
          <div className="mb-8">
            <h2 className="text-lg font-bold border-b-2 border-gray-300 pb-2 mb-4">明細</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2">項目</th>
                  <th className="text-left py-2">説明</th>
                  <th className="text-right py-2">数量</th>
                  <th className="text-left py-2">単位</th>
                  <th className="text-right py-2">単価</th>
                  <th className="text-right py-2">金額</th>
                </tr>
              </thead>
              <tbody>
                {invoice.billing_invoice_items?.sort((a: any, b: any) => a.display_order - b.display_order).map((item: any) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.item_name}</td>
                    <td className="py-2 text-gray-600 text-sm">{item.description}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="py-2">{item.unit}</td>
                    <td className="text-right py-2">¥{item.unit_price.toLocaleString()}</td>
                    <td className="text-right py-2">¥{item.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-300">
                  <td colSpan={5} className="text-right py-2 font-medium">小計</td>
                  <td className="text-right py-2 font-medium">¥{invoice.subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="text-right py-2">消費税</td>
                  <td className="text-right py-2">¥{invoice.tax_amount.toLocaleString()}</td>
                </tr>
                <tr className="border-t-2 border-gray-800">
                  <td colSpan={5} className="text-right py-2 text-lg font-bold">合計</td>
                  <td className="text-right py-2 text-lg font-bold">¥{invoice.total_amount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 備考 */}
          {invoice.notes && (
            <div className="mb-8">
              <h2 className="text-lg font-bold border-b-2 border-gray-300 pb-2 mb-4">備考</h2>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}
        </div>

        {/* 社内メモ（印刷時は非表示） */}
        {invoice.internal_notes && (
          <div className="mt-6 p-4 bg-yellow-50 rounded print:hidden">
            <h3 className="font-semibold mb-2">社内メモ</h3>
            <p className="text-sm whitespace-pre-wrap">{invoice.internal_notes}</p>
          </div>
        )}
      </div>

      {/* 操作履歴 */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-xl font-bold mb-4">操作履歴</h2>
        <InvoiceHistoryTimeline history={history} />
      </div>
      </div>
    </div>
  )
}
