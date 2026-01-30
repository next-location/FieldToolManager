import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logProjectCreated } from '@/lib/audit-log'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

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
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const sortField = searchParams.get('sort_field') || 'start_date'
    const sortOrder = searchParams.get('sort_order') || 'desc'

    // 工事一覧取得（client, siteのリレーションも含む）
    let query = supabase
      .from('projects')
      .select(`
        *,
        client:clients(name),
        site:sites(id, name, address)
      `, { count: 'exact' })
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)

    // フィルター適用
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(
        `project_name.ilike.%${search}%,project_code.ilike.%${search}%`
      )
    }

    // ソート順を適用
    const validSortFields = ['start_date', 'end_date', 'contract_amount']
    const finalSortField = validSortFields.includes(sortField) ? sortField : 'start_date'
    const ascending = sortOrder === 'asc'

    const { data: projects, error, count } = await query
      .order(finalSortField, { ascending })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching projects:', error)
      return NextResponse.json({ error: '工事の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      data: projects,
      count,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// POST /api/projects - 工事作成
export async function POST(request: NextRequest) {
  // CSRF検証（セキュリティ強化）
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

    // 不審なパターン検出
    const textFields = [
      { field: 'project_name', value: body.project_name, label: '工事名' },
      { field: 'project_code', value: body.project_code, label: '工事番号' },
    ]

    for (const { value, label } of textFields) {
      if (value && hasSuspiciousPattern(value)) {
        return NextResponse.json(
          { error: `${label}に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）` },
          { status: 400 }
        )
      }
    }

    // HTMLエスケープ処理
    const sanitizedProjectName = escapeHtml(body.project_name)
    const sanitizedProjectCode = escapeHtml(body.project_code)

    // 工事作成
    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        organization_id: userData.organization_id,
        project_code: sanitizedProjectCode,
        project_name: sanitizedProjectName,
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
    }, user.id, userData.organization_id)

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
