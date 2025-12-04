import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// POST /api/attendance/qr/office/generate - 会社QRコードの手動生成（管理者のみ）
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

    // 組織の出退勤設定を取得
    const { data: settings, error: settingsError } = await supabase
      .from('organization_attendance_settings')
      .select('office_qr_rotation_days')
      .eq('organization_id', userData.organization_id)
      .single()

    if (settingsError) {
      return NextResponse.json({ error: '組織設定が見つかりません' }, { status: 404 })
    }

    const rotationDays = settings.office_qr_rotation_days || 7

    // 既存の有効なQRコードを無効化
    const now = new Date()
    await supabase
      .from('office_qr_codes')
      .update({ is_active: false })
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)

    // 新しいQRコードを生成
    const randomToken = crypto.randomBytes(32).toString('hex')
    const validFrom = now
    const validUntil = new Date(now.getTime() + rotationDays * 24 * 60 * 60 * 1000)

    // QRデータフォーマット: ATT:${organization_id}:${random_token}:${valid_until}
    const qrData = `ATT:${userData.organization_id}:${randomToken}:${validUntil.toISOString()}`

    // データベースに保存
    const { data: newQrCode, error: insertError } = await supabase
      .from('office_qr_codes')
      .insert({
        organization_id: userData.organization_id,
        qr_data: qrData,
        valid_from: validFrom.toISOString(),
        valid_until: validUntil.toISOString(),
        is_active: true,
      })
      .select()
      .single()

    if (insertError) {
      console.error('QR code generation error:', insertError)
      return NextResponse.json({ error: 'QRコードの生成に失敗しました' }, { status: 500 })
    }

    // 有効期限までの日数を計算
    const daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      success: true,
      qr_code: {
        id: newQrCode.id,
        qr_data: newQrCode.qr_data,
        valid_from: newQrCode.valid_from,
        valid_until: newQrCode.valid_until,
        days_remaining: daysRemaining,
      },
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
