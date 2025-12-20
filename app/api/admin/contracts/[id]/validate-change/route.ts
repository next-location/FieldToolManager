import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminSession } from '@/lib/auth/super-admin'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_LIMITS: Record<string, number> = {
  start: 10,
  standard: 30,
  business: 50,
  pro: 100,
}

// POST /api/admin/contracts/[id]/validate-change - 契約変更の検証
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // スーパーアドミン認証チェック
    const session = await getSuperAdminSession()
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    const { id: contractId } = await params
    const body = await request.json()
    const { new_plan, new_user_limit } = body

    if (!new_plan || !new_user_limit) {
      return NextResponse.json(
        { error: '新しいプランとユーザー上限が必要です' },
        { status: 400 }
      )
    }

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('organization_id, plan, user_limit')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: '契約が見つかりません' }, { status: 404 })
    }

    // 組織の現在のアクティブユーザー数を取得
    const { count: currentUserCount, error: countError } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', contract.organization_id)
      .is('deleted_at', null)
      .eq('is_active', true)

    if (countError) {
      console.error('Failed to count users:', countError)
      return NextResponse.json(
        { error: 'ユーザー数の取得に失敗しました' },
        { status: 500 }
      )
    }

    const activeUserCount = currentUserCount || 0

    // グレードダウンチェック
    const isDowngrade = new_user_limit < contract.user_limit

    if (isDowngrade && activeUserCount > new_user_limit) {
      // グレードダウンで現在のユーザー数が新プランの上限を超える場合
      const excessUsers = activeUserCount - new_user_limit

      return NextResponse.json(
        {
          valid: false,
          error: 'ユーザー数が新プランの上限を超えています',
          details: {
            current_plan: contract.plan,
            new_plan,
            current_limit: contract.user_limit,
            new_limit: new_user_limit,
            active_users: activeUserCount,
            excess_users: excessUsers,
            message: `現在${activeUserCount}人のアクティブユーザーがいますが、新プラン「${new_plan}」の上限は${new_user_limit}人です。\n\nプラン変更前に${excessUsers}人のユーザーを無効化する必要があります。`,
          },
        },
        { status: 400 }
      )
    }

    // 検証OK
    return NextResponse.json({
      valid: true,
      message: 'プラン変更が可能です',
      details: {
        current_plan: contract.plan,
        new_plan,
        current_limit: contract.user_limit,
        new_limit: new_user_limit,
        active_users: activeUserCount,
        is_downgrade: isDowngrade,
        is_upgrade: new_user_limit > contract.user_limit,
      },
    })
  } catch (error: any) {
    console.error('[API /api/admin/contracts/validate-change] Error:', error)
    return NextResponse.json(
      {
        error: 'サーバーエラーが発生しました',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
