import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/staff/[id] - スタッフ編集
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id: userId } = await params

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

    // 既存データ取得
    const { data: oldData, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .eq('organization_id', userData?.organization_id)
      .single()

    if (fetchError || !oldData) {
      return NextResponse.json({ error: 'スタッフが見つかりません' }, { status: 404 })
    }

    // managerは admin/manager を編集できない
    if (isManager && (oldData.role === 'admin' || oldData.role === 'manager')) {
      return NextResponse.json({ error: 'マネージャーは管理者またはマネージャーアカウントを編集できません' }, { status: 403 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { name, email, role, department, employee_id, phone } = body

    // managerは roleを admin/manager に変更できない
    if (isManager && (role === 'admin' || role === 'manager')) {
      return NextResponse.json({ error: 'マネージャーは管理者またはマネージャー権限を付与できません' }, { status: 403 })
    }

    // admin権限削除チェック（最低1人のadminが必要）
    if (oldData.role === 'admin' && role !== 'admin') {
      const { count: adminCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', userData?.organization_id)
        .eq('role', 'admin')
        .is('deleted_at', null)
        .eq('is_active', true)

      if (adminCount !== null && adminCount <= 1) {
        return NextResponse.json({ error: '最低1人のadminが必要です' }, { status: 400 })
      }
    }

    // 更新
    const { data: newData, error: updateError } = await supabase
      .from('users')
      .update({
        name,
        email,
        role,
        department,
        employee_id,
        phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .eq('organization_id', userData?.organization_id)
      .select()
      .single()

    if (updateError) {
      console.error('User update error:', updateError)
      return NextResponse.json({ error: 'スタッフの更新に失敗しました' }, { status: 500 })
    }

    // 変更履歴記録
    const changes = []

    if (oldData.department !== department) {
      changes.push({
        change_type: 'department_changed',
        old_values: { department: oldData.department },
        new_values: { department },
      })
    }

    if (oldData.role !== role) {
      changes.push({
        change_type: 'role_changed',
        old_values: { role: oldData.role },
        new_values: { role },
      })
    }

    if (changes.length > 0 || oldData.name !== name || oldData.email !== email) {
      for (const change of changes) {
        await supabase.from('user_history').insert({
          organization_id: userData?.organization_id,
          user_id: userId,
          changed_by: user.id,
          ...change,
        })
      }

      // 基本情報の変更も記録
      if (oldData.name !== name || oldData.email !== email || oldData.employee_id !== employee_id || oldData.phone !== phone) {
        await supabase.from('user_history').insert({
          organization_id: userData?.organization_id,
          user_id: userId,
          changed_by: user.id,
          change_type: 'updated',
          old_values: {
            name: oldData.name,
            email: oldData.email,
            employee_id: oldData.employee_id,
            phone: oldData.phone,
          },
          new_values: { name, email, employee_id, phone },
        })
      }
    }

    return NextResponse.json({ data: newData })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// DELETE /api/staff/[id] - スタッフ削除（論理削除）
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient()
    const { id: userId } = await params

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

    // 削除対象ユーザー取得
    const { data: targetUser, error: fetchError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .eq('organization_id', userData?.organization_id)
      .single()

    if (fetchError || !targetUser) {
      return NextResponse.json({ error: 'スタッフが見つかりません' }, { status: 404 })
    }

    // managerは admin/manager を削除できない
    if (isManager && (targetUser.role === 'admin' || targetUser.role === 'manager')) {
      return NextResponse.json({ error: 'マネージャーは管理者またはマネージャーアカウントを削除できません' }, { status: 403 })
    }

    // admin削除チェック（最低1人のadminが必要）
    if (targetUser.role === 'admin') {
      const { count: adminCount } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', userData?.organization_id)
        .eq('role', 'admin')
        .is('deleted_at', null)
        .eq('is_active', true)

      if (adminCount !== null && adminCount <= 1) {
        return NextResponse.json({ error: '最低1人のadminが必要です' }, { status: 400 })
      }
    }

    // Supabase Authからユーザーを削除
    const supabaseAdmin = createAdminClient()
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (authDeleteError) {
      console.error('Auth user delete error:', authDeleteError)
      return NextResponse.json({ error: '認証ユーザーの削除に失敗しました' }, { status: 500 })
    }

    // usersテーブルから論理削除
    const { error: deleteError } = await supabase
      .from('users')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('organization_id', userData?.organization_id)

    if (deleteError) {
      console.error('User delete error:', deleteError)
      return NextResponse.json({ error: 'スタッフの削除に失敗しました' }, { status: 500 })
    }

    // 変更履歴記録
    await supabase.from('user_history').insert({
      organization_id: userData?.organization_id,
      user_id: userId,
      changed_by: user.id,
      change_type: 'deleted',
      old_values: null,
      new_values: null,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
