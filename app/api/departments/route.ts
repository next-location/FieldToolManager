import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/departments - 組織内の部署一覧を取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザーの組織ID取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 組織内の全ユーザーから部署を取得（重複排除、NULL除外）
    const { data: departments, error: deptError } = await supabase
      .from('users')
      .select('department')
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .not('department', 'is', null)
      .order('department')

    if (deptError) {
      console.error('Departments fetch error:', deptError)
      return NextResponse.json({ error: '部署の取得に失敗しました' }, { status: 500 })
    }

    // 部署名を配列として抽出し、重複を排除
    const uniqueDepartments = Array.from(
      new Set(departments.map((d) => d.department).filter((dept): dept is string => dept !== null))
    )

    // 部署ごとのスタッフ数をカウント
    const departmentStats = await Promise.all(
      uniqueDepartments.map(async (dept) => {
        const { count } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', userData.organization_id)
          .eq('department', dept)
          .is('deleted_at', null)
          .eq('is_active', true)

        return {
          name: dept,
          staff_count: count || 0,
        }
      })
    )

    return NextResponse.json({
      departments: departmentStats,
      total_departments: uniqueDepartments.length,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
