import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json({ error: 'User data not found' }, { status: 404 })
    }

    const { toolSetIds } = await request.json()

    if (!toolSetIds || !Array.isArray(toolSetIds)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const deletedSets = []

    // 各セットを削除
    for (const toolSetId of toolSetIds) {
      // セットの詳細情報を取得（監査ログ用）
      const { data: toolSet } = await supabase
        .from('tool_sets')
        .select('id, name')
        .eq('id', toolSetId)
        .eq('organization_id', userData.organization_id)
        .is('deleted_at', null)
        .single()

      if (!toolSet) {
        continue
      }

      const { data: setItems } = await supabase
        .from('tool_set_items')
        .select(`
          tool_item_id,
          tool_items!inner (
            id,
            serial_number,
            tools!inner (name)
          )
        `)
        .eq('tool_set_id', toolSetId)

      const setItemsInfo = (setItems || []).map((item: any) => ({
        tool_item_id: item.tool_item_id,
        serial_number: item.tool_items.serial_number,
        tool_name: item.tool_items.tools.name
      }))

      // セットを削除（soft delete）
      const { error: deleteError } = await supabase
        .from('tool_sets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', toolSetId)
        .eq('organization_id', userData.organization_id)

      if (deleteError) {
        console.error('セット削除エラー:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete tool set', details: deleteError.message },
          { status: 500 }
        )
      }

      // 監査ログを記録
      const { error: auditError } = await supabase.from('audit_logs').insert({
        organization_id: userData.organization_id,
        user_id: user.id,
        action: 'delete',
        entity_type: 'tool_sets',
        entity_id: toolSetId,
        old_values: {
          set_name: toolSet.name,
          item_count: setItems?.length || 0,
          items: setItemsInfo,
          reason: '個別移動のためセット削除',
          deleted_by: user.id
        }
      })

      if (auditError) {
        console.error('監査ログ記録エラー:', auditError)
        // 監査ログエラーは処理を止めない
      }

      deletedSets.push({
        id: toolSetId,
        name: toolSet.name,
        itemCount: setItems?.length || 0
      })
    }

    return NextResponse.json({
      success: true,
      deletedSets
    })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
