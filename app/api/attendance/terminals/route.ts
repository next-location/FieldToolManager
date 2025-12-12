import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// GET /api/attendance/terminals - タブレット端末一覧取得
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

    // 権限チェック（admin または manager のみ）
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    if (!isAdminOrManager) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // タブレット端末一覧取得
    const { data: terminals, error: terminalsError } = await supabase
      .from('terminal_devices')
      .select(`
        *,
        site:sites(id, name)
      `)
      .eq('organization_id', userData?.organization_id)
      .order('created_at', { ascending: false })

    if (terminalsError) {
      console.error('Terminals fetch error:', terminalsError)
      return NextResponse.json({ error: '端末一覧の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ terminals })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}

// POST /api/attendance/terminals - タブレット端末登録
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

    // 権限チェック（admin または manager のみ）
    const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
    if (!isAdminOrManager) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // リクエストボディ
    const body = await request.json()
    const { device_name, device_type, site_id } = body

    // バリデーション
    if (!device_name || device_name.trim() === '') {
      return NextResponse.json({ error: '端末名は必須です' }, { status: 400 })
    }

    if (!['office', 'site'].includes(device_type)) {
      return NextResponse.json({ error: '端末タイプが不正です（office または site）' }, { status: 400 })
    }

    if (device_type === 'site' && !site_id) {
      return NextResponse.json({ error: '現場端末の場合はsite_idが必要です' }, { status: 400 })
    }

    // 現場の存在確認（現場端末の場合）
    if (device_type === 'site' && site_id) {
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('id')
        .eq('id', site_id)
        .eq('organization_id', userData?.organization_id)
        .is('deleted_at', null)
        .single()

      if (siteError || !site) {
        return NextResponse.json({ error: '指定された現場が見つかりません' }, { status: 404 })
      }
    }

    // アクセストークン生成（64文字のランダム文字列）
    const accessToken = crypto.randomBytes(32).toString('hex')

    // 端末登録
    const { data: newTerminal, error: insertError } = await supabase
      .from('terminal_devices')
      .insert({
        organization_id: userData?.organization_id,
        device_name,
        device_type,
        site_id: device_type === 'site' ? site_id : null,
        access_token: accessToken,
        is_active: true,
        created_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Terminal registration error:', insertError)
      return NextResponse.json({ error: '端末の登録に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      terminal: newTerminal,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
