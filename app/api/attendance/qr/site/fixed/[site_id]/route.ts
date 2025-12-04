import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/attendance/qr/site/fixed/[site_id]
 * 現場の固定QRコードを取得
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ site_id: string }> }
) {
  try {
    const { site_id } = await params
    const supabase = await createClient()

    // 認証確認
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
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 管理者権限確認
    if (!['manager', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 現場存在確認
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, organization_id')
      .eq('id', site_id)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: '現場が見つかりません、または権限がありません' },
        { status: 404 }
      )
    }

    // 固定QRコードを取得
    const { data: qrCode, error: qrError } = await supabase
      .from('site_fixed_qr_codes')
      .select('*')
      .eq('site_id', site_id)
      .eq('is_active', true)
      .single()

    if (qrError || !qrCode) {
      return NextResponse.json(
        { error: 'この現場の固定QRコードは発行されていません', exists: false },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      qr_data: qrCode.qr_data,
      site_name: site.name,
      site_id: site.id,
      generated_at: qrCode.generated_at,
      type: 'site_fixed',
    })
  } catch (error) {
    console.error('固定QR取得エラー:', error)
    return NextResponse.json({ error: '固定QRコードの取得に失敗しました' }, { status: 500 })
  }
}

/**
 * DELETE /api/attendance/qr/site/fixed/[site_id]
 * 現場の固定QRコードを無効化
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ site_id: string }> }
) {
  try {
    const { site_id } = await params
    const supabase = await createClient()

    // 認証確認
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
      .select('id, organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // 管理者権限確認
    if (!['manager', 'admin'].includes(userData.role)) {
      return NextResponse.json({ error: '管理者権限が必要です' }, { status: 403 })
    }

    // 現場存在確認
    const { data: site, error: siteError } = await supabase
      .from('sites')
      .select('id, name, organization_id')
      .eq('id', site_id)
      .eq('organization_id', userData.organization_id)
      .is('deleted_at', null)
      .single()

    if (siteError || !site) {
      return NextResponse.json(
        { error: '現場が見つかりません、または権限がありません' },
        { status: 404 }
      )
    }

    // 固定QRコードを無効化
    const { error: updateError } = await supabase
      .from('site_fixed_qr_codes')
      .update({
        is_active: false,
        deactivated_at: new Date().toISOString(),
        deactivated_by: userData.id,
      })
      .eq('site_id', site_id)
      .eq('is_active', true)

    if (updateError) {
      console.error('固定QR無効化エラー:', updateError)
      return NextResponse.json(
        { error: '固定QRコードの無効化に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${site.name}の固定QRコードを無効化しました`,
    })
  } catch (error) {
    console.error('固定QR無効化エラー:', error)
    return NextResponse.json(
      { error: '固定QRコードの無効化に失敗しました' },
      { status: 500 }
    )
  }
}
