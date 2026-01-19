import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { logProjectCreated } from '@/lib/audit-log'

// GET /api/projects - 工事一覧取得
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // クエリパラメータ取得
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // 工事一覧取得
    let query = supabase
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('organization_id', userData.organization_id)

    // フィルター適用
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(
        `project_name.ilike.%${search}%,project_code.ilike.%${search}%`
      )
    }

    // ページネーション
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: projects, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: '工事の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      data: projects,
      total: count || 0,
      page,
      limit,
      total_pages: Math.ceil((count || 0) / limit),
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// POST /api/projects - 工事作成
export async function POST(request: NextRequest) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[PROJECTS CREATE API] CSRF validation failed')
    return csrfErrorResponse()
  }

  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザー情報取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 管理者またはリーダー権限チェック
    if (!['admin', 'leader'].includes(userData.role)) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()

    // 必須項目チェック
    if (!body.project_name || !body.project_code) {
      return NextResponse.json(
        { error: '工事名と工事番号は必須です' },
        { status: 400 }
      )
    }

    // 工事作成
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        organization_id: userData.organization_id,
        project_code: body.project_code,
        project_name: body.project_name,
        client_id: body.client_id || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        contract_amount: body.contract_amount || null,
        budget_amount: body.budget_amount || null,
        status: body.status || 'planning',
        project_manager_id: body.project_manager_id || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'この工事番号は既に登録されています' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: '工事の作成に失敗しました' }, { status: 500 })
    }

    // 監査ログを記録
    await logProjectCreated(project.id, {
      project_code: project.project_code,
      project_name: project.project_name,
      client_id: project.client_id,
      start_date: project.start_date,
      end_date: project.end_date,
      contract_amount: project.contract_amount,
      budget_amount: project.budget_amount,
      status: project.status,
      project_manager_id: project.project_manager_id,
    })

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
