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
    const stats: any = {}

    // Get contract info to determine package type
    const { data: contract } = await supabase
      .from('contracts')
      .select('has_asset_package, has_dx_efficiency_package')
      .eq('organization_id', organization_id)
      .eq('status', 'active')
      .single()

    const hasAssetPackage = contract?.has_asset_package || false
    const hasDXPackage = contract?.has_dx_efficiency_package || false

    // Staff-specific stats
    if (role === 'staff') {
      if (hasAssetPackage) {
        // My tools count
        const { data: myTools } = await supabase
          .from('tool_movements')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('user_id', user.id)
          .eq('movement_type', 'out')
          .is('returned_at', null)

        stats.myTools = {
          count: myTools?.length || 0
        }
      }

      if (hasDXPackage) {
        // Today's attendance
        const today = new Date().toISOString().split('T')[0]
        const { data: attendance } = await supabase
          .from('attendance_records')
          .select('clock_in_time, clock_out_time')
          .eq('user_id', user.id)
          .eq('date', today)
          .single()

        if (attendance && attendance.clock_in_time) {
          const clockIn = new Date(attendance.clock_in_time)
          const clockOut = attendance.clock_out_time ? new Date(attendance.clock_out_time) : new Date()
          const hours = Math.floor((clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60))
          const minutes = Math.floor(((clockOut.getTime() - clockIn.getTime()) % (1000 * 60 * 60)) / (1000 * 60))

          stats.attendance = {
            todayHours: `${hours}:${minutes.toString().padStart(2, '0')}`,
            status: attendance.clock_out_time ? '退勤済み' : '勤務中'
          }
        } else {
          stats.attendance = {
            todayHours: '0:00',
            status: '未出勤'
          }
        }
      }
    }

    // Leader-specific stats
    if (role === 'leader') {
      if (hasAssetPackage) {
        // Team tools usage
        const { data: teamMembers } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('role', 'staff')

        const teamMemberIds = teamMembers?.map(m => m.id) || []

        const { data: teamTools } = await supabase
          .from('tool_movements')
          .select('id')
          .eq('organization_id', organization_id)
          .in('user_id', teamMemberIds)
          .eq('movement_type', 'out')
          .is('returned_at', null)

        stats.teamTools = {
          inUse: teamTools?.length || 0,
          total: 50 // This would need to be calculated based on actual tool count
        }
      }

      if (hasDXPackage) {
        // Team attendance
        const today = new Date().toISOString().split('T')[0]
        const { data: teamMembers } = await supabase
          .from('users')
          .select('id')
          .eq('organization_id', organization_id)
          .in('role', ['staff', 'leader'])

        const { data: presentMembers } = await supabase
          .from('attendance_records')
          .select('user_id')
          .eq('date', today)
          .not('clock_in_time', 'is', null)
          .in('user_id', teamMembers?.map(m => m.id) || [])

        stats.teamAttendance = {
          present: presentMembers?.length || 0,
          total: teamMembers?.length || 0
        }
      }
    }

    // Manager-specific stats
    if (role === 'manager') {
      if (hasAssetPackage) {
        // Tool utilization
        const { data: allTools } = await supabase
          .from('tools')
          .select('id')
          .eq('organization_id', organization_id)
          .eq('management_type', 'individual')

        const { data: inUseTools } = await supabase
          .from('tool_movements')
          .select('tool_id')
          .eq('organization_id', organization_id)
          .eq('movement_type', 'out')
          .is('returned_at', null)

        const utilizationRate = allTools?.length
          ? Math.round((inUseTools?.length || 0) / allTools.length * 100)
          : 0

        stats.toolUtilization = {
          rate: utilizationRate,
          trend: { value: 5, direction: 'up', label: '前週比' }
        }

        // Low stock count
        const { data: lowStockItems } = await supabase
          .from('tools')
          .select('id, name, minimum_stock')
          .eq('organization_id', organization_id)
          .eq('management_type', 'consumable')
          .gt('minimum_stock', 0)

        let lowStockCount = 0
        for (const item of lowStockItems || []) {
          const { data: inventory } = await supabase
            .from('consumable_inventory')
            .select('quantity')
            .eq('tool_id', item.id)
            .eq('organization_id', organization_id)

          const total = inventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0
          if (total < item.minimum_stock) lowStockCount++
        }

        stats.inventory = { lowStock: lowStockCount }
      }

      if (hasDXPackage) {
        // Purchase orders
        const { data: pendingOrders } = await supabase
          .from('purchase_orders')
          .select('total_amount')
          .eq('organization_id', organization_id)
          .eq('status', 'submitted')
          .is('deleted_at', null)

        const totalAmount = pendingOrders?.reduce((sum, order) => sum + Number(order.total_amount || 0), 0) || 0

        stats.purchaseOrders = {
          pending: pendingOrders?.length || 0,
          totalAmount
        }
      }
    }

    // Admin-specific stats
    if (role === 'admin') {
      // Organization stats
      const { data: allUsers } = await supabase
        .from('users')
        .select('id, last_login')
        .eq('organization_id', organization_id)

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const activeUsers = allUsers?.filter(u =>
        u.last_login && new Date(u.last_login) > thirtyDaysAgo
      ).length || 0

      stats.organization = {
        activeUsers,
        totalUsers: allUsers?.length || 0
      }

      // KPI stats for full package
      if (hasAssetPackage && hasDXPackage) {
        // Monthly cost calculation (simplified)
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()

        const { data: monthlyPurchases } = await supabase
          .from('purchase_orders')
          .select('total_amount')
          .eq('organization_id', organization_id)
          .gte('created_at', new Date(currentYear, currentMonth, 1).toISOString())
          .lt('created_at', new Date(currentYear, currentMonth + 1, 1).toISOString())

        const monthlyCost = monthlyPurchases?.reduce((sum, p) => sum + Number(p.total_amount || 0), 0) || 0

        stats.kpi = {
          monthlyCost,
          costTrend: { value: 3, direction: 'down', label: '前月比' }
        }
      }
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Dashboard stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}