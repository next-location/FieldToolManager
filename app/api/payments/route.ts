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

    // 管理者・マネージャーのみアクセス可能
    if (!['admin', 'super_admin', 'manager'].includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''
    const paymentType = searchParams.get('payment_type') || ''
    const paymentMethod = searchParams.get('payment_method') || ''
    const startDate = searchParams.get('start_date') || ''
    const endDate = searchParams.get('end_date') || ''
    const year = searchParams.get('year') || ''
    const month = searchParams.get('month') || ''
    const useMonthFilter = searchParams.get('use_month_filter') === 'true'
    const sortField = searchParams.get('sort_field') || 'payment_date'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    let query = supabase
      .from('payments')
      .select(`
        *,
        invoice:billing_invoices(invoice_number, client:clients(name)),
        purchase_order:purchase_orders(order_number, supplier:clients!purchase_orders_client_id_fkey(name))
      `, { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    // 検索フィルタ
    if (search) {
      query = query.or(
        `invoice.invoice_number.ilike.%${search}%,purchase_order.order_number.ilike.%${search}%`
      )
    }

    // 入出金タイプフィルタ
    if (paymentType && paymentType !== 'all') {
      query = query.eq('payment_type', paymentType)
    }

    // 支払方法フィルタ
    if (paymentMethod && paymentMethod !== 'all') {
      query = query.eq('payment_method', paymentMethod)
    }

    // 日付フィルタ
    if (useMonthFilter && year && month) {
      // 月単位フィルタ
      const yearNum = parseInt(year)
      const monthNum = parseInt(month)
      const startOfMonth = new Date(yearNum, monthNum - 1, 1).toISOString().split('T')[0]
      const endOfMonth = new Date(yearNum, monthNum, 0).toISOString().split('T')[0]
      query = query.gte('payment_date', startOfMonth).lte('payment_date', endOfMonth)
    } else if (!useMonthFilter) {
      // 期間指定フィルタ
      if (startDate) {
        query = query.gte('payment_date', startDate)
      }
      if (endDate) {
        query = query.lte('payment_date', endDate)
      }
    }

    // ソート順を適用
    const validSortFields = ['payment_date', 'amount']
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'payment_date'
    const ascending = sortOrder === 'asc'

    const { data, error, count } = await query
      .order(finalSortField, { ascending })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching payments:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in GET /api/payments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
