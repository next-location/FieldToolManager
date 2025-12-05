import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/work-reports/[id]/approvals - çet÷ó
export async function GET(request: NextRequest, { params }: Params) {
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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Ê¸∂¸≈1n÷ók1WW~W_' }, { status: 400 })
    }

    // çet÷ó
    const { data: approvals, error } = await supabase
      .from('work_report_approvals')
      .select('*')
      .eq('work_report_id', id)
      .eq('organization_id', userData.organization_id)
      .order('approved_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: 'çetn÷ók1WW~W_' }, { status: 500 })
    }

    return NextResponse.json(approvals || [])
  } catch (error) {
    console.error('Get approvals error:', error)
    return NextResponse.json({ error: 'çetn÷ók1WW~W_' }, { status: 500 })
  }
}
