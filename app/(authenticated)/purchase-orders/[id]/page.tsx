import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

async function PurchaseOrderDetail({ orderId }: { orderId: string }) {
  const supabase = await createClient()

  const { data: order } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      supplier:clients(*),
      project:projects(*),
      purchase_order_items(*)
    `)
    .eq('id', orderId)
    .single()

  if (!order) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">発注書が見つかりません</p>
      </div>
    )
  }

  const isPaid = order.paid_amount >= order.total_amount
  const isPartiallyPaid = order.paid_amount > 0 && !isPaid
  const isOverdue = order.status === 'delivered' && !isPaid && new Date(order.delivery_date) < new Date()

  return (
    <div>
      {/* ステータスバー */}
      <div className="bg-white shadow-sm rounded-lg p-4 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              order.status === 'draft'
                ? 'bg-gray-100 text-gray-800'
                : order.status === 'approved'
                ? 'bg-blue-100 text-blue-800'
                : order.status === 'ordered'
                ? 'bg-purple-100 text-purple-800'
                : order.status === 'delivered'
                ? 'bg-green-100 text-green-800'
                : order.status === 'paid'
                ? 'bg-green-100 text-green-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {order.status === 'draft' ? '下書き'
                : order.status === 'approved' ? '承認済'
                : order.status === 'ordered' ? '発注済'
                : order.status === 'delivered' ? '納品済'
                : order.status === 'paid' ? '支払済'
                : order.status}
            </span>

            {isPaid ? (
              <span className="text-green-600 font-medium">✓ 支払完了</span>
            ) : isPartiallyPaid ? (
              <span className="text-yellow-600 font-medium">
                一部支払済 (¥{order.paid_amount.toLocaleString()} / ¥{order.total_amount.toLocaleString()})
              </span>
            ) : isOverdue ? (
              <span className="text-red-600 font-medium">⚠ 支払期限超過</span>
            ) : (
              <span className="text-gray-500">未払い</span>
            )}
          </div>

          <div className="flex space-x-2">
            {order.status === 'draft' && (
              <Link
                href={`/purchase-orders/${orderId}/edit`}
                className="bg-blue-500 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-600"
              >
                編集
              </Link>
            )}
            <button className="bg-green-500 text-white px-4 py-2 rounded-md text-sm hover:bg-green-600">
              PDF出力
            </button>
            {order.status === 'approved' && (
              <button className="bg-purple-500 text-white px-4 py-2 rounded-md text-sm hover:bg-purple-600">
                発注実行
              </button>
            )}
            {order.status === 'ordered' && (
              <button className="bg-green-500 text-white px-4 py-2 rounded-md text-sm hover:bg-green-600">
                納品確認
              </button>
            )}
            {!isPaid && order.status === 'delivered' && (
              <Link
                href={`/payments/new?type=payment&purchase_order_id=${orderId}`}
                className="bg-indigo-500 text-white px-4 py-2 rounded-md text-sm hover:bg-indigo-600"
              >
                支払登録
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* 発注書本体（印刷用レイアウト） */}
      <div className="bg-white shadow-sm rounded-lg p-8 print:shadow-none">
        <div className="border-2 border-gray-300 p-8 print:border-gray-800">
          {/* ヘッダー */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">発 注 書</h1>
            <p className="text-sm text-gray-600">Purchase Order</p>
          </div>

          <div className="grid grid-cols-2 gap-8 mb-8">
            {/* 宛先 */}
            <div>
              <div className="border-b-2 border-gray-800 pb-2 mb-4">
                <p className="text-lg font-bold">{order.supplier?.name || '仕入先名'} 御中</p>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                下記の通り発注いたします。
              </p>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-sm mb-2">発注金額</p>
                <p className="text-3xl font-bold">¥{order.total_amount.toLocaleString()}</p>
              </div>
            </div>

            {/* 発注者情報 */}
            <div className="text-right">
              <p className="mb-2">発注番号: {order.order_number}</p>
              <p className="mb-2">発注日: {new Date(order.order_date).toLocaleDateString('ja-JP')}</p>
              <p className="mb-2 font-medium text-red-600">希望納期: {new Date(order.delivery_date).toLocaleDateString('ja-JP')}</p>

              <div className="mt-8 text-left border-t pt-4">
                <p className="font-bold mb-2">株式会社〇〇建設</p>
                <p className="text-sm">〒123-4567</p>
                <p className="text-sm">東京都〇〇区〇〇町1-2-3</p>
                <p className="text-sm">TEL: 03-1234-5678</p>
                <p className="text-sm">FAX: 03-1234-5679</p>
              </div>
            </div>
          </div>

          {/* 工事情報 */}
          {order.project && (
            <div className="mb-8">
              <h2 className="text-lg font-bold border-b-2 border-gray-300 pb-2 mb-4">工事情報</h2>
              <p className="text-lg mb-2">工事名: {order.project.project_name}</p>
              {order.delivery_location && (
                <p className="text-sm text-gray-600">納品場所: {order.delivery_location}</p>
              )}
            </div>
          )}

          {/* 明細 */}
          <div className="mb-8">
            <h2 className="text-lg font-bold border-b-2 border-gray-300 pb-2 mb-4">発注明細</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-2">品名</th>
                  <th className="text-left py-2">仕様・規格</th>
                  <th className="text-right py-2">数量</th>
                  <th className="text-left py-2">単位</th>
                  <th className="text-right py-2">単価</th>
                  <th className="text-right py-2">金額</th>
                </tr>
              </thead>
              <tbody>
                {order.purchase_order_items?.sort((a: any, b: any) => a.display_order - b.display_order).map((item: any) => (
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
                  <td className="text-right py-2 font-medium">¥{order.subtotal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td colSpan={5} className="text-right py-2">消費税（10%）</td>
                  <td className="text-right py-2">¥{order.tax_amount.toLocaleString()}</td>
                </tr>
                <tr className="border-t-2 border-gray-800">
                  <td colSpan={5} className="text-right py-2 text-lg font-bold">合計</td>
                  <td className="text-right py-2 text-lg font-bold">¥{order.total_amount.toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 支払条件 */}
          {order.payment_terms && (
            <div className="mb-8">
              <h2 className="text-lg font-bold border-b-2 border-gray-300 pb-2 mb-4">支払条件</h2>
              <p>{order.payment_terms}</p>
            </div>
          )}

          {/* 備考 */}
          {order.notes && (
            <div className="mb-8">
              <h2 className="text-lg font-bold border-b-2 border-gray-300 pb-2 mb-4">備考</h2>
              <p className="whitespace-pre-wrap">{order.notes}</p>
            </div>
          )}

          {/* 注意事項 */}
          <div className="mt-8 pt-4 border-t text-sm text-gray-600">
            <p>※ 納品書と併せて請求書をご送付ください。</p>
            <p>※ 納期に遅延が生じる場合は、事前にご連絡ください。</p>
          </div>
        </div>

        {/* 社内メモ（印刷時は非表示） */}
        {order.internal_notes && (
          <div className="mt-6 p-4 bg-yellow-50 rounded print:hidden">
            <h3 className="font-semibold mb-2">社内メモ</h3>
            <p className="text-sm whitespace-pre-wrap">{order.internal_notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default async function PurchaseOrderDetailPage({
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
    .select('role')
    .eq('id', user.id)
    .single()

  // 管理者のみアクセス可能
  if (!['manager', 'admin', 'super_admin'].includes(userData?.role || '')) {
    redirect('/')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">発注書詳細</h1>
        </div>
        <Link
          href="/purchase-orders"
          className="text-blue-600 hover:text-blue-800"
        >
          ← 発注書一覧に戻る
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        }
      >
        <PurchaseOrderDetail orderId={id} />
      </Suspense>
    </div>
  )
}