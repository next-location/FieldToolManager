import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Admin client for auth operations
function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// GET /api/staff - スタッフ一覧取得
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // クエリパラメータ取得
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')
    const department = searchParams.get('department')
    const role = searchParams.get('role')
    const status = searchParams.get('status')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = (page - 1) * limit

    // ベースクエリ
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })
      .eq('organization_id', userData.organization_id)

    // 検索フィルタ（名前またはメール）
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    // 部署フィルタ
    if (department && department !== 'all') {
      query = query.eq('department', department)
    }

    // 権限フィルタ
    if (role && role !== 'all') {
      query = query.eq('role', role)
    }

    // ステータスフィルタ
    if (status === 'active') {
      query = query.is('deleted_at', null).eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    } else if (status === 'deleted') {
      query = query.not('deleted_at', 'is', null)
    } else {
      // デフォルトは削除済みを除外
      query = query.is('deleted_at', null)
    }

    // ソート（作成日時降順）
    query = query.order('created_at', { ascending: false })

    // ページネーション
    query = query.range(offset, offset + limit - 1)

    const { data, count, error } = await query

    if (error) {
      console.error('Staff list error:', error)
      return NextResponse.json({ error: 'スタッフ一覧の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      data,
      count,
      page,
      limit,
      total_pages: count ? Math.ceil(count / limit) : 0,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// POST /api/staff - スタッフ追加
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

    // ユーザーの組織ID取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 権限チェック（admin または manager）
    const isAdmin = userData.role === 'admin'
    const isManager = userData.role === 'manager'

    if (!isAdmin && !isManager) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { name, email, password, role, department, employee_id, phone } = body

    // バリデーション
    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    // managerは admin/manager を作成できない
    if (isManager && (role === 'admin' || role === 'manager')) {
      return NextResponse.json({ error: 'マネージャーは管理者またはマネージャーアカウントを作成できません' }, { status: 403 })
    }

    // プラン上限チェック
    const { data: organization } = await supabase
      .from('organizations')
      .select('plan')
      .eq('id', userData.organization_id)
      .single()

    // プラン別の上限定義
    const planLimits: Record<string, number> = {
      basic: 10,
      premium: 50,
      enterprise: 999,
    }

    const maxUsers = organization ? planLimits[organization.plan] || 10 : 10

    const { count: currentCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .eq('is_active', true)

    if (currentCount !== null && currentCount >= maxUsers) {
      return NextResponse.json(
        {
          error: `プランの上限（${maxUsers}人）に達しています`,
          plan: organization?.plan || 'basic',
          current: currentCount,
          max: maxUsers,
        },
        { status: 400 }
      )
    }

    // メールアドレス重複チェック
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'このメールアドレスは既に使用されています' }, { status: 400 })
    }

    // Supabase Admin APIでauth.usersにユーザー作成
    const supabaseAdmin = createAdminClient()
    const { data: authUser, error: authCreateError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        department,
        employee_id,
        phone,
      },
    })

    if (authCreateError || !authUser.user) {
      console.error('Auth user creation error:', authCreateError)
      return NextResponse.json(
        { error: `認証ユーザーの作成に失敗しました: ${authCreateError?.message || '不明なエラー'}` },
        { status: 500 }
      )
    }

    // usersテーブルに登録（auth.users.idを使用）
    // Admin clientを使用してRLSをバイパス
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.user.id,
        organization_id: userData.organization_id,
        name,
        email,
        role,
        department,
        employee_id,
        phone,
        is_active: true,
        invited_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError) {
      console.error('User creation error:', createError)
      // auth.usersには作成されているが、usersテーブルへの登録に失敗
      // ロールバックとしてauth.usersからも削除
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ error: 'スタッフの作成に失敗しました' }, { status: 500 })
    }

    // 変更履歴記録
    await supabase.from('user_history').insert({
      organization_id: userData.organization_id,
      user_id: newUser.id,
      changed_by: user.id,
      change_type: 'created',
      old_values: null,
      new_values: { name, email, role, department, employee_id, phone },
    })

    return NextResponse.json({ data: newUser }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
