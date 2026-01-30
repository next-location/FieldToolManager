import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createPurchaseOrderHistory } from '@/lib/purchase-order-history'
import { logPurchaseOrderCreated } from '@/lib/audit-log'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

// GET /api/purchase-orders - 発注書一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const clientId = searchParams.get('client_id')
    const projectId = searchParams.get('project_id')
    const creatorId = searchParams.get('creator_id')
    const search = searchParams.get('search')
    const sortField = searchParams.get('sort_field') || 'order_date'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    // 発注書一覧取得（client情報も含む）
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        client:clients!purchase_orders_client_id_fkey(id, name, client_code),
        project:projects(id, project_name),
        created_by_user:users!purchase_orders_created_by_fkey(id, name),
        approved_by_user:users!purchase_orders_approved_by_fkey(id, name)
      `, { count: 'exact' })
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)

    // リーダーは自分が作成した発注書のみ表示
    if (userData.role === 'leader') {
      query = query.eq('created_by', user.id)
    }

    // フィルター適用
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    if (creatorId) {
      query = query.eq('created_by', creatorId)
    }

    if (search) {
      query = query.or(
        `order_number.ilike.%${search}%,notes.ilike.%${search}%`
      )
    }

    // ソート順を適用（同じ日付の場合はcreated_atでもソート）
    const validSortFields = ['order_date', 'delivery_date', 'total_amount']
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'order_date'
    const ascending = sortOrder === 'asc'

    const { data: orders, error, count } = await query
      .order(finalSortField, { ascending })
      .order('created_at', { ascending: false }) // 同じ日付の場合は新しいものを上に
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching purchase orders:', error)
      return NextResponse.json({ error: '発注書の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      data: orders,
      count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// POST /api/purchase-orders - 発注書作成
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // ユーザー情報取得（name含む）
    const { data: userDataWithName } = await supabase
      .from('users')
      .select('organization_id, role, name')
      .eq('id', user.id)
      .single()

    if (!userDataWithName) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { status = 'draft' } = body

    // 必須項目チェック
    if (!body.client_id || !body.order_date) {
      return NextResponse.json(
        { error: '仕入先と発注日は必須です' },
        { status: 400 }
      )
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { error: '明細を1件以上追加してください' },
        { status: 400 }
      )
    }

    // 不審なパターン検出（発注書本体）
    const textFields = [
      { field: 'delivery_location', value: body.delivery_location, label: '納品場所' },
      { field: 'payment_terms', value: body.payment_terms, label: '支払条件' },
      { field: 'notes', value: body.notes, label: '備考' },
      { field: 'internal_memo', value: body.internal_memo, label: '社内メモ' },
    ]

    for (const { value, label } of textFields) {
      if (value && hasSuspiciousPattern(value)) {
        return NextResponse.json(
          { error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` },
          { status: 400 }
        )
      }
    }

    // 明細の不審パターン検出
    for (let i = 0; i < body.items.length; i++) {
      const item = body.items[i]
      if (item.item_name && hasSuspiciousPattern(item.item_name)) {
        return NextResponse.json(
          { error: `明細行${i + 1}の品名に不正な文字列が含まれています` },
          { status: 400 }
        )
      }
      if (item.description && hasSuspiciousPattern(item.description)) {
        return NextResponse.json(
          { error: `明細行${i + 1}の説明に不正な文字列が含まれています` },
          { status: 400 }
        )
      }
    }

    // 役割に応じたステータスを決定
    let purchaseOrderStatus = status
    if (status === 'submitted') {
      if (['manager', 'admin', 'super_admin'].includes(userDataWithName?.role || '')) {
        purchaseOrderStatus = 'approved' // マネージャー以上は即承認
      }
    }

    // 発注番号生成（PO-YYYYMMDD-001形式）
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
    const { data: existingOrders } = await supabase
      .from('purchase_orders')
      .select('order_number')
      .eq('organization_id', userDataWithName.organization_id)
      .like('order_number', `PO-${today}-%`)
      .order('order_number', { ascending: false })
      .limit(1)

    let newOrderNumber = `PO-${today}-001`
    if (existingOrders && existingOrders.length > 0) {
      const lastNumber = parseInt(existingOrders[0].order_number.split('-')[2])
      newOrderNumber = `PO-${today}-${String(lastNumber + 1).padStart(3, '0')}`
    }

    // 金額計算とHTMLエスケープ（明細）
    let subtotal = 0
    let taxAmount = 0
    const items = body.items.map((item: any, index: number) => {
      const amount = item.quantity * item.unit_price
      const itemTax = amount * (item.tax_rate / 100)
      subtotal += amount
      taxAmount += itemTax
      return {
        ...item,
        item_name: escapeHtml(item.item_name),
        description: item.description ? escapeHtml(item.description) : null,
        display_order: index + 1,
        amount,
      }
    })

    const totalAmount = subtotal + taxAmount

    // 発注書作成（HTMLエスケープ適用）
    const { data: order, error: orderError } = await supabase
      .from('purchase_orders')
      .insert({
        organization_id: userDataWithName.organization_id,
        order_number: newOrderNumber,
        client_id: body.client_id,
        project_id: body.project_id || null,
        order_date: body.order_date,
        delivery_date: body.delivery_date || null,
        delivery_location: body.delivery_location ? escapeHtml(body.delivery_location) : null,
        payment_terms: body.payment_terms ? escapeHtml(body.payment_terms) : null,
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: purchaseOrderStatus,
        notes: body.notes ? escapeHtml(body.notes) : null,
        internal_memo: body.internal_memo ? escapeHtml(body.internal_memo) : null,
        created_by: user.id,
        // マネージャー以上の場合は承認情報も設定
        ...(purchaseOrderStatus === 'approved' && {
          approved_at: new Date().toISOString(),
          approved_by: user.id
        })
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating purchase order:', orderError)
      return NextResponse.json({ error: '発注書の作成に失敗しました' }, { status: 500 })
    }

    // 明細作成
    const itemsToInsert = items.map((item: any) => ({
      purchase_order_id: order.id,
      display_order: item.display_order,
      item_type: item.item_type,
      item_code: item.item_code || null,
      item_name: item.item_name,
      description: item.description || null,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price,
      amount: item.amount,
      tax_rate: item.tax_rate,
    }))

    const { error: itemsError } = await supabase
      .from('purchase_order_items')
      .insert(itemsToInsert)

    if (itemsError) {
      console.error('Error creating purchase order items:', itemsError)
      // 発注書をロールバック
      await supabase.from('purchase_orders').delete().eq('id', order.id)
      return NextResponse.json({ error: '明細の作成に失敗しました' }, { status: 500 })
    }

    // 履歴記録（請求書と同じロジック）
    const actionType = status === 'draft' ? 'draft_saved' : (purchaseOrderStatus === 'approved' ? 'approved' : 'submitted')
    await createPurchaseOrderHistory({
      purchaseOrderId: order.id,
      organizationId: userDataWithName.organization_id,
      actionType,
      performedBy: user.id,
      performedByName: userDataWithName.name,
      notes: status === 'draft' ? '発注書を下書きとして保存しました' :
             purchaseOrderStatus === 'approved' ? '発注書を作成し承認しました' :
             '発注書を作成し提出しました'
    })

    // 監査ログ記録
    await logPurchaseOrderCreated(order.id, {
      order_number: newOrderNumber,
      client_id: body.client_id,
      project_id: body.project_id,
      status: purchaseOrderStatus,
      total_amount: totalAmount,
      items_count: items.length
    }, user.id, userDataWithName.organization_id)

    return NextResponse.json({ data: order }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
