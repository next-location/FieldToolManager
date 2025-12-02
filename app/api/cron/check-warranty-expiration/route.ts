import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWarrantyExpirationEmail } from '@/lib/email'

/**
 * 保証期限切れチェックAPI
 *
 * このエンドポイントは定期的に実行され（cronまたは手動）、
 * すべての組織の道具の保証期限をチェックして、期限切れまたは間もなく期限切れの場合にメールアラートを送信します。
 *
 * アラート条件:
 * - 保証期限まで30日以内
 * - 保証期限が過ぎている
 *
 * 使用方法:
 * 1. Vercel Cron Jobs: vercel.jsonで設定（毎日実行を推奨）
 * 2. 手動実行: POST /api/cron/check-warranty-expiration（管理者のみ）
 */
export async function POST(request: NextRequest) {
  try {
    // 認証トークンチェック（本番環境用）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // 1. メール通知が有効な組織を取得
    const { data: organizations, error: orgError } = await supabase
      .from('organization_settings')
      .select(`
        organization_id,
        notification_email,
        organizations!inner (
          id,
          name,
          is_active
        )
      `)
      .eq('enable_email_notifications', true)
      .eq('organizations.is_active', true)

    if (orgError) {
      console.error('Organization fetch error:', orgError)
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      )
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No organizations with email notifications enabled',
        alertsSent: 0,
      })
    }

    let totalAlertsSent = 0
    const results: any[] = []

    // 今日の日付
    const today = new Date()
    // 30日後の日付
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(today.getDate() + 30)

    // 2. 各組織の保証期限が近い/切れている道具をチェック
    for (const org of organizations) {
      const organizationId = org.organization_id
      const organizationName = (org.organizations as any).name
      const notificationEmail = org.notification_email

      if (!notificationEmail) {
        console.warn(`Organization ${organizationId} has no notification email set`)
        continue
      }

      // 保証期限が30日以内または切れている道具を取得
      const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('id, name, model_number, warranty_expiration_date')
        .eq('organization_id', organizationId)
        .not('warranty_expiration_date', 'is', null)
        .lte('warranty_expiration_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .is('deleted_at', null)

      if (toolsError) {
        console.error(`Tools fetch error for org ${organizationId}:`, toolsError)
        continue
      }

      if (!tools || tools.length === 0) {
        continue
      }

      // 各道具について保証期限をチェックしてメール送信
      for (const tool of tools) {
        try {
          const warrantyDate = new Date(tool.warranty_expiration_date)
          const daysUntilExpiration = Math.ceil((warrantyDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          const result = await sendWarrantyExpirationEmail(notificationEmail, {
            toolName: tool.name,
            modelNumber: tool.model_number || undefined,
            warrantyExpirationDate: tool.warranty_expiration_date,
            daysUntilExpiration,
            organizationName,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tools/${tool.id}`,
          })

          if (result.success) {
            totalAlertsSent++
            results.push({
              organizationId,
              toolId: tool.id,
              toolName: tool.name,
              daysUntilExpiration,
              status: 'sent',
            })

            // 通知レコードをデータベースに保存
            await supabase.from('notifications').insert({
              organization_id: organizationId,
              type: 'maintenance_due',
              title: daysUntilExpiration <= 0
                ? `保証期限切れ: ${tool.name}`
                : `保証期限アラート: ${tool.name}（残り${daysUntilExpiration}日）`,
              message: daysUntilExpiration <= 0
                ? `${tool.name}の保証期限が切れています（${tool.warranty_expiration_date}）`
                : `${tool.name}の保証期限が間もなく切れます（${tool.warranty_expiration_date}、残り${daysUntilExpiration}日）`,
              severity: daysUntilExpiration <= 0 ? 'error' : 'warning',
              related_tool_id: tool.id,
              metadata: {
                warranty_expiration_date: tool.warranty_expiration_date,
                days_until_expiration: daysUntilExpiration,
              },
              sent_via: ['email'],
              sent_at: new Date().toISOString(),
            })
          } else {
            results.push({
              organizationId,
              toolId: tool.id,
              toolName: tool.name,
              daysUntilExpiration,
              status: 'failed',
              error: result.error,
            })
          }
        } catch (emailError: any) {
          console.error(`Email send error for tool ${tool.id}:`, emailError)
          results.push({
            organizationId,
            toolId: tool.id,
            toolName: tool.name,
            status: 'failed',
            error: emailError.message,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Warranty expiration check completed. ${totalAlertsSent} alerts sent.`,
      alertsSent: totalAlertsSent,
      details: results,
    })
  } catch (error: any) {
    console.error('Warranty expiration check error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: ステータスチェック用
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'Warranty Expiration Check Cron Job',
    note: 'Use POST method to trigger the check',
  })
}
