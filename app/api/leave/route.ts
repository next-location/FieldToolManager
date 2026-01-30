import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

// GET /api/leave - 休暇一覧取得
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

    // ユーザー情報取得
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
    const status = searchParams.get('status') // pending/approved/rejected
    const userId = searchParams.get('user_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    // ベースクエリ（管理者は全員分、スタッフは自分の分のみ）
    let query = supabase
      .from('user_leave_records')
      .select(`
        *,
        user:users!user_leave_records_user_id_fkey (
          id,
          name,
          email,
          department
        ),
        created_by_user:users!user_leave_records_created_by_fkey (
          id,
          name
        )
      `)
      .eq('organization_id', userData.organization_id)

    // 権限によるフィルタ
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    if (!isAdminOrManager) {
      // スタッフは自分の休暇のみ
      query = query.eq('user_id', user.id)
    }

    // ステータスフィルタ
    if (status) {
      query = query.eq('status', status)
    }

    // ユーザーIDフィルタ（管理者のみ有効）
    if (userId && isAdminOrManager) {
      query = query.eq('user_id', userId)
    }

    // 日付範囲フィルタ
    if (startDate) {
      query = query.gte('leave_date', startDate)
    }
    if (endDate) {
      query = query.lte('leave_date', endDate)
    }

    // ソート（日付降順）
    query = query.order('leave_date', { ascending: false })

    const { data: leaves, error: leavesError } = await query

    if (leavesError) {
      console.error('Leaves fetch error:', leavesError)
      return NextResponse.json({ error: '休暇データの取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ leaves })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// POST /api/leave - 休暇申請作成
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
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { user_id, leave_date, leave_type, reason, notes } = body

    // 必須項目チェック
    if (!leave_date || !leave_type) {
      return NextResponse.json({ error: '必須項目が不足しています' }, { status: 400 })
    }

    // 休暇種別チェック
    if (!['paid', 'sick', 'personal', 'other'].includes(leave_type)) {
      return NextResponse.json({ error: '無効な休暇種別です' }, { status: 400 })
    }

    // 不審なパターン検出
    if (reason && hasSuspiciousPattern(reason)) {
      return NextResponse.json(
        { error: '理由に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）' },
        { status: 400 }
      )
    }
    if (notes && hasSuspiciousPattern(notes)) {
      return NextResponse.json(
        { error: '備考に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）' },
        { status: 400 }
      )
    }

    // 対象ユーザーの決定（管理者は他人の休暇も作成可能）
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    const targetUserId = isAdminOrManager && user_id ? user_id : user.id

    // 同日の休暇が既に存在しないかチェック
    const { data: existing } = await supabase
      .from('user_leave_records')
      .select('id')
      .eq('user_id', targetUserId)
      .eq('leave_date', leave_date)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'この日付には既に休暇が登録されています' }, { status: 400 })
    }

    // 休暇作成（常にstatus='approved'、HTMLエスケープ適用）
    const { data: newLeave, error: insertError } = await supabase
      .from('user_leave_records')
      .insert({
        user_id: targetUserId,
        organization_id: userData.organization_id,
        leave_date,
        leave_type,
        reason: reason ? escapeHtml(reason) : null,
        notes: notes ? escapeHtml(notes) : null,
        status: 'approved', // 常に承認済みで登録
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Leave insert error:', insertError)
      return NextResponse.json({ error: '休暇の登録に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, leave: newLeave })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
