import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { createClient } from '@/lib/supabase/server'
import { notifyWorkReportSubmitted } from '@/lib/notifications/work-report-notifications'
import { logWorkReportSubmitted } from '@/lib/audit-log'

interface Params {
  params: Promise<{ id: string }>
}

// POST /api/work-reports/[id]/submit - 作業報告書の提出
export async function POST(request: NextRequest, { params }: Params) {
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
      .select('organization_id, name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 400 })
    }

    // 作業報告書を取得
    const { data: report, error: reportError } = await supabase
      .from('work_reports')
      .select(
        `
        *,
        site:sites(name)
      `
      )
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .single()

    if (reportError || !report) {
      return NextResponse.json({ error: '作業報告書が見つかりません' }, { status: 404 })
    }

    // 作成者のみ提出可能
    if (report.created_by !== user.id) {
      return NextResponse.json({ error: '提出権限がありません' }, { status: 403 })
    }

    // ステータスチェック：draft または rejected の報告書のみ提出可能
    if (report.status !== 'draft' && report.status !== 'rejected') {
      return NextResponse.json(
        { error: '下書きまたは却下された報告書のみ提出できます' },
        { status: 400 }
      )
    }

    // 報告書を提出状態に更新
    const now = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('work_reports')
      .update({
        status: 'submitted',
        submitted_at: now,
        submitted_by: user.id,
        updated_at: now,
      })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json(
        { error: '報告書の提出に失敗しました' },
        { status: 500 }
      )
    }

    // 監査ログを記録
    try {
      await logWorkReportSubmitted(id, {
        submitted_by: user.id,
        submitted_at: now,
        previous_status: report.status,
      }, user.id, userData.organization_id)
    } catch (auditError) {
      console.error('Audit log error:', auditError)
      // 監査ログエラーは提出処理の成功を妨げない
    }

    // 通知を送信
    try {
      await notifyWorkReportSubmitted({
        organizationId: userData?.organization_id,
        workReportId: id,
        reportDate: report.report_date,
        siteName: report.site?.name || '不明な現場',
        submitterName: userData.name,
      })
    } catch (notifyError) {
      console.error('Notification error:', notifyError)
      // 通知エラーは提出処理の成功を妨げない
    }

    return NextResponse.json({
      message: '作業報告書を提出しました',
      status: 'submitted',
    })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json({ error: '提出処理に失敗しました' }, { status: 500 })
  }
}
