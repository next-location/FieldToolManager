import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { logProjectUpdated } from '@/lib/audit-log'
import { escapeHtml, hasSuspiciousPattern } from '@/lib/security/html-escape'

// PATCH /api/projects/[id] - 工事更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // 更新前のデータを取得（監査ログ用）
    const { data: oldProject } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .single()

    if (!oldProject) {
      return NextResponse.json({ error: '工事が見つかりません' }, { status: 404 })
    }

    // リクエストボディ取得
    const body = await request.json()

    // 不審なパターン検出
    if (body.project_name && hasSuspiciousPattern(body.project_name)) {
      return NextResponse.json(
        { error: '工事名に不正な文字列が含まれています（HTMLタグやスクリプトは使用できません）' },
        { status: 400 }
      )
    }

    // HTMLエスケープ処理
    const sanitizedProjectName = body.project_name ? escapeHtml(body.project_name) : undefined

    // 工事更新
    const { data: project, error } = await supabase
      .from('projects')
      .update({
        project_name: sanitizedProjectName,
        client_id: body.client_id || null,
        start_date: body.start_date || null,
        end_date: body.end_date || null,
        contract_amount: body.contract_amount || null,
        budget_amount: body.budget_amount || null,
        status: body.status,
        project_manager_id: body.project_manager_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('organization_id', userData.organization_id)
      .select()
      .single()

    if (error) {
      console.error('Error updating project:', error)
      return NextResponse.json({ error: '工事の更新に失敗しました' }, { status: 500 })
    }

    if (!project) {
      return NextResponse.json({ error: '工事が見つかりません' }, { status: 404 })
    }

    // 監査ログを記録
    await logProjectUpdated(
      project.id,
      {
        project_name: oldProject.project_name,
        client_id: oldProject.client_id,
        start_date: oldProject.start_date,
        end_date: oldProject.end_date,
        contract_amount: oldProject.contract_amount,
        budget_amount: oldProject.budget_amount,
        status: oldProject.status,
        project_manager_id: oldProject.project_manager_id,
      },
      {
        project_name: project.project_name,
        client_id: project.client_id,
        start_date: project.start_date,
        end_date: project.end_date,
        contract_amount: project.contract_amount,
        budget_amount: project.budget_amount,
        status: project.status,
        project_manager_id: project.project_manager_id,
      },
      user.id,
      userData.organization_id
    )

    return NextResponse.json({ data: project })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
