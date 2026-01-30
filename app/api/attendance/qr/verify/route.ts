import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'

export async function POST(request: NextRequest) {
  // 🔒 CSRF検証
  const isValidCsrf = await verifyCsrfToken(request)
  if (!isValidCsrf) {
    console.error('[API /api/attendance/qr/verify] CSRF validation failed')
    return csrfErrorResponse()
  }

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
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'ユーザー情報が見つかりません' }, { status: 404 })
    }

    // リクエストボディ
    const body = await request.json()
    const { qr_data } = body

    if (!qr_data || typeof qr_data !== 'string') {
      return NextResponse.json({ error: 'QRデータが無効です' }, { status: 400 })
    }

    // JSON形式のQRデータを先にチェック
    try {
      const jsonData = JSON.parse(qr_data)

      // JSON形式のリーダーQRコード
      if (jsonData.type === 'site_leader' && jsonData.site_id) {
        // 現場の存在確認
        const { data: site, error: siteError } = await supabase
          .from('sites')
          .select('id, organization_id')
          .eq('id', jsonData.site_id)
          .is('deleted_at', null)
          .single()

        if (siteError || !site) {
          return NextResponse.json({ error: '現場が見つかりません', valid: false }, { status: 404 })
        }

        // 組織のチェック
        if (site.organization_id !== userData?.organization_id) {
          return NextResponse.json({ error: '異なる組織の現場です', valid: false }, { status: 403 })
        }

        // 有効期限のチェック
        if (jsonData.expires_at) {
          const expiresAt = new Date(jsonData.expires_at)
          const now = new Date()
          if (now > expiresAt) {
            return NextResponse.json({ error: 'QRコードの有効期限が切れています', valid: false }, { status: 400 })
          }
        }

        return NextResponse.json({
          valid: true,
          type: 'site',
          organization_id: site.organization_id,
          site_id: jsonData.site_id,
          leader_id: jsonData.leader_id,
        })
      }
    } catch (e) {
      // JSONパースエラー → 旧形式として処理続行
    }

    // QRデータのフォーマットを解析
    // 会社QR: ATT|${organization_id}|${random_token}|${valid_until}
    // 現場QR: SITE:${site_id}:${leader_id}:${date}
    // 固定現場QR: SITE_FIXED:${site_id}:${secret_hash}

    let parts: string[]
    let separator: string

    console.log('[QR VERIFY] Raw QR data:', qr_data)
    console.log('[QR VERIFY] Starts with ATT|?', qr_data.startsWith('ATT|'))
    console.log('[QR VERIFY] Starts with ATT:?', qr_data.startsWith('ATT:'))

    // 会社QRの処理（新形式は|区切り、旧形式は:区切り）
    if (qr_data.startsWith('ATT|')) {
      separator = '|'
      parts = qr_data.split(separator)
      console.log('[QR VERIFY] Using | separator, parts:', parts)
    } else if (qr_data.startsWith('ATT:')) {
      // 旧形式: ATT:org:token:2025-12-12T05:49:45.168Z
      // :で分割すると ISO 日付の : も分割されるため、手動で解析
      separator = ':'
      const colonParts = qr_data.split(':')
      console.log('[QR VERIFY] Using : separator, colonParts length:', colonParts.length)
      console.log('[QR VERIFY] colonParts:', colonParts)
      if (colonParts.length === 6) {
        // ['ATT', 'org', 'token', '2025-12-12T05', '49', '45.168Z'] → 4要素に結合
        parts = [
          colonParts[0],
          colonParts[1],
          colonParts[2],
          `${colonParts[3]}:${colonParts[4]}:${colonParts[5]}`,
        ]
        console.log('[QR VERIFY] Reconstructed parts:', parts)
      } else {
        parts = colonParts
      }
    } else {
      // 現場QR（:区切り）
      separator = ':'
      parts = qr_data.split(separator)
      console.log('[QR VERIFY] Site QR, parts:', parts)
    }

    console.log('[QR VERIFY] Final QR data parts:', parts)
    console.log('[QR VERIFY] QR data type:', parts[0])
    console.log('[QR VERIFY] Separator used:', separator)

    if (parts[0] === 'ATT') {
      // 会社QRコードの検証
      if (parts.length !== 4) {
        console.error('[QR VERIFY] Invalid ATT format. Parts length:', parts.length, 'Expected: 4')
        return NextResponse.json({ error: 'QRデータのフォーマットが不正です', valid: false }, { status: 400 })
      }

      const [, organizationId, token, validUntilStr] = parts

      // 組織IDのチェック
      if (organizationId !== userData?.organization_id) {
        return NextResponse.json({ error: '異なる組織のQRコードです', valid: false }, { status: 403 })
      }

      // 有効期限のチェック
      const validUntil = new Date(validUntilStr)
      const now = new Date()

      if (now > validUntil) {
        return NextResponse.json({ error: 'QRコードの有効期限が切れています', valid: false }, { status: 400 })
      }

      // データベースでQRコードを検証
      const { data: qrCode, error: qrError } = await supabase
        .from('office_qr_codes')
        .select('*')
        .eq('qr_data', qr_data)
        .eq('organization_id', userData?.organization_id)
        .eq('is_active', true)
        .single()

      if (qrError || !qrCode) {
        return NextResponse.json({ error: 'QRコードが見つかりません', valid: false }, { status: 404 })
      }

      // 有効期限チェック（DB）
      const dbValidUntil = new Date(qrCode.valid_until)
      if (now > dbValidUntil) {
        return NextResponse.json({ error: 'QRコードの有効期限が切れています', valid: false }, { status: 400 })
      }

      return NextResponse.json({
        valid: true,
        type: 'office',
        organization_id: userData?.organization_id,
      })
    } else if (parts[0] === 'SITE') {
      // 現場QRコード（リーダー発行）の検証
      if (parts.length !== 4) {
        return NextResponse.json({ error: 'QRデータのフォーマットが不正です', valid: false }, { status: 400 })
      }

      const [, siteId, leaderId, dateStr] = parts

      // 現場の存在確認
      const { data: site, error: siteError } = await supabase
        .from('sites')
        .select('id, organization_id')
        .eq('id', siteId)
        .is('deleted_at', null)
        .single()

      if (siteError || !site) {
        return NextResponse.json({ error: '現場が見つかりません', valid: false }, { status: 404 })
      }

      // 組織のチェック
      if (site.organization_id !== userData?.organization_id) {
        return NextResponse.json({ error: '異なる組織の現場です', valid: false }, { status: 403 })
      }

      // 日付のチェック（当日のみ有効）
      const qrDate = new Date(dateStr)
      const now = new Date()
      const jstDate = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
      const todayStr = jstDate.toISOString().split('T')[0]

      if (dateStr !== todayStr) {
        return NextResponse.json({ error: 'QRコードの有効期限が切れています（当日のみ有効）', valid: false }, { status: 400 })
      }

      return NextResponse.json({
        valid: true,
        type: 'site',
        organization_id: userData?.organization_id,
        site_id: siteId,
        leader_id: leaderId,
      })
    } else {
      return NextResponse.json({ error: 'サポートされていないQRコードです', valid: false }, { status: 400 })
    }
  } catch (error) {
    console.error('QR verification error:', error)
    return NextResponse.json({ error: '予期しないエラーが発生しました', valid: false }, { status: 500 })
  }
}
