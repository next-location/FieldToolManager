import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/attendance/qr/office/current - 現在有効な会社QRコードを取得
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

    // 現在有効なQRコードを取得
    const now = new Date()
    const { data: qrCode, error: qrError } = await supabase
      .from('office_qr_codes')
      .select('*')
      .eq('organization_id', userData?.organization_id)
      .eq('is_active', true)
      .lte('valid_from', now.toISOString())
      .gte('valid_until', now.toISOString())
      .single()

    if (qrError || !qrCode) {
      // QRコードが存在しない場合は404を返す（自動生成しない）
      return NextResponse.json({ error: 'QRコードが生成されていません' }, { status: 404 })
    }

    // 有効期限までの日数を計算
    const validUntil = new Date(qrCode.valid_until)
    const daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    // QRコード画像を生成（サーバーサイドで生成）
    const QRCode = require('qrcode')
    let qrImage: string
    try {
      qrImage = await QRCode.toDataURL(qrCode.qr_data, {
        width: 400,
        margin: 2,
        errorCorrectionLevel: 'M',
      })
    } catch (qrError) {
      console.error('QR image generation error:', qrError)
      return NextResponse.json({ error: 'QR画像の生成に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({
      id: qrCode.id,
      qr_data: qrCode.qr_data,
      qr_image: qrImage,
      valid_from: qrCode.valid_from,
      valid_until: qrCode.valid_until,
      days_remaining: daysRemaining,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
