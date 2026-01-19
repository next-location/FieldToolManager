import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifySessionToken } from '@/lib/auth/impersonation'
import { cookies } from 'next/headers'
import { logUserCreated } from '@/lib/audit-log'

interface StaffImportRow {
  name: string
  email: string
  password: string
  role: 'admin' | 'leader' | 'staff'
  department?: string
  employee_id?: string
  phone?: string
}

// POST /api/staff/bulk-import - CSV一括登録
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { staff } = body as { staff: StaffImportRow[] }

    if (!staff || !Array.isArray(staff) || staff.length === 0) {
      return NextResponse.json({ error: 'スタッフデータが不正です' }, { status: 400 })
    }

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // なりすましログインチェック
    const cookieStore = await cookies()
    const impersonationToken = cookieStore.get('impersonation_session')?.value
    const impersonationSession = impersonationToken
      ? await verifySessionToken(impersonationToken)
      : null

    if (!impersonationSession) {
      return NextResponse.json(
        { error: 'この機能はスーパー管理者のなりすましログイン時のみ利用できます' },
        { status: 403 }
      )
    }

    // ユーザーの組織ID・権限取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 権限チェック（adminのみ）
    if (userData.role !== 'admin') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // 組織情報取得（プラン上限確認）
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('max_users')
      .eq('id', userData?.organization_id)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: '組織情報が見つかりません' }, { status: 404 })
    }

    // 現在のスタッフ数取得
    const { count: currentCount } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', userData?.organization_id)
      .is('deleted_at', null)
      .eq('is_active', true)

    const currentStaffCount = currentCount || 0

    // プラン上限チェック
    const totalAfterImport = currentStaffCount + staff.length
    if (totalAfterImport > org.max_users) {
      return NextResponse.json(
        {
          error: 'プランの上限を超えています',
          current_count: currentStaffCount,
          max_users: org.max_users,
          import_count: staff.length,
          available_slots: org.max_users - currentStaffCount,
        },
        { status: 400 }
      )
    }

    // メールアドレスの重複チェック
    const emails = staff.map((s) => s.email.toLowerCase())
    const { data: existingUsers } = await supabase
      .from('users')
      .select('email')
      .eq('organization_id', userData?.organization_id)
      .in('email', emails)

    if (existingUsers && existingUsers.length > 0) {
      const duplicateEmails = existingUsers.map((u) => u.email)
      return NextResponse.json(
        {
          error: '重複するメールアドレスがあります',
          duplicate_emails: duplicateEmails,
        },
        { status: 400 }
      )
    }

    // バリデーション
    const errors: string[] = []
    staff.forEach((s, index) => {
      if (!s.name || s.name.trim() === '') {
        errors.push(`行${index + 1}: 名前が必要です`)
      }
      if (!s.email || s.email.trim() === '' || !s.email.includes('@')) {
        errors.push(`行${index + 1}: 有効なメールアドレスが必要です`)
      }
      if (!s.password || s.password.length < 8) {
        errors.push(`行${index + 1}: パスワードは8文字以上が必要です`)
      }
      if (!['admin', 'leader', 'staff'].includes(s.role)) {
        errors.push(`行${index + 1}: 権限はadmin、leader、staffのいずれかを指定してください`)
      }
    })

    if (errors.length > 0) {
      return NextResponse.json({ error: 'バリデーションエラー', validation_errors: errors }, { status: 400 })
    }

    // 一括登録処理
    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    }

    for (let i = 0; i < staff.length; i++) {
      const s = staff[i]
      try {
        // Supabase Authでユーザー作成
        const { data: authData, error: authCreateError } = await supabase.auth.admin.createUser({
          email: s.email,
          password: s.password,
          email_confirm: true,
        })

        if (authCreateError) {
          results.failed++
          results.errors.push(`行${i + 1} (${s.email}): ${authCreateError.message}`)
          continue
        }

        // usersテーブルにレコード追加
        const { error: insertError } = await supabase.from('users').insert({
          id: authData.user.id,
          organization_id: userData?.organization_id,
          name: s.name,
          email: s.email.toLowerCase(),
          role: s.role,
          department: s.department || null,
          employee_id: s.employee_id || null,
          phone: s.phone || null,
          is_active: true,
          invited_at: new Date().toISOString(),
        })

        if (insertError) {
          // Auth作成は成功したがusersテーブル挿入失敗
          // 本来はAuth削除のロールバックが望ましい
          results.failed++
          results.errors.push(`行${i + 1} (${s.email}): データベース挿入失敗`)
          continue
        }

        // 履歴記録
        await supabase.from('user_history').insert({
          organization_id: userData?.organization_id,
          user_id: authData.user.id,
          changed_by: user.id,
          change_type: 'created',
          old_values: {},
          new_values: {
            name: s.name,
            email: s.email,
            role: s.role,
            department: s.department,
            employee_id: s.employee_id,
            phone: s.phone,
          },
          notes: 'CSV一括登録',
        })

        // 監査ログ記録（パスワードは除外）
        await logUserCreated(authData.user.id, {
          name: s.name,
          email: s.email,
          role: s.role,
          department: s.department,
          employee_id: s.employee_id,
          phone: s.phone,
          is_active: true,
          bulk_import: true,
        })

        results.success++
      } catch (error: any) {
        results.failed++
        results.errors.push(`行${i + 1} (${s.email}): ${error.message}`)
      }
    }

    return NextResponse.json({
      message: `一括登録完了: 成功${results.success}件、失敗${results.failed}件`,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
