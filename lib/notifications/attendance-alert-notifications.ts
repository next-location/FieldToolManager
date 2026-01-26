import { createClient } from '@/lib/supabase/server'

/**
 * 出退勤アラート通知ユーティリティ
 * アラート生成時に管理者/マネージャーに通知を送る
 */

interface NotifyCheckinReminderParams {
  organizationId: string
  targetDate: string
  missingUsers: Array<{
    id: string
    name: string
    email: string
  }>
}

/**
 * 出勤打刻忘れアラートの通知を管理者/マネージャーに送信
 */
export async function notifyCheckinReminder(params: NotifyCheckinReminderParams) {
  const supabase = await createClient()

  if (params.missingUsers.length === 0) {
    return // 未出勤者がいない場合は何もしない
  }

  // 管理者とマネージャーを取得
  const { data: recipients, error: recipientsError } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('organization_id', params.organizationId)
    .in('role', ['manager', 'admin'])
    .eq('is_active', true)
    .is('deleted_at', null)

  if (recipientsError) {
    console.error('[通知] 管理者取得エラー:', recipientsError)
    return
  }

  if (!recipients || recipients.length === 0) {
    console.log('[通知] 管理者/マネージャーが見つかりません')
    return
  }

  // サマリーメッセージ作成
  const userNames = params.missingUsers.map(u => u.name).join('、')
  const summary = params.missingUsers.length <= 3
    ? userNames
    : `${params.missingUsers.slice(0, 3).map(u => u.name).join('、')}他${params.missingUsers.length - 3}名`

  // 各管理者/マネージャーに通知を作成
  const notifications = recipients.map((recipient) => ({
    organization_id: params.organizationId,
    type: '出退勤アラート',
    title: `出勤打刻忘れアラート（${params.missingUsers.length}名）`,
    message: `${params.targetDate}の出勤打刻がまだ行われていません：${summary}`,
    severity: 'warning' as const,
    target_user_id: recipient.id,
    sent_via: ['in_app'],
    sent_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase.from('notifications').insert(notifications)

  if (insertError) {
    console.error('[通知] 通知作成エラー:', insertError)
  } else {
    console.log(`[通知] ${recipients.length}人の管理者に通知を送信しました`)
  }
}

/**
 * 個別の出勤打刻忘れ通知をスタッフ本人に送信
 */
export async function notifyIndividualCheckinReminder(params: {
  organizationId: string
  userId: string
  userName: string
  targetDate: string
}) {
  const supabase = await createClient()

  // ユーザーのroleを取得して、メッセージを分岐
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', params.userId)
    .single()

  const isAdminOrManager = userData && ['admin', 'manager'].includes(userData.role)

  const message = isAdminOrManager
    ? `${params.targetDate}の出勤打刻がまだ行われていません。打刻をお願いします。`
    : `${params.targetDate}の出勤打刻がまだ行われていません。打刻を忘れた場合は、上司に報告して正しい時刻を代理打刻してもらってください。`

  const { error } = await supabase.from('notifications').insert({
    organization_id: params.organizationId,
    type: '出退勤アラート',
    title: '出勤打刻忘れ',
    message,
    severity: 'warning',
    target_user_id: params.userId,
    sent_via: ['in_app'],
    sent_at: new Date().toISOString(),
  })

  if (error) {
    console.error('[通知] 個別通知作成エラー:', error)
  }
}
