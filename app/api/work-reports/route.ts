import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { createClient } from '@/lib/supabase/server'
import type { WorkReportFilter } from '@/types/work-reports'
import { notifyWorkReportSubmitted } from '@/lib/notifications/work-report-notifications'
import { generateWorkReportNumber } from '@/lib/work-reports/report-number'
import { logWorkReportCreated } from '@/lib/audit-log'

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
        site:sites!work_reports_site_id_fkey(id, name),
        created_by_user:users!work_reports_created_by_fkey(id, name, email)
      `,
        { count: 'exact' }
      )
      .eq('organization_id', userData?.organization_id)
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
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[WORK REPORTS CREATE API] CSRF validation failed')
    return csrfErrorResponse()
  }

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

    // ステータス決定（draft または submitted）
    const status = body.status === 'submitted' ? 'submitted' : 'draft'

    // 作業報告書番号を生成
    const reportNumber = await generateWorkReportNumber(userData?.organization_id)

    // 使用資材の変換（改行区切りテキスト → 配列）
    let materialsArray: string[] | undefined = undefined
    if (body.materials !== undefined) {
      // テキストを改行で配列に変換
      materialsArray = body.materials.trim()
        ? body.materials.split('\n').map((m: string) => m.trim()).filter(Boolean)
        : []
    } else if (body.materials_used !== undefined) {
      // 既に配列の場合はそのまま使用
      materialsArray = body.materials_used
    }

    // 使用道具（tool_idsまたはtools_usedを優先）
    const toolsArray = body.tool_ids || body.tools_used

    // 作業報告書作成
    const { data: insertData, error: insertError } = await supabase
      .from('work_reports')
      .insert({
        organization_id: userData?.organization_id,
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
        materials_used: materialsArray,
        tools_used: toolsArray,
        safety_incidents: body.safety_incidents || false,
        safety_incident_details: body.safety_incident_details,
        quality_issues: body.quality_issues || false,
        quality_issue_details: body.quality_issue_details,
        client_contact: body.client_contact || false,
        client_contact_details: body.client_contact_details,
        next_tasks: body.next_tasks,
        custom_fields: body.custom_fields || {},
        custom_fields_data: body.custom_fields_data || {},
        special_notes: body.special_notes,
        remarks: body.remarks,
        report_number: reportNumber,
        status: status,
        created_by: user.id,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error('Work report creation error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // 作成したレポートの詳細を取得
    const { data, error } = await supabase
      .from('work_reports')
      .select(
        `
        *,
        site:sites!work_reports_site_id_fkey(id, name),
        created_by_user:users!work_reports_created_by_fkey(id, name, email)
      `
      )
      .eq('id', insertData.id)
      .single()

    if (error) {
      console.error('Work report fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // 監査ログを記録
    try {
      await logWorkReportCreated(data.id, {
        site_id: data.site_id,
        report_date: data.report_date,
        status: data.status,
        created_by: data.created_by,
      }, user.id, userData.organization_id)
    } catch (auditError) {
      console.error('Audit log error:', auditError)
      // 監査ログエラーは報告書作成の成功を妨げない
    }

    // 提出された場合は通知を送信
    if (status === 'submitted' && data) {
      try {
        await notifyWorkReportSubmitted({
          organizationId: userData?.organization_id,
          workReportId: data.id,
          reportDate: data.report_date,
          siteName: data.site?.name || '不明な現場',
          submitterName: userData.name,
        })
      } catch (notifyError) {
        console.error('Notification error:', notifyError)
        // 通知エラーは報告書作成の成功を妨げない
      }
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
