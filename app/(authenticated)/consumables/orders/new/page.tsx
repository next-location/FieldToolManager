import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ConsumableOrderForm from './ConsumableOrderForm'

export default async function NewConsumableOrderPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ユーザー情報と組織IDを取得
  const { data: userData } = await supabase
    .from('users')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (!userData) {
    redirect('/login')
  }

  // 消耗品（is_consumable=true）の道具マスタ一覧を取得
  const { data: consumables } = await supabase
    .from('tools')
    .select('id, name, model_number, manufacturer')
    .eq('organization_id', userData?.organization_id)
    .eq('is_consumable', true)
    .is('deleted_at', null)
    .order('name')

  // 最後の発注番号を取得して次の番号を生成
  const { data: lastOrder } = await supabase
    .from('consumable_orders')
    .select('order_number')
    .eq('organization_id', userData?.organization_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // 発注番号の生成（例: ORD-20250104-0001）
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '')
  let nextNumber = 1

  if (lastOrder?.order_number) {
    const match = lastOrder.order_number.match(/-(\d+)$/)
    if (match) {
      nextNumber = parseInt(match[1], 10) + 1
    }
  }

  const suggestedOrderNumber = `ORD-${today}-${String(nextNumber).padStart(4, '0')}`

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">新規発注登録</h1>
        <p className="mt-1 text-sm text-gray-600">
          消耗品の発注情報を登録します
        </p>
      </div>

      <ConsumableOrderForm
        consumables={consumables || []}
        suggestedOrderNumber={suggestedOrderNumber}
      />
    </div>
  )
}
