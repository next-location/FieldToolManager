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
    const sortField = searchParams.get('sort_field') || 'invoice_date'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    let query = supabase
      .from('billing_invoices')
      .select(
        `
        *,
        client:clients(id, name),
        project:projects(id, project_name),
        created_by_user:users!billing_invoices_created_by_fkey(name),
        approved_by_user:users!billing_invoices_manager_approved_by_fkey(name)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    if (search) {
      query = query.or(
        `invoice_number.ilike.%${search}%,title.ilike.%${search}%`
      )
    }

    if (status) {
      query = query.eq('status', status)
    }

    // ソート順を適用
    const validSortFields = ['invoice_date', 'due_date', 'total_amount']
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'invoice_date'
    const ascending = sortOrder === 'asc'

    const { data, error, count } = await query
      .order(finalSortField, { ascending })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching invoices:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data,
      count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in GET /api/invoices:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
