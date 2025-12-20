import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // マネージャー・管理者のみ承認待ち件数を取得
    if (!['manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ count: 0 })
    }

    // 承認申請中の発注書を取得
    const { data: submittedOrders, error: ordersError } = await supabase
      .from('purchase_orders')
      .select('id')
      .eq('organization_id', userData.organization_id)
      .eq('status', 'submitted')
      .is('deleted_at', null)

    if (ordersError) {
      console.error('Error fetching submitted purchase orders:', ordersError)
      return NextResponse.json({ error: ordersError.message }, { status: 500 })
    }

    const count = submittedOrders?.length || 0

    return NextResponse.json({ count })
  } catch (error) {
    console.error('Error in GET /api/purchase-orders/pending-count:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
