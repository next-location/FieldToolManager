import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendLowStockAlertEmail } from '@/lib/email'

/**
 * 低在庫アラートチェックAPI
 *
 * このエンドポイントは定期的に実行され（cronまたは手動）、
 * すべての組織の道具在庫をチェックして、低在庫の場合にメールアラートを送信します。
 *
 * 使用方法:
 * 1. Vercel Cron Jobs: vercel.jsonで設定
 * 2. 手動実行: POST /api/cron/check-low-stock（管理者のみ）
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

    // 1. 低在庫アラートが有効な組織を取得
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
      .eq('enable_low_stock_alert', true)
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

    // 2. 各組織の低在庫道具をチェック
    for (const org of organizations) {
      const organizationId = org.organization_id
      const organizationName = (org.organizations as any).name
      const notificationEmail = org.notification_email

      if (!notificationEmail) {
        console.warn(`Organization ${organizationId} has no notification email set`)
        continue
      }

      // 低在庫アラートが有効な道具を取得
      const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('id, name, model_number, quantity, minimum_stock, management_type')
        .eq('organization_id', organizationId)
        .eq('enable_low_stock_alert', true)
        .is('deleted_at', null)

      if (toolsError) {
        console.error(`Tools fetch error for org ${organizationId}:`, toolsError)
        continue
      }

      if (!tools || tools.length === 0) {
        continue
      }

      // 低在庫の道具をフィルタリング
      const lowStockTools = tools.filter((tool) => {
        // 消耗品の場合は直接quantityを確認
        if (tool.management_type === 'consumable') {
          return tool.quantity < tool.minimum_stock
        }
        // 個別管理の場合もquantityを確認（tool_itemsの合計）
        return tool.quantity < tool.minimum_stock
      })

      if (lowStockTools.length === 0) {
        continue
      }

      // 各低在庫道具についてメール送信
      for (const tool of lowStockTools) {
        try {
          const result = await sendLowStockAlertEmail(notificationEmail, {
            toolName: tool.name,
            modelNumber: tool.model_number || undefined,
            currentStock: tool.quantity,
            minimumStock: tool.minimum_stock,
            organizationName,
            dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tools/${tool.id}`,
          })

          if (result.success) {
            totalAlertsSent++
            results.push({
              organizationId,
              toolId: tool.id,
              toolName: tool.name,
              status: 'sent',
            })

            // 通知レコードをデータベースに保存
            await supabase.from('notifications').insert({
              organization_id: organizationId,
              type: 'low_stock',
              title: `低在庫アラート: ${tool.name}`,
              message: `${tool.name}の在庫が${tool.quantity}個になりました（最小在庫数: ${tool.minimum_stock}個）`,
              severity: 'warning',
              related_tool_id: tool.id,
              metadata: {
                current_stock: tool.quantity,
                minimum_stock: tool.minimum_stock,
              },
              sent_via: ['email'],
              sent_at: new Date().toISOString(),
            })
          } else {
            results.push({
              organizationId,
              toolId: tool.id,
              toolName: tool.name,
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
      message: `Low stock check completed. ${totalAlertsSent} alerts sent.`,
      alertsSent: totalAlertsSent,
      details: results,
    })
  } catch (error: any) {
    console.error('Low stock check error:', error)
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
    endpoint: 'Low Stock Alert Cron Job',
    note: 'Use POST method to trigger the check',
  })
}
