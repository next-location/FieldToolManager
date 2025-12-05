import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ id: string }>
}

// POST /api/work-reports/[id]/approve - \m1J¯nç/t
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // ç<¡ß√Ø
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'ç<L≈ÅgY' }, { status: 401 })
    }

    // Ê¸∂¸≈1÷ó
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role, name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Ê¸∂¸≈1n÷ók1WW~W_' }, { status: 400 })
    }

    // leader ~_o admin nçÔ˝
    if (userData.role !== 'leader' && userData.role !== 'admin') {
      return NextResponse.json({ error: 'ç)PLBä~[ì' }, { status: 403 })
    }

    // ÍØ®π»‹«£n÷ó
    const body = await request.json()
    const { action, comment } = body // action: 'approved' | 'rejected'

    if (!action || (action !== 'approved' && action !== 'rejected')) {
      return NextResponse.json({ error: '¢Ø∑ÁÛL!πgY' }, { status: 400 })
    }

    // \m1J¯÷ó
    const { data: report, error: reportError } = await supabase
      .from('work_reports')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: '\m1J¯LãdKä~[ì' }, { status: 404 })
    }

    // π∆¸øπ¡ß√Ø–˙n1J¯nçÔ˝	
    if (report.status !== 'submitted') {
      return NextResponse.json(
        { error: '–˙n1J¯nçgM~Y' },
        { status: 400 }
      )
    }

    // »ÈÛ∂Ø∑ÁÛãÀ
    // 1. 1J¯nπ∆¸øπíÙ∞
    const newStatus = action === 'approved' ? 'approved' : 'rejected'
    const { error: updateError } = await supabase
      .from('work_reports')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: '1J¯nπ∆¸øπÙ∞k1WW~W_' },
        { status: 500 }
      )
    }

    // 2. çetí\
    const { error: approvalError } = await supabase.from('work_report_approvals').insert({
      organization_id: userData.organization_id,
      work_report_id: id,
      approver_id: user.id,
      approver_name: userData.name,
      action,
      comment: comment || null,
    })

    if (approvalError) {
      // Ì¸Î–√Ø: 1J¯nπ∆¸øπíCk;Y
      await supabase
        .from('work_reports')
        .update({
          status: 'submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      return NextResponse.json(
        { error: 'çetn\k1WW~W_' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: action === 'approved' ? 'çW~W_' : 'tW~W_',
      status: newStatus,
    })
  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json({ error: 'çÊk1WW~W_' }, { status: 500 })
  }
}
