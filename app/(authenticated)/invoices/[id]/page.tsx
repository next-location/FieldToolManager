import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function InvoiceDetail({ invoiceId }: { invoiceId: string }) {
  const supabase = await createClient()

  const { data: invoice } = await supabase
    .from('billing_invoices')
    .select(`
      *,
      client:clients(*),
      project:projects(*),
      billing_invoice_items(*)
    `)
    .eq('id', invoiceId)
    .single()

  if (!invoice) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">請求書が見つかりません</p>
      </div>
    )
  }

  const isPaid = invoice.paid_amount >= invoice.total_amount
  const isPartiallyPaid = invoice.paid_amount > 0 && !isPaid
  const isOverdue = !isPaid && new Date(invoice.due_date) < new Date()

  return (
    <div>
      {/* ステータスバー */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              invoice.status === 'draft'
                ? 'bg-gray-100 text-gray-800'
                : invoice.status === 'approved'
                ? 'bg-blue-100 text-blue-800'
                : invoice.status === 'sent'
                ? 'bg-purple-100 text-purple-800'
                : invoice.status === 'paid'
                ? 'bg-green-100 text-green-800'
                : isOverdue
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {invoice.status === 'draft' ? '下書き'
                : invoice.status === 'approved' ? '承認済'
                : invoice.status === 'sent' ? '送付済'
                : invoice.status === 'paid' ? '入金済'
                : isOverdue ? '期限超過'
                : invoice.status}
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

          <div className="flex space-x-2">
            {invoice.status === 'draft' && (
              <Link
                href={`/invoices/${invoiceId}/edit`}
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
              >
                編集
              </Link>
            )}
            <button className="bg-green-500 text-white px-4 py-2 rounded-md text-sm hover:bg-green-600">
              PDF出力
            </button>
            <button className="bg-purple-500 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-600">
              メール送信
            </button>
            {!isPaid && (
              <Link
                href={`/payments/new?invoice_id=${invoiceId}`}
                className="bg-indigo-500 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-600"
              >
                入金登録
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 請求書本体（印刷用レイアウト） */}
      <div className="bg-white shadow-sm rounded-lg p-8 print:shadow-none">
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

              <div className="mt-8 text-left border-t pt-4">
                <p className="font-bold mb-2">株式会社〇〇建設</p>
                <p className="text-sm">〒123-4567</p>
                <p className="text-sm">東京都〇〇区〇〇町1-2-3</p>
                <p className="text-sm">TEL: 03-1234-5678</p>
                {invoice.is_qualified_invoice && invoice.invoice_registration_number && (
                  <p className="text-sm mt-2">
                    登録番号: {invoice.invoice_registration_number}
                  </p>
                )}
              </div>
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
                  <td colSpan={5} className="text-right py-2">消費税（10%）</td>
                  <td className="text-right py-2">¥{invoice.tax_amount.toLocaleString()}</td>
                </tr>
                <tr className="border-t-2 border-gray-800">
                  <td colSpan={5} className="text-right py-2 text-lg font-bold">合計</td>
                  <td className="text-right py-2 text-lg font-bold">¥{invoice.total_amount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 振込先 */}
          <div className="mb-8">
            <h2 className="text-lg font-bold border-b-2 border-gray-300 pb-2 mb-4">お振込先</h2>
            <div className="bg-gray-50 p-4 rounded">
              <p>〇〇銀行 〇〇支店 普通預金 1234567</p>
              <p>カ）〇〇ケンセツ</p>
            </div>
          </div>

          {/* 備考 */}
          {invoice.notes && (
            <div className="mb-8">
              <h2 className="text-lg font-bold border-b-2 border-gray-300 pb-2 mb-4">備考</h2>
              <p className="whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* 適格請求書の記載事項 */}
          {invoice.is_qualified_invoice && (
            <div className="mt-8 pt-4 border-t text-sm text-gray-600">
              <p>※この請求書は適格請求書の記載事項を満たしています。</p>
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
    </div>
  )
}

export default async function InvoiceDetailPage({
  params
}: {
  params: { id: string }
}) {
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
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">請求書詳細</h1>
        </div>
        <Link
          href="/invoices"
          className="text-blue-600 hover:text-blue-800"
        >
          ← 請求書一覧に戻る
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <InvoiceDetail invoiceId={params.id} />
      </Suspense>
    </div>
  )
}