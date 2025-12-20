import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/organization/plan-upgrade-request - プランアップグレード申込
export async function POST(request: NextRequest) {
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

    // ユーザー情報取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role, name, email, phone')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 権限チェック（admin または manager のみ）
    if (userData.role !== 'admin' && userData.role !== 'manager') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { desired_plan, reason, contact_phone } = body

    // バリデーション
    if (!desired_plan) {
      return NextResponse.json({ error: '希望プランを選択してください' }, { status: 400 })
    }

    // 現在の契約情報を取得
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('id, plan, user_limit')
      .eq('organization_id', userData.organization_id)
      .eq('status', 'active')
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: '有効な契約が見つかりません' }, { status: 404 })
    }

    // 組織情報を取得
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('name, subdomain')
      .eq('id', userData.organization_id)
      .single()

    if (orgError || !organization) {
      return NextResponse.json({ error: '組織情報が見つかりません' }, { status: 404 })
    }

    // 現在のユーザー数を取得
    const { count: currentUserCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .eq('is_active', true)

    // 営業活動ログに記録（スーパーアドミンが確認できるように）
    const { error: activityError } = await supabase
      .from('sales_activities')
      .insert({
        organization_id: userData.organization_id,
        activity_type: 'inquiry',
        title: `プランアップグレード申込: ${contract.plan} → ${desired_plan}`,
        description: `
**申込情報**
- 組織: ${organization.name} (${organization.subdomain})
- 申込者: ${userData.name} (${userData.email})
- 連絡先: ${contact_phone || userData.phone || '未設定'}
- 現在のプラン: ${contract.plan} (上限: ${contract.user_limit}人)
- 現在の利用者数: ${currentUserCount || 0}人
- 希望プラン: ${desired_plan}
- 申込理由: ${reason || '未記入'}
        `.trim(),
        status: 'pending',
        created_by: user.id,
        created_by_name: userData.name,
      })

    if (activityError) {
      console.error('Failed to create sales activity:', activityError)
      return NextResponse.json({ error: '申込の記録に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'プランアップグレードの申込を受け付けました。担当者から連絡いたします。',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
