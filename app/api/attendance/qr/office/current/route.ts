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
      .eq('organization_id', userData.organization_id)
      .eq('is_active', true)
      .lte('valid_from', now.toISOString())
      .gte('valid_until', now.toISOString())
      .single()

    if (qrError || !qrCode) {
      // QRコードが存在しない場合は自動生成
      const { data: settings } = await supabase
        .from('organization_attendance_settings')
        .select('office_qr_rotation_days, office_clock_methods')
        .eq('organization_id', userData.organization_id)
        .single()

      // QRスキャンが有効でない場合はエラー
      const clockMethods = settings?.office_clock_methods as any
      if (!clockMethods?.qr_scan && !clockMethods?.qr_display) {
        return NextResponse.json({ error: 'QRコード機能が有効になっていません' }, { status: 400 })
      }

      // 自動生成（管理者のみ）
      const isAdminOrManager = ['admin', 'manager'].includes(userData.role)
      if (!isAdminOrManager) {
        return NextResponse.json({ error: 'QRコードが生成されていません。管理者に連絡してください。' }, { status: 404 })
      }

      // 自動生成ロジックを呼び出す
      const crypto = require('crypto')
      const rotationDays = settings?.office_qr_rotation_days || 7
      const randomToken = crypto.randomBytes(32).toString('hex')
      const validFrom = now
      const validUntil = new Date(now.getTime() + rotationDays * 24 * 60 * 60 * 1000)
      const qrData = `ATT:${userData.organization_id}:${randomToken}:${validUntil.toISOString()}`

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
        console.error('Auto QR generation error:', insertError)
        return NextResponse.json({ error: 'QRコードの自動生成に失敗しました' }, { status: 500 })
      }

      const daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      return NextResponse.json({
        id: newQrCode.id,
        qr_data: newQrCode.qr_data,
        valid_from: newQrCode.valid_from,
        valid_until: newQrCode.valid_until,
        days_remaining: daysRemaining,
      })
    }

    // 有効期限までの日数を計算
    const validUntil = new Date(qrCode.valid_until)
    const daysRemaining = Math.ceil((validUntil.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

    return NextResponse.json({
      id: qrCode.id,
      qr_data: qrCode.qr_data,
      valid_from: qrCode.valid_from,
      valid_until: qrCode.valid_until,
      days_remaining: daysRemaining,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
