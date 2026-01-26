import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/leave/[id] - 特定休暇取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // 休暇取得（RLSポリシーで権限チェック）
    const { data: leave, error: leaveError } = await supabase
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
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (leaveError || !leave) {
      return NextResponse.json({ error: '休暇が見つかりません' }, { status: 404 })
    }

    return NextResponse.json({ leave })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// PATCH /api/leave/[id] - 休暇更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // 既存休暇取得
    const { data: existingLeave, error: fetchError } = await supabase
      .from('user_leave_records')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !existingLeave) {
      return NextResponse.json({ error: '休暇が見つかりません' }, { status: 404 })
    }

    // 権限チェック（管理者または本人のみ）
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    const isOwner = existingLeave.user_id === user.id

    if (!isAdminOrManager && !isOwner) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { leave_date, leave_type, reason, notes, status } = body

    // 更新データ準備
    const updateData: any = {
      updated_at: new Date().toISOString(),
    }

    if (leave_date !== undefined) updateData.leave_date = leave_date
    if (leave_type !== undefined) {
      if (!['paid', 'sick', 'personal', 'other'].includes(leave_type)) {
        return NextResponse.json({ error: '無効な休暇種別です' }, { status: 400 })
      }
      updateData.leave_type = leave_type
    }
    if (reason !== undefined) updateData.reason = reason
    if (notes !== undefined) updateData.notes = notes

    // ステータス変更は管理者のみ
    if (status !== undefined && isAdminOrManager) {
      if (!['pending', 'approved', 'rejected'].includes(status)) {
        return NextResponse.json({ error: '無効なステータスです' }, { status: 400 })
      }
      updateData.status = status
    }

    // 日付変更時の重複チェック
    if (leave_date && leave_date !== existingLeave.leave_date) {
      const { data: duplicate } = await supabase
        .from('user_leave_records')
        .select('id')
        .eq('user_id', existingLeave.user_id)
        .eq('leave_date', leave_date)
        .neq('id', id)
        .single()

      if (duplicate) {
        return NextResponse.json({ error: 'この日付には既に休暇が登録されています' }, { status: 400 })
      }
    }

    // 更新実行
    const { data: updatedLeave, error: updateError } = await supabase
      .from('user_leave_records')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (updateError) {
      console.error('Leave update error:', updateError)
      return NextResponse.json({ error: '休暇の更新に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true, leave: updatedLeave })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// DELETE /api/leave/[id] - 休暇削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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

    // 既存休暇取得
    const { data: existingLeave, error: fetchError } = await supabase
      .from('user_leave_records')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !existingLeave) {
      return NextResponse.json({ error: '休暇が見つかりません' }, { status: 404 })
    }

    // 権限チェック（管理者または本人のみ）
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    const isOwner = existingLeave.user_id === user.id

    if (!isAdminOrManager && !isOwner) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // 削除実行
    const { error: deleteError } = await supabase
      .from('user_leave_records')
      .delete()
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (deleteError) {
      console.error('Leave delete error:', deleteError)
      return NextResponse.json({ error: '休暇の削除に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
