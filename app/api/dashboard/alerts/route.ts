import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )

  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { organization_id, role } = userData
    const alerts = []

    // Get contract info to determine package type
    const { data: contract } = await supabase
      .from('contracts')
      .select('has_asset_package, has_dx_efficiency_package')
      .eq('organization_id', organization_id)
      .eq('status', 'active')
      .single()

    const hasAssetPackage = contract?.has_asset_package || false
    const hasDXPackage = contract?.has_dx_efficiency_package || false

    // Asset Package Alerts
    if (hasAssetPackage) {
      // Check for low stock consumables
      const { data: consumables } = await supabase
        .from('tools')
        .select('id, name, minimum_stock')
        .eq('organization_id', organization_id)
        .eq('management_type', 'consumable')
        .gt('minimum_stock', 0)

      for (const consumable of consumables || []) {
        const { data: inventories } = await supabase
          .from('consumable_inventory')
          .select('quantity')
          .eq('tool_id', consumable.id)
          .eq('organization_id', organization_id)

        const totalQty = inventories?.reduce((sum, inv) => sum + inv.quantity, 0) || 0

        if (totalQty < consumable.minimum_stock) {
          alerts.push({
            id: `low-stock-${consumable.id}`,
            severity: totalQty === 0 ? 'critical' : 'warning',
            title: '在庫不足',
            message: `${consumable.name}の在庫が不足しています（現在: ${totalQty}、最低: ${consumable.minimum_stock}）`,
            link: '/consumables',
            scope: 'organization',
            level: 'inventory'
          })
        }
      }

      // Check for overdue tools (admin and manager only)
      if (role === 'admin' || role === 'manager') {
        const threeDaysAgo = new Date()
        threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

        const { data: overdueMovements } = await supabase
          .from('tool_movements')
          .select(`
            id,
            tool_id,
            user_id,
            moved_at,
            tools!inner(name)
          `)
          .eq('organization_id', organization_id)
          .eq('movement_type', 'out')
          .is('returned_at', null)
          .lt('moved_at', threeDaysAgo.toISOString())
          .limit(5)

        for (const movement of overdueMovements || []) {
          const daysSince = Math.floor((Date.now() - new Date(movement.moved_at).getTime()) / (1000 * 60 * 60 * 24))
          const toolName = (movement as any).tools?.name || '不明な道具'
          alerts.push({
            id: `overdue-${movement.id}`,
            severity: daysSince > 7 ? 'critical' : 'warning',
            title: '道具未返却',
            message: `${toolName}が${daysSince}日間返却されていません`,
            link: '/movements',
            scope: 'organization',
            level: 'tool'
          })
        }
      }

      // Check heavy equipment alerts (admin and manager only)
      if (role === 'admin' || role === 'manager') {
        const { data: equipment } = await supabase
          .from('heavy_equipment')
          .select('id, equipment_code, name, vehicle_inspection_date, insurance_end_date, requires_vehicle_inspection')
          .eq('organization_id', organization_id)
          .is('deleted_at', null)

        const today = new Date()
        for (const equip of equipment || []) {
          // Vehicle inspection alerts
          if (equip.requires_vehicle_inspection && equip.vehicle_inspection_date) {
            const inspectionDate = new Date(equip.vehicle_inspection_date)
            const daysUntil = Math.floor((inspectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            if (daysUntil < 0) {
              alerts.push({
                id: `inspection-overdue-${equip.id}`,
                severity: 'critical',
                title: '車検期限切れ',
                message: `${equip.name}の車検が${Math.abs(daysUntil)}日過ぎています`,
                link: `/equipment/${equip.id}`,
                scope: 'organization',
                level: 'equipment'
              })
            } else if (daysUntil <= 30) {
              alerts.push({
                id: `inspection-due-${equip.id}`,
                severity: daysUntil <= 7 ? 'critical' : 'warning',
                title: '車検期限間近',
                message: `${equip.name}の車検期限まであと${daysUntil}日`,
                link: `/equipment/${equip.id}`,
                scope: 'organization',
                level: 'equipment'
              })
            }
          }

          // Insurance alerts
          if (equip.insurance_end_date) {
            const insuranceDate = new Date(equip.insurance_end_date)
            const daysUntil = Math.floor((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

            if (daysUntil < 0) {
              alerts.push({
                id: `insurance-overdue-${equip.id}`,
                severity: 'critical',
                title: '保険期限切れ',
                message: `${equip.name}の保険が${Math.abs(daysUntil)}日過ぎています`,
                link: `/equipment/${equip.id}`,
                scope: 'organization',
                level: 'equipment'
              })
            } else if (daysUntil <= 30) {
              alerts.push({
                id: `insurance-due-${equip.id}`,
                severity: daysUntil <= 7 ? 'critical' : 'warning',
                title: '保険期限間近',
                message: `${equip.name}の保険期限まであと${daysUntil}日`,
                link: `/equipment/${equip.id}`,
                scope: 'organization',
                level: 'equipment'
              })
            }
          }
        }
      }
    }

    // DX Package Alerts
    if (hasDXPackage) {
      // Check for missing clock-outs (all roles)
      const today = new Date().toISOString().split('T')[0]
      const { data: attendance } = await supabase
        .from('attendance_records')
        .select('id, clock_in_time')
        .eq('user_id', user.id)
        .eq('date', today)
        .is('clock_out_time', null)
        .single()

      if (attendance && attendance.clock_in_time) {
        const clockInTime = new Date(attendance.clock_in_time)
        const hoursWorked = (Date.now() - clockInTime.getTime()) / (1000 * 60 * 60)

        if (hoursWorked > 9) {
          alerts.push({
            id: 'missing-clock-out',
            severity: 'warning',
            title: '退勤打刻忘れ',
            message: '本日の退勤打刻がまだ完了していません',
            link: '/attendance',
            userId: user.id,
            scope: 'personal',
            level: 'attendance'
          })
        }
      }

      // Check for pending approvals (manager and admin only)
      if (role === 'admin' || role === 'manager') {
        const { data: pendingOrders } = await supabase
          .from('purchase_orders')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('status', 'submitted')
          .is('deleted_at', null)

        if (pendingOrders && pendingOrders.length > 0) {
          alerts.push({
            id: 'pending-approvals',
            severity: 'warning',
            title: '承認待ち',
            message: `${pendingOrders.length}件の発注書が承認待ちです`,
            link: '/purchase-orders',
            scope: 'organization',
            level: 'approval'
          })
        }
      }

      // Check for overdue work reports (leader role)
      if (role === 'leader' || role === 'manager') {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        const { data: missingReports } = await supabase
          .from('work_reports')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('status', 'draft')
          .lt('work_date', yesterday.toISOString())

        if (missingReports && missingReports.length > 0) {
          alerts.push({
            id: 'missing-work-reports',
            severity: 'warning',
            title: '未提出の作業報告書',
            message: `${missingReports.length}件の作業報告書が未提出です`,
            link: '/work-reports',
            scope: 'team',
            level: 'report'
          })
        }
      }
    }

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('Dashboard alerts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    )
  }
}