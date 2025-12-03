import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { ConsumableOrderWithRelations } from '@/types/consumable-orders'
import OrderDetailActions from './OrderDetailActions'

interface Props {
  params: Promise<{ id: string }>
}

export default async function ConsumableOrderDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 発注詳細取得
  const { data: order } = await supabase
    .from('consumable_orders')
    .select(`
      *,
      tools:tool_id (
        id,
        name,
        model_number,
        manufacturer
      ),
      ordered_by_user:ordered_by (
        id,
        name,
        email
      ),
      received_by_user:received_by (
        id,
        name,
        email
      )
    `)
    .eq('id', id)
    .eq('organization_id', userData.organization_id)
    .is('deleted_at', null)
    .single()

  if (!order) {
    redirect('/consumables/orders')
  }

  const orderWithRelations = order as unknown as ConsumableOrderWithRelations

  const isLeaderOrAdmin = userData.role === 'admin' || userData.role === 'leader'

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex justify-between items-start">
        <div>
          <Link
            href="/consumables/orders"
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            ← 発注一覧に戻る
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900">発注詳細</h1>
          <p className="mt-1 text-sm text-gray-600">発注番号: {orderWithRelations.order_number}</p>
        </div>
        <div className="flex space-x-3">
          {isLeaderOrAdmin && orderWithRelations.status !== '納品済み' && orderWithRelations.status !== 'キャンセル' && (
            <Link
              href={`/consumables/orders/${id}/edit`}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              編集
            </Link>
          )}
        </div>
      </div>

      {/* ステータスバッジ */}
      <div>
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            orderWithRelations.status === '発注中'
              ? 'bg-yellow-100 text-yellow-800'
              : orderWithRelations.status === '発注済み'
                ? 'bg-blue-100 text-blue-800'
                : orderWithRelations.status === '納品済み'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
          }`}
        >
          {orderWithRelations.status}
        </span>
      </div>

      {/* 発注情報 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">発注情報</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">消耗品名</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {orderWithRelations.tools?.name || '-'}
                {orderWithRelations.tools?.model_number && (
                  <span className="ml-2 text-gray-500">({orderWithRelations.tools.model_number})</span>
                )}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">発注日</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {new Date(orderWithRelations.order_date).toLocaleDateString('ja-JP')}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">納品予定日</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {orderWithRelations.expected_delivery_date
                  ? new Date(orderWithRelations.expected_delivery_date).toLocaleDateString('ja-JP')
                  : '未設定'}
              </dd>
            </div>
            {orderWithRelations.actual_delivery_date && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">実際の納品日</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {new Date(orderWithRelations.actual_delivery_date).toLocaleDateString('ja-JP')}
                </dd>
              </div>
            )}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">発注数量</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {orderWithRelations.quantity}個
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">単価</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {orderWithRelations.unit_price
                  ? `¥${orderWithRelations.unit_price.toLocaleString()}`
                  : '未設定'}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">合計金額</dt>
              <dd className="mt-1 text-sm font-semibold text-gray-900 sm:mt-0 sm:col-span-2">
                {orderWithRelations.total_price
                  ? `¥${orderWithRelations.total_price.toLocaleString()}`
                  : '未設定'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 仕入れ先情報 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">仕入れ先情報</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">仕入れ先名</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {orderWithRelations.supplier_name || '未設定'}
              </dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">連絡先</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {orderWithRelations.supplier_contact || '未設定'}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* 担当者情報 */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">担当者情報</h3>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">発注者</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {orderWithRelations.ordered_by_user?.name || '-'}
              </dd>
            </div>
            {orderWithRelations.received_by_user && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">受領者</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {orderWithRelations.received_by_user.name}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* メモ */}
      {orderWithRelations.notes && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">メモ</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{orderWithRelations.notes}</p>
          </div>
        </div>
      )}

      {/* アクションボタン */}
      {isLeaderOrAdmin && (
        <OrderDetailActions
          order={orderWithRelations}
          userId={user.id}
        />
      )}
    </div>
  )
}
