import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/attendance/terminal/[token] - タブレット用QR表示画面データ取得
export async function GET(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const supabase = await createClient()
    const { token: accessToken } = await params

    // アクセストークンで端末を検証
    const { data: terminal, error: terminalError } = await supabase
      .from('terminal_devices')
      .select(`
        *,
        organization:organizations(id, name),
        site:sites(id, name)
      `)
      .eq('access_token', accessToken)
      .eq('is_active', true)
      .single()

    if (terminalError || !terminal) {
      return NextResponse.json({ error: '無効なアクセストークンです' }, { status: 404 })
    }

    // 最終アクセス時刻を更新
    await supabase
      .from('terminal_devices')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', terminal.id)

    let currentQr: any = null

    if (terminal.device_type === 'office') {
      // 会社用QRコードを取得
      const now = new Date()
      const { data: qrCode } = await supabase
        .from('office_qr_codes')
        .select('*')
        .eq('organization_id', terminal.organization_id)
        .eq('is_active', true)
        .lte('valid_from', now.toISOString())
        .gte('valid_until', now.toISOString())
        .single()

      if (qrCode) {
        currentQr = {
          qr_data: qrCode.qr_data,
          valid_until: qrCode.valid_until,
        }
      } else {
        // QRが存在しない場合は自動生成
        const { data: settings } = await supabase
          .from('organization_attendance_settings')
          .select('office_qr_rotation_days')
          .eq('organization_id', terminal.organization_id)
          .single()

        const rotationDays = settings?.office_qr_rotation_days || 7
        const crypto = require('crypto')
        const randomToken = crypto.randomBytes(32).toString('hex')
        const validFrom = now
        const validUntil = new Date(now.getTime() + rotationDays * 24 * 60 * 60 * 1000)
        const qrData = `ATT:${terminal.organization_id}:${randomToken}:${validUntil.toISOString()}`

        const { data: newQrCode } = await supabase
          .from('office_qr_codes')
          .insert({
            organization_id: terminal.organization_id,
            qr_data: qrData,
            valid_from: validFrom.toISOString(),
            valid_until: validUntil.toISOString(),
            is_active: true,
          })
          .select()
          .single()

        if (newQrCode) {
          currentQr = {
            qr_data: newQrCode.qr_data,
            valid_until: newQrCode.valid_until,
          }
        }
      }
    } else if (terminal.device_type === 'site' && terminal.site_id) {
      // 現場用固定QRコードを取得
      const { data: siteQr } = await supabase
        .from('site_qr_codes')
        .select('*')
        .eq('site_id', terminal.site_id)
        .eq('qr_type', 'fixed')
        .eq('is_active', true)
        .single()

      if (siteQr) {
        currentQr = {
          qr_data: siteQr.qr_data,
          valid_until: siteQr.expires_at,
        }
      } else {
        // 固定QRが存在しない場合は生成
        const crypto = require('crypto')
        const secretHash = crypto.randomBytes(32).toString('hex')
        const qrData = `SITE_FIXED:${terminal.site_id}:${secretHash}`

        const { data: newSiteQr } = await supabase
          .from('site_qr_codes')
          .insert({
            organization_id: terminal.organization_id,
            site_id: terminal.site_id,
            qr_type: 'fixed',
            qr_data: qrData,
            expires_at: null, // 固定QRは期限なし
            is_active: true,
          })
          .select()
          .single()

        if (newSiteQr) {
          currentQr = {
            qr_data: newSiteQr.qr_data,
            valid_until: null,
          }
        }
      }
    }

    return NextResponse.json({
      organization_name: terminal.organization.name,
      device_type: terminal.device_type,
      device_name: terminal.device_name,
      site_name: terminal.site?.name || null,
      current_qr: currentQr,
      refresh_interval: 30, // 30秒ごとに更新
    })
  } catch (error) {
    console.error('Terminal display error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました' }, { status: 500 })
  }
}
