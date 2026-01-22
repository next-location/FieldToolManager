import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import {
  notifyWorkReportApproved,
  notifyWorkReportRejected,
} from '@/lib/notifications/work-report-notifications'
import { logWorkReportApproved } from '@/lib/audit-log'

interface Params {
  params: Promise<{ id: string }>
}

// POST /api/work-reports/[id]/approve - 作業報告書の承認/却下
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
      .select('organization_id, role, name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 400 })
    }

    // manager または admin のみ承認可能
    if (userData.role !== 'manager' && userData.role !== 'admin') {
      return NextResponse.json({ error: '承認権限がありません' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { action, comment } = body // action: 'approved' | 'rejected'

    if (!action || (action !== 'approved' && action !== 'rejected')) {
      return NextResponse.json({ error: 'アクションが不正です' }, { status: 400 })
    }

    // 作業報告書を取得（現場名と作成者情報も取得）
    const { data: report, error: reportError } = await supabase
      .from('work_reports')
      .select(
        `
        *,
        site:sites!work_reports_site_id_fkey(name),
        created_by_user:users!work_reports_created_by_fkey(id, name)
      `
      )
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .single()

    if (reportError || !report) {
      console.error('[APPROVE API] Report not found:', {
        reportId: id,
        organizationId: userData?.organization_id,
        userId: user.id,
        error: reportError?.message
      })
      return NextResponse.json({ error: '作業報告書が見つかりません' }, { status: 404 })
    }

    // ステータスチェック：提出済みの報告書のみ承認可能
    if (report.status !== 'submitted') {
      return NextResponse.json(
        { error: '提出済みの報告書のみ承認できます' },
        { status: 400 }
      )
    }

    // トランザクション処理
    // 1. 報告書のステータス更新（Service Roleキーを使用してRLSをバイパス）
    const newStatus = action === 'approved' ? 'approved' : 'rejected'
    const now = new Date().toISOString()

    const updateData: any = {
      status: newStatus,
      updated_at: now,
    }

    if (action === 'approved') {
      updateData.approved_at = now
      updateData.approved_by = user.id
    } else {
      updateData.rejected_at = now
      updateData.rejected_by = user.id
      updateData.rejection_reason = comment || null
    }

    // Service Roleクライアントを使用してRLSをバイパス
    const adminClient = createAdminClient()
    const { error: updateError } = await adminClient
      .from('work_reports')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', userData?.organization_id)

    if (updateError) {
      console.error('[APPROVE API] Update error:', updateError)
      return NextResponse.json(
        { error: '報告書のステータス更新に失敗しました' },
        { status: 500 }
      )
    }

    console.log('[APPROVE API] Status updated successfully:', {
      reportId: id,
      newStatus,
      action,
      updateData
    })

    // 2. 承認履歴を登録
    const { error: approvalError } = await supabase.from('work_report_approvals').insert({
      organization_id: userData?.organization_id,
      work_report_id: id,
      approver_id: user.id,
      approver_name: userData.name,
      action,
      comment: comment || null,
    })

    if (approvalError) {
      // ロールバック: 報告書ステータスを戻す
      await adminClient
        .from('work_reports')
        .update({
          status: 'submitted',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('organization_id', userData?.organization_id)

      return NextResponse.json(
        { error: '承認履歴の登録に失敗しました' },
        { status: 500 }
      )
    }

    // 3. 監査ログを記録（承認の場合のみ）
    if (action === 'approved') {
      try {
        await logWorkReportApproved(id, {
          approved_by: user.id,
          approved_at: now,
          approver_name: userData.name,
        }, user.id, userData.organization_id)
      } catch (auditError) {
        console.error('Audit log error:', auditError)
        // 監査ログエラーは承認処理の成功を妨げない
      }
    }

    // 4. 通知を送信
    try {
      const notifyParams = {
        organizationId: userData?.organization_id,
        workReportId: id,
        reportDate: report.report_date,
        siteName: report.site?.name || '不明な現場',
        creatorId: report.created_by,
        approverName: userData.name,
        comment: comment || undefined,
      }

      if (action === 'approved') {
        await notifyWorkReportApproved(notifyParams)
      } else {
        await notifyWorkReportRejected(notifyParams)
      }
    } catch (notifyError) {
      console.error('Notification error:', notifyError)
      // 通知エラーは承認処理の成功を妨げない
    }

    return NextResponse.json({
      message: action === 'approved' ? '承認しました' : '却下しました',
      status: newStatus,
    })
  } catch (error) {
    console.error('Approval error:', error)
    return NextResponse.json({ error: '処理に失敗しました' }, { status: 500 })
  }
}
