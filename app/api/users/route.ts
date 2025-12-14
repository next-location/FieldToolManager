import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/users - ユーザー一覧取得
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
    const isActive = searchParams.get('is_active')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')

    // ユーザー一覧取得（同じ組織のユーザーのみ）
    let query = supabase
      .from('users')
      .select('id, name, email, role, is_active, department, created_at', { count: 'exact' })
      .eq('organization_id', userData.organization_id)

    // フィルター適用
    if (isActive === 'true') {
      query = query.eq('is_active', true)
    } else if (isActive === 'false') {
      query = query.eq('is_active', false)
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    // ページネーション
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: users, error, count } = await query
      .order('name', { ascending: true })
      .range(from, to)

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'ユーザーの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      data: users,
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
