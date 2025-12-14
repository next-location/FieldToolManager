import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST - 見積書を承認
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // 認証チェック
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // ユーザー情報取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, organization_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
  }

  // 権限チェック: manager, admin, super_admin のみ承認可能
  if (!['manager', 'admin', 'super_admin'].includes(userData.role)) {
    return NextResponse.json({ error: '承認権限がありません' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { notes } = body

    // 見積書が存在し、組織が一致するか確認
    const { data: estimate, error: fetchError } = await supabase
      .from('estimates')
      .select('id, organization_id, status, manager_approved_at')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !estimate) {
      return NextResponse.json({ error: '見積書が見つかりません' }, { status: 404 })
    }

    // 提出済み状態のみ承認可能
    if (estimate.status !== 'submitted') {
      return NextResponse.json({ error: '提出済み（確定）状態の見積書のみ承認できます' }, { status: 400 })
    }

    // 既に承認済みの場合
    if (estimate.manager_approved_at) {
      return NextResponse.json({ error: 'この見積書は既に承認されています' }, { status: 400 })
    }

    // 承認処理
    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        manager_approved_by: userData.id,
        manager_approved_at: new Date().toISOString(),
        manager_approval_notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (updateError) {
      console.error('Approval error:', updateError)
      return NextResponse.json({ error: '承認処理に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      message: '見積書を承認しました',
      approved_at: new Date().toISOString()
    }, { status: 200 })

  } catch (error) {
    console.error('Error approving estimate:', error)
    return NextResponse.json({ error: '承認処理に失敗しました' }, { status: 500 })
  }
}

// DELETE - 承認を取り消し
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  // 認証チェック
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  // ユーザー情報取得
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id, organization_id, role')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
  }

  // 権限チェック: manager, admin, super_admin のみ取り消し可能
  if (!['manager', 'admin', 'super_admin'].includes(userData.role)) {
    return NextResponse.json({ error: '承認取り消し権限がありません' }, { status: 403 })
  }

  try {
    // 見積書が存在し、組織が一致するか確認
    const { data: estimate, error: fetchError } = await supabase
      .from('estimates')
      .select('id, organization_id, status, manager_approved_at')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (fetchError || !estimate) {
      return NextResponse.json({ error: '見積書が見つかりません' }, { status: 404 })
    }

    // 承認されていない場合
    if (!estimate.manager_approved_at) {
      return NextResponse.json({ error: 'この見積書は承認されていません' }, { status: 400 })
    }

    // 提出済み状態のみ承認取り消し可能（顧客送付済みは取り消し不可）
    if (estimate.status !== 'submitted') {
      return NextResponse.json({ error: '顧客送付済みの見積書の承認は取り消しできません' }, { status: 400 })
    }

    // 承認取り消し処理
    const { error: updateError } = await supabase
      .from('estimates')
      .update({
        manager_approved_by: null,
        manager_approved_at: null,
        manager_approval_notes: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)

    if (updateError) {
      console.error('Unapproval error:', updateError)
      return NextResponse.json({ error: '承認取り消し処理に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      message: '承認を取り消しました'
    }, { status: 200 })

  } catch (error) {
    console.error('Error unapproving estimate:', error)
    return NextResponse.json({ error: '承認取り消し処理に失敗しました' }, { status: 500 })
  }
}
