import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { notifyWorkReportSubmitted } from '@/lib/notifications/work-report-notifications'

// GET /api/work-reports/[id] - 作業報告書詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // 作業報告書取得
    const { data, error } = await supabase
      .from('work_reports')
      .select(
        `
        *,
        site:sites(id, name, address),
        created_by_user:users!work_reports_created_by_fkey(id, name, email),
        photos:work_report_photos(*),
        attachments:work_report_attachments(*)
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: '報告書が見つかりません' }, { status: 404 })
      }
      console.error('Work report fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// PATCH /api/work-reports/[id] - 作業報告書更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // ユーザー情報を取得（organization_idとroleを含む）
    const { data: userData } = await supabase
      .from('users')
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()

    console.log('=== PATCH Request Body ===')
    console.log('materials:', body.materials)
    console.log('tool_ids:', body.tool_ids)
    console.log('special_notes:', body.special_notes)
    console.log('remarks:', body.remarks)
    console.log('workers:', body.workers)
    console.log('custom_fields_data:', body.custom_fields_data)

    // 既存の報告書を取得
    const { data: existingReport } = await supabase
      .from('work_reports')
      .select('created_by, status, workers, organization_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!existingReport) {
      return NextResponse.json({ error: '報告書が見つかりません' }, { status: 404 })
    }

    // 組織IDチェック（同じ組織の報告書のみ編集可能）
    if (existingReport.organization_id !== userData.organization_id) {
      return NextResponse.json(
        { error: 'この報告書へのアクセス権限がありません' },
        { status: 403 }
      )
    }

    // 権限チェック: 下書き または 却下された報告書のみ編集可能（管理者は例外）
    if (userData.role !== 'admin' && existingReport.status !== 'draft' && existingReport.status !== 'rejected') {
      return NextResponse.json(
        { error: '下書きまたは却下された報告書のみ編集できます' },
        { status: 403 }
      )
    }

    // 更新データ準備
    const updateData: any = {}
    if (body.site_id !== undefined) updateData.site_id = body.site_id
    if (body.report_date !== undefined) updateData.report_date = body.report_date
    if (body.weather !== undefined) updateData.weather = body.weather
    if (body.description !== undefined) updateData.description = body.description
    if (body.work_start_time !== undefined) updateData.work_start_time = body.work_start_time
    if (body.work_end_time !== undefined) updateData.work_end_time = body.work_end_time
    if (body.break_minutes !== undefined) updateData.break_minutes = body.break_minutes

    // 作業員データ（新形式：配列で受け取る）
    if (body.workers !== undefined) updateData.workers = body.workers

    if (body.work_location !== undefined) updateData.work_location = body.work_location
    if (body.progress_rate !== undefined) updateData.progress_rate = body.progress_rate

    // 使用資材（テキスト形式 - 改行区切り）
    if (body.materials !== undefined) {
      // テキストを改行で配列に変換
      updateData.materials_used = body.materials.trim()
        ? body.materials.split('\n').map((m: string) => m.trim()).filter(Boolean)
        : []
    }

    // 使用道具（UUID配列）
    if (body.tool_ids !== undefined) updateData.tools_used = body.tool_ids

    // 旧形式のtools_usedも対応
    if (body.tools_used !== undefined) updateData.tools_used = body.tools_used

    // 特記事項・備考
    if (body.special_notes !== undefined) updateData.special_notes = body.special_notes
    if (body.remarks !== undefined) updateData.remarks = body.remarks

    if (body.safety_incidents !== undefined) updateData.safety_incidents = body.safety_incidents
    if (body.safety_incident_details !== undefined)
      updateData.safety_incident_details = body.safety_incident_details
    if (body.quality_issues !== undefined) updateData.quality_issues = body.quality_issues
    if (body.quality_issue_details !== undefined)
      updateData.quality_issue_details = body.quality_issue_details
    if (body.client_contact !== undefined) updateData.client_contact = body.client_contact
    if (body.client_contact_details !== undefined)
      updateData.client_contact_details = body.client_contact_details
    if (body.next_tasks !== undefined) updateData.next_tasks = body.next_tasks

    // カスタムフィールド（旧形式）
    if (body.custom_fields !== undefined) updateData.custom_fields = body.custom_fields

    // カスタムフィールド（新形式）
    if (body.custom_fields_data !== undefined) updateData.custom_fields_data = body.custom_fields_data

    // ステータス更新対応（下書き保存、提出、却下された報告書を編集して再提出する場合）
    if (body.status !== undefined) {
      // 下書き保存の場合
      if (body.status === 'draft') {
        updateData.status = 'draft'
      }
      // 提出の場合
      else if (body.status === 'submitted') {
        updateData.status = 'submitted'
        updateData.submitted_at = new Date().toISOString()
        updateData.submitted_by = user.id
      }
      // 却下状態からsubmittedへの遷移
      else if (existingReport.status === 'rejected' && body.status === 'submitted') {
        updateData.status = 'submitted'
        updateData.submitted_at = new Date().toISOString()
        updateData.submitted_by = user.id
      }
    }

    console.log('=== Update Data ===')
    console.log(JSON.stringify(updateData, null, 2))
    console.log('=== User Data ===')
    console.log('user.id:', user.id)
    console.log('userData.organization_id:', userData.organization_id)
    console.log('userData.role:', userData.role)
    console.log('=== Report Data ===')
    console.log('report.id:', id)
    console.log('report.organization_id:', existingReport.organization_id)
    console.log('report.status:', existingReport.status)
    console.log('report.created_by:', existingReport.created_by)

    // 作業報告書更新
    const { data, error } = await supabase
      .from('work_reports')
      .update(updateData)
      .eq('id', id)
      .select(
        `
        *,
        site:sites(id, name, address),
        created_by_user:users!work_reports_created_by_fkey(id, name, email)
      `
      )
      .single()

    if (error) {
      console.error('Work report update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log('=== Updated Report ===')
    console.log('materials_used:', data?.materials_used)
    console.log('tools_used:', data?.tools_used)
    console.log('special_notes:', data?.special_notes)
    console.log('remarks:', data?.remarks)

    // 再提出された場合は通知を送信
    if (existingReport.status === 'rejected' && updateData.status === 'submitted' && data) {
      try {
        // ユーザー情報を取得
        const { data: submitterData } = await supabase
          .from('users')
          .select('name, organization_id')
          .eq('id', user.id)
          .single()

        if (submitterData) {
          await notifyWorkReportSubmitted({
            organizationId: submitterData.organization_id,
            workReportId: data.id,
            reportDate: data.report_date,
            siteName: data.site?.name || '不明な現場',
            submitterName: submitterData.name,
          })
        }
      } catch (notifyError) {
        console.error('Notification error:', notifyError)
        // 通知エラーは更新の成功を妨げない
      }
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

// DELETE /api/work-reports/[id] - 作業報告書削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    // 既存の報告書を取得
    const { data: existingReport } = await supabase
      .from('work_reports')
      .select('created_by')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!existingReport) {
      return NextResponse.json({ error: '報告書が見つかりません' }, { status: 404 })
    }

    // 権限チェック: 作成者本人または管理者のみ削除可能
    if (existingReport.created_by !== user.id && userData?.role !== 'admin') {
      return NextResponse.json(
        { error: '削除権限がありません' },
        { status: 403 }
      )
    }

    // 論理削除
    const { error } = await supabase
      .from('work_reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('Work report deletion error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: '削除しました' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
