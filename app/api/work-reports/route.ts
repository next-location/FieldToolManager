import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { WorkReportFilter } from '@/types/work-reports'

// GET /api/work-reports - 作業報告書一覧取得
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
    const page = parseInt(searchParams.get('page') || '1')
    const per_page = parseInt(searchParams.get('per_page') || '20')
    const offset = (page - 1) * per_page

    // フィルター
    const filters: WorkReportFilter = {
      date_from: searchParams.get('date_from') || undefined,
      date_to: searchParams.get('date_to') || undefined,
      site_id: searchParams.get('site_id') || undefined,
      status: (searchParams.get('status') as any) || undefined,
      search: searchParams.get('search') || undefined,
    }

    // クエリ構築
    let query = supabase
      .from('work_reports')
      .select(
        `
        *,
        site:sites(id, name),
        created_by_user:users!work_reports_created_by_fkey(id, name, email)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    // フィルター適用
    if (filters.date_from) {
      query = query.gte('report_date', filters.date_from)
    }
    if (filters.date_to) {
      query = query.lte('report_date', filters.date_to)
    }
    if (filters.site_id) {
      query = query.eq('site_id', filters.site_id)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.search) {
      query = query.or(
        `description.ilike.%${filters.search}%,work_location.ilike.%${filters.search}%`
      )
    }

    // ソート・ページネーション
    const { data, error, count } = await query
      .order('report_date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + per_page - 1)

    if (error) {
      console.error('Work reports fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: data || [],
      total: count || 0,
      page,
      per_page,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// POST /api/work-reports - 作業報告書作成
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
      .select('organization_id, name')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()

    // 必須項目チェック
    if (!body.site_id || !body.report_date || !body.description) {
      return NextResponse.json(
        { error: '必須項目が不足しています' },
        { status: 400 }
      )
    }

    // 作業者情報の整形
    const workers = await Promise.all(
      (body.worker_ids || []).map(async (workerId: string) => {
        const { data: workerData } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', workerId)
          .single()

        return {
          user_id: workerId,
          name: workerData?.name || '',
          work_hours: 0,
        }
      })
    )

    // 作業報告書作成
    const { data, error } = await supabase
      .from('work_reports')
      .insert({
        organization_id: userData.organization_id,
        site_id: body.site_id,
        report_date: body.report_date,
        weather: body.weather || '',
        description: body.description,
        work_start_time: body.work_start_time,
        work_end_time: body.work_end_time,
        break_minutes: body.break_minutes || 0,
        workers: workers,
        work_location: body.work_location,
        progress_rate: body.progress_rate,
        materials_used: body.materials_used,
        tools_used: body.tools_used,
        safety_incidents: body.safety_incidents || false,
        safety_incident_details: body.safety_incident_details,
        quality_issues: body.quality_issues || false,
        quality_issue_details: body.quality_issue_details,
        client_contact: body.client_contact || false,
        client_contact_details: body.client_contact_details,
        next_tasks: body.next_tasks,
        custom_fields: body.custom_fields || {},
        status: 'draft',
        created_by: user.id,
      })
      .select(
        `
        *,
        site:sites(id, name),
        created_by_user:users!work_reports_created_by_fkey(id, name, email)
      `
      )
      .single()

    if (error) {
      console.error('Work report creation error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
