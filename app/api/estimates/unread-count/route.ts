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

    // マネージャー・管理者のみ未読数を取得
    if (!['manager', 'admin', 'super_admin'].includes(userData.role)) {
      return NextResponse.json({ unreadCount: 0 })
    }

    // 提出済み見積もりを取得
    const { data: submittedEstimates, error: estimatesError } = await supabase
      .from('estimates')
      .select('id')
      .eq('organization_id', userData.organization_id)
      .eq('status', 'submitted')

    if (estimatesError) {
      console.error('Error fetching submitted estimates:', estimatesError)
      return NextResponse.json({ error: estimatesError.message }, { status: 500 })
    }

    if (!submittedEstimates || submittedEstimates.length === 0) {
      return NextResponse.json({ unreadCount: 0 })
    }

    const estimateIds = submittedEstimates.map(e => e.id)

    // このユーザーが既読した見積もりIDを取得
    const { data: readEstimates, error: readsError } = await supabase
      .from('estimate_reads')
      .select('estimate_id')
      .eq('user_id', user.id)
      .in('estimate_id', estimateIds)

    if (readsError) {
      console.error('Error fetching estimate reads:', readsError)
      return NextResponse.json({ error: readsError.message }, { status: 500 })
    }

    const readEstimateIds = new Set(readEstimates?.map(r => r.estimate_id) || [])
    const unreadCount = submittedEstimates.filter(e => !readEstimateIds.has(e.id)).length

    return NextResponse.json({ unreadCount })
  } catch (error) {
    console.error('Error in GET /api/estimates/unread-count:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
