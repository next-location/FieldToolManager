import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/work-reports/[id]/approvals - 承認履歴取得
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 400 })
    }

    // 承認履歴取得
    const { data: approvals, error } = await supabase
      .from('work_report_approvals')
      .select('*')
      .eq('work_report_id', id)
      .eq('organization_id', userData.organization_id)
      .order('approved_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: '承認履歴の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json(approvals || [])
  } catch (error) {
    console.error('Get approvals error:', error)
    return NextResponse.json({ error: '承認履歴の取得に失敗しました' }, { status: 500 })
  }
}
