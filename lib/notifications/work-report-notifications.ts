import { createClient } from '@/lib/supabase/server'

interface CreateNotificationParams {
  organizationId: string
  type: 'work_report_submitted' | 'work_report_approved' | 'work_report_rejected'
  title: string
  message: string
  relatedWorkReportId: string
  relatedUserId?: string
  severity?: 'info' | 'warning' | 'error' | 'success'
}

/**
 * 通知を作成する汎用関数
 */
export async function createNotification(params: CreateNotificationParams) {
  const supabase = await createClient()

  const { error } = await supabase.from('notifications').insert({
    organization_id: params.organizationId,
    type: params.type,
    title: params.title,
    message: params.message,
    severity: params.severity || 'info',
    related_work_report_id: params.relatedWorkReportId,
    related_user_id: params.relatedUserId,
    sent_via: ['in_app'],
    sent_at: new Date().toISOString(),
  })

  if (error) {
    console.error('Failed to create notification:', error)
    throw error
  }
}

/**
 * 作業報告書提出時の通知（leader/adminへ）
 */
export async function notifyWorkReportSubmitted(params: {
  organizationId: string
  workReportId: string
  reportDate: string
  siteName: string
  submitterName: string
}) {
  const supabase = await createClient()

  // leader と admin のユーザーを取得
  const { data: recipients } = await supabase
    .from('users')
    .select('id')
    .eq('organization_id', params.organizationId)
    .in('role', ['leader', 'admin'])
    .eq('is_active', true)
    .is('deleted_at', null)

  if (!recipients || recipients.length === 0) {
    console.log('No leaders/admins found for notification')
    return
  }

  // 各受信者に通知を作成
  const notifications = recipients.map((recipient) => ({
    organization_id: params.organizationId,
    type: 'work_report_submitted',
    title: '新しい作業報告書が提出されました',
    message: `${params.submitterName}さんが${params.reportDate}の作業報告書（${params.siteName}）を提出しました。`,
    severity: 'info' as const,
    related_work_report_id: params.workReportId,
    related_user_id: recipient.id,
    sent_via: ['in_app'],
    sent_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from('notifications').insert(notifications)

  if (error) {
    console.error('Failed to create submission notifications:', error)
  }
}

/**
 * 作業報告書承認時の通知（作成者へ）
 */
export async function notifyWorkReportApproved(params: {
  organizationId: string
  workReportId: string
  reportDate: string
  siteName: string
  creatorId: string
  approverName: string
  comment?: string
}) {
  const message = params.comment
    ? `${params.approverName}さんが${params.reportDate}の作業報告書（${params.siteName}）を承認しました。\nコメント: ${params.comment}`
    : `${params.approverName}さんが${params.reportDate}の作業報告書（${params.siteName}）を承認しました。`

  await createNotification({
    organizationId: params.organizationId,
    type: 'work_report_approved',
    title: '作業報告書が承認されました',
    message,
    relatedWorkReportId: params.workReportId,
    relatedUserId: params.creatorId,
    severity: 'success',
  })
}

/**
 * 作業報告書却下時の通知（作成者へ）
 */
export async function notifyWorkReportRejected(params: {
  organizationId: string
  workReportId: string
  reportDate: string
  siteName: string
  creatorId: string
  approverName: string
  comment?: string
}) {
  const message = params.comment
    ? `${params.approverName}さんが${params.reportDate}の作業報告書（${params.siteName}）を却下しました。\nコメント: ${params.comment}`
    : `${params.approverName}さんが${params.reportDate}の作業報告書（${params.siteName}）を却下しました。`

  await createNotification({
    organizationId: params.organizationId,
    type: 'work_report_rejected',
    title: '作業報告書が却下されました',
    message,
    relatedWorkReportId: params.workReportId,
    relatedUserId: params.creatorId,
    severity: 'warning',
  })
}
