import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ qrCode: string }> }
) {
  const supabase = await createClient()

  // 認証チェック
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { qrCode } = await params

  // UUIDの形式チェック
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(qrCode)) {
    return NextResponse.json({ error: 'Invalid QR code format' }, { status: 400 })
  }

  try {
    // 個別アイテムのQRコードとして検索
    const { data: toolItem, error: itemError } = await supabase
      .from('tool_items')
      .select(
        `
        id,
        tool_id,
        serial_number,
        current_location,
        status,
        tools (
          id,
          name,
          model_number,
          manufacturer,
          organization_id
        )
      `
      )
      .eq('qr_code', qrCode)
      .is('deleted_at', null)
      .single()

    if (toolItem) {
      // 組織が一致するか確認（セキュリティ）
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('email', user.email)
        .single()

      if (userData?.organization_id !== toolItem.tools[0].organization_id) {
        return NextResponse.json(
          { error: 'Access denied - Different organization' },
          { status: 403 }
        )
      }

      return NextResponse.json({
        type: 'tool_item',
        tool_id: toolItem.tool_id,
        tool_item_id: toolItem.id,
        name: toolItem.tools[0].name,
        serial_number: toolItem.serial_number,
        current_location: toolItem.current_location,
        status: toolItem.status,
      })
    }

    // 道具マスタのQRコードとして検索
    const { data: tool, error: toolError } = await supabase
      .from('tools')
      .select('id, name, model_number, manufacturer, organization_id, qr_code')
      .eq('qr_code', qrCode)
      .is('deleted_at', null)
      .single()

    if (tool) {
      // 組織が一致するか確認（セキュリティ）
      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('email', user.email)
        .single()

      if (userData?.organization_id !== tool.organization_id) {
        return NextResponse.json(
          { error: 'Access denied - Different organization' },
          { status: 403 }
        )
      }

      return NextResponse.json({
        type: 'tool',
        tool_id: tool.id,
        name: tool.name,
        model_number: tool.model_number,
        manufacturer: tool.manufacturer,
      })
    }

    // どちらにも見つからない場合
    return NextResponse.json({ error: 'Tool not found' }, { status: 404 })
  } catch (error) {
    console.error('QRコード検索エラー:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
