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

    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const clientId = searchParams.get('client_id') || ''
    const projectId = searchParams.get('project_id') || ''

    let query = supabase
      .from('estimates')
      .select(
        `
        *,
        client:clients(id, name, client_code),
        project:projects(id, project_name, project_code)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', userData.organization_id)

    if (search) {
      query = query.or(
        `estimate_number.ilike.%${search}%,title.ilike.%${search}%`
      )
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error, count } = await query
      .order('estimate_date', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching estimates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in GET /api/estimates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()

    console.log('[見積書作成API] リクエストボディ:', JSON.stringify(body, null, 2))
    console.log('[見積書作成API] 明細データ:', JSON.stringify(body.items, null, 2))

    // 見積書本体を作成
    const { data: estimate, error: estimateError } = await supabase
      .from('estimates')
      .insert({
        organization_id: userData.organization_id,
        estimate_number: body.estimate_number,
        client_id: body.client_id || null,
        project_id: body.project_id || null,
        estimate_date: body.estimate_date,
        valid_until: body.valid_until || null,
        title: body.title,
        subtotal: body.subtotal,
        tax_amount: body.tax_amount,
        total_amount: body.total_amount,
        status: body.status || 'draft',
        notes: body.notes || null,
        internal_notes: body.internal_notes || null,
        created_by: user.id,
      })
      .select()
      .single()

    if (estimateError) {
      console.error('Error creating estimate:', estimateError)
      return NextResponse.json(
        { error: '見積書の作成に失敗しました' },
        { status: 500 }
      )
    }

    // 見積明細を作成
    if (body.items && body.items.length > 0) {
      const items = body.items.map((item: any) => ({
        estimate_id: estimate.id,
        display_order: item.display_order,
        item_type: item.item_type,
        custom_type: item.custom_type || null,
        item_name: item.item_name,
        description: item.description || null,
        quantity: item.quantity,
        unit: item.unit,
        custom_unit: item.custom_unit || null,
        unit_price: item.unit_price,
        amount: item.amount,
        tax_rate: item.tax_rate,
      }))

      const { error: itemsError } = await supabase
        .from('estimate_items')
        .insert(items)

      if (itemsError) {
        console.error('Error creating estimate items:', itemsError)
        // 見積書本体を削除してロールバック
        await supabase.from('estimates').delete().eq('id', estimate.id)
        return NextResponse.json(
          { error: '見積明細の作成に失敗しました' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ data: estimate }, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/estimates:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
