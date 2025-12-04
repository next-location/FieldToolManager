import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

/**
 * POST /api/attendance/qr/site/fixed/generate
 * 管理者が現場の固定QRコードを生成（永続的に有効）
 */
export async function POST(request: NextRequest) {
  try {
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

    // リクエストボディ取得
    const body = await request.json()
    const { site_id, regenerate = false } = body

    if (!site_id) {
      return NextResponse.json({ error: '現場IDは必須です' }, { status: 400 })
    }

    // 現場存在確認と権限確認
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

    // 既存の固定QRコードを確認
    const { data: existingQR } = await supabase
      .from('site_fixed_qr_codes')
      .select('*')
      .eq('site_id', site_id)
      .eq('is_active', true)
      .single()

    // 再生成フラグがなく、既存QRがある場合はエラー
    if (existingQR && !regenerate) {
      return NextResponse.json(
        {
          error: 'この現場には既にQRコードが発行されています',
          existing: true,
          qr_data: existingQR.qr_data,
        },
        { status: 409 }
      )
    }

    // 既存QRを無効化（再生成の場合）
    if (existingQR && regenerate) {
      await supabase
        .from('site_fixed_qr_codes')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: userData.id,
        })
        .eq('id', existingQR.id)
    }

    // 新しいシークレットハッシュを生成
    const secretHash = crypto.randomBytes(32).toString('hex')

    // QRコードデータ生成
    // フォーマット: SITE_FIXED:{site_id}:{secret_hash}
    const qrData = `SITE_FIXED:${site_id}:${secretHash}`

    const now = new Date()

    // 新しい固定QRコードを登録
    const { data: newQR, error: insertError } = await supabase
      .from('site_fixed_qr_codes')
      .insert({
        organization_id: userData.organization_id,
        site_id,
        qr_data: qrData,
        secret_hash: secretHash,
        is_active: true,
        generated_by: userData.id,
        generated_at: now.toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('固定QR登録エラー:', insertError)
      return NextResponse.json(
        { error: '固定QRコードの登録に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      qr_data: qrData,
      site_name: site.name,
      site_id: site.id,
      type: 'site_fixed',
      regenerated: !!existingQR,
      message: existingQR
        ? `${site.name}の固定QRコードを再発行しました`
        : `${site.name}の固定QRコードを発行しました`,
    })
  } catch (error) {
    console.error('固定QR発行エラー:', error)
    return NextResponse.json(
      { error: '固定QRコードの発行に失敗しました' },
      { status: 500 }
    )
  }
}
