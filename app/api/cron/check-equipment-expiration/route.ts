import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 重機の車検・保険期限チェックAPI
 *
 * このエンドポイントは定期的に実行され（cronまたは手動）、
 * すべての組織の重機の車検・保険期限をチェックして、期限切れまたは間もなく期限切れの場合に通知を作成します。
 *
 * アラート条件:
 * - 車検期限まで設定された日数以内（デフォルト60日）
 * - 保険期限まで設定された日数以内（デフォルト60日）
 * - 期限が過ぎている
 *
 * 使用方法:
 * 1. Vercel Cron Jobs: vercel.jsonで設定（毎日実行を推奨）
 * 2. 手動実行: POST /api/cron/check-equipment-expiration
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

    // 1. 重機管理が有効な組織を取得
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('heavy_equipment_enabled', true)
      .eq('is_active', true)

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
        message: 'No organizations with heavy equipment enabled',
        alertsCreated: 0,
      })
    }

    let totalAlertsCreated = 0
    const results: any[] = []

    // 今日の日付
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 2. 各組織の重機をチェック
    for (const org of organizations) {
      const organizationId = org.id
      const organizationName = org.name

      // 重機一覧を取得
      const { data: equipment, error: equipmentError } = await supabase
        .from('heavy_equipment')
        .select('id, equipment_code, name, requires_vehicle_inspection, vehicle_inspection_date, vehicle_inspection_reminder_days, insurance_end_date, insurance_reminder_days')
        .eq('organization_id', organizationId)
        .is('deleted_at', null)

      if (equipmentError) {
        console.error(`Equipment fetch error for org ${organizationId}:`, equipmentError)
        continue
      }

      if (!equipment || equipment.length === 0) {
        continue
      }

      // 各重機について車検・保険期限をチェック
      for (const item of equipment) {
        // 車検期限チェック
        if (item.requires_vehicle_inspection && item.vehicle_inspection_date) {
          const inspectionDate = new Date(item.vehicle_inspection_date)
          inspectionDate.setHours(0, 0, 0, 0)
          const daysUntilInspection = Math.ceil((inspectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          const reminderDays = item.vehicle_inspection_reminder_days || 60

          if (daysUntilInspection <= reminderDays) {
            try {
              // 既に同じ内容の通知が24時間以内に作成されていないかチェック
              const twentyFourHoursAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000)
              const { data: existingNotification } = await supabase
                .from('notifications')
                .select('id')
                .eq('organization_id', organizationId)
                .eq('type', 'maintenance_due')
                .eq('related_equipment_id', item.id)
                .gte('created_at', twentyFourHoursAgo.toISOString())
                .ilike('title', '%車検%')
                .limit(1)
                .single()

              if (!existingNotification) {
                await supabase.from('notifications').insert({
                  organization_id: organizationId,
                  type: 'maintenance_due',
                  title: daysUntilInspection <= 0
                    ? `車検期限切れ: ${item.name}`
                    : `車検期限アラート: ${item.name}（残り${daysUntilInspection}日）`,
                  message: daysUntilInspection <= 0
                    ? `${item.name}（${item.equipment_code}）の車検期限が切れています（${item.vehicle_inspection_date}）`
                    : `${item.name}（${item.equipment_code}）の車検期限が間もなく切れます（${item.vehicle_inspection_date}、残り${daysUntilInspection}日）`,
                  severity: daysUntilInspection <= 0 ? 'error' : 'warning',
                  related_equipment_id: item.id,
                  metadata: {
                    vehicle_inspection_date: item.vehicle_inspection_date,
                    days_until_inspection: daysUntilInspection,
                  },
                  sent_via: [],
                  sent_at: new Date().toISOString(),
                })

                totalAlertsCreated++
                results.push({
                  organizationId,
                  equipmentId: item.id,
                  equipmentName: item.name,
                  type: 'vehicle_inspection',
                  daysUntil: daysUntilInspection,
                  status: 'created',
                })
              }
            } catch (error: any) {
              console.error(`Notification creation error for equipment ${item.id}:`, error)
              results.push({
                organizationId,
                equipmentId: item.id,
                equipmentName: item.name,
                type: 'vehicle_inspection',
                status: 'failed',
                error: error.message,
              })
            }
          }
        }

        // 保険期限チェック
        if (item.insurance_end_date) {
          const insuranceDate = new Date(item.insurance_end_date)
          insuranceDate.setHours(0, 0, 0, 0)
          const daysUntilInsurance = Math.ceil((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          const reminderDays = item.insurance_reminder_days || 60

          if (daysUntilInsurance <= reminderDays) {
            try {
              // 既に同じ内容の通知が24時間以内に作成されていないかチェック
              const twentyFourHoursAgo = new Date(today.getTime() - 24 * 60 * 60 * 1000)
              const { data: existingNotification } = await supabase
                .from('notifications')
                .select('id')
                .eq('organization_id', organizationId)
                .eq('type', 'maintenance_due')
                .eq('related_equipment_id', item.id)
                .gte('created_at', twentyFourHoursAgo.toISOString())
                .ilike('title', '%保険%')
                .limit(1)
                .single()

              if (!existingNotification) {
                await supabase.from('notifications').insert({
                  organization_id: organizationId,
                  type: 'maintenance_due',
                  title: daysUntilInsurance <= 0
                    ? `保険期限切れ: ${item.name}`
                    : `保険期限アラート: ${item.name}（残り${daysUntilInsurance}日）`,
                  message: daysUntilInsurance <= 0
                    ? `${item.name}（${item.equipment_code}）の保険期限が切れています（${item.insurance_end_date}）`
                    : `${item.name}（${item.equipment_code}）の保険期限が間もなく切れます（${item.insurance_end_date}、残り${daysUntilInsurance}日）`,
                  severity: daysUntilInsurance <= 0 ? 'error' : 'warning',
                  related_equipment_id: item.id,
                  metadata: {
                    insurance_end_date: item.insurance_end_date,
                    days_until_insurance: daysUntilInsurance,
                  },
                  sent_via: [],
                  sent_at: new Date().toISOString(),
                })

                totalAlertsCreated++
                results.push({
                  organizationId,
                  equipmentId: item.id,
                  equipmentName: item.name,
                  type: 'insurance',
                  daysUntil: daysUntilInsurance,
                  status: 'created',
                })
              }
            } catch (error: any) {
              console.error(`Notification creation error for equipment ${item.id}:`, error)
              results.push({
                organizationId,
                equipmentId: item.id,
                equipmentName: item.name,
                type: 'insurance',
                status: 'failed',
                error: error.message,
              })
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Equipment expiration check completed. ${totalAlertsCreated} alerts created.`,
      alertsCreated: totalAlertsCreated,
      details: results,
    })
  } catch (error: any) {
    console.error('Equipment expiration check error:', error)
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
    endpoint: 'Equipment Expiration Check Cron Job',
    note: 'Use POST method to trigger the check',
  })
}
