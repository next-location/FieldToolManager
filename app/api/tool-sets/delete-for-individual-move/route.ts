import { createClient, createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  console.log('[API DELETE TOOL SET] リクエスト受信')
  try {
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      console.log('[API DELETE TOOL SET] 認証エラー: ユーザーなし')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[API DELETE TOOL SET] ユーザーID:', user.id)

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      console.log('[API DELETE TOOL SET] ユーザーデータ取得エラー')
      return NextResponse.json({ error: 'User data not found' }, { status: 404 })
    }

    console.log('[API DELETE TOOL SET] 組織ID:', userData.organization_id)

    const { toolSetIds } = await request.json()
    console.log('[API DELETE TOOL SET] 削除対象セットID:', toolSetIds)

    if (!toolSetIds || !Array.isArray(toolSetIds)) {
      console.log('[API DELETE TOOL SET] 不正なリクエスト')
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const deletedSets = []

    // 各セットを削除
    for (const toolSetId of toolSetIds) {
      console.log('[API DELETE TOOL SET] セット削除開始:', toolSetId)

      // セットの詳細情報を取得（監査ログ用）
      const { data: toolSet } = await supabase
        .from('tool_sets')
        .select('id, name')
        .eq('id', toolSetId)
        .eq('organization_id', userData.organization_id)
        .is('deleted_at', null)
        .single()

      if (!toolSet) {
        console.log('[API DELETE TOOL SET] セットが見つからない:', toolSetId)
        continue
      }

      console.log('[API DELETE TOOL SET] セット情報取得成功:', toolSet.name)

      const { data: setItems } = await supabaseAdmin
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

      console.log('[API DELETE TOOL SET] セットアイテム数:', setItems?.length || 0)

      const setItemsInfo = (setItems || []).map((item: any) => ({
        tool_item_id: item.tool_item_id,
        serial_number: item.tool_items.serial_number,
        tool_name: item.tool_items.tools.name
      }))

      // セットを削除（soft delete） - Admin clientでRLSバイパス
      console.log('[API DELETE TOOL SET] Admin clientで削除実行...')
      const { data: updateResult, error: deleteError } = await supabaseAdmin
        .from('tool_sets')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', toolSetId)
        .eq('organization_id', userData.organization_id)
        .select()

      console.log('[API DELETE TOOL SET] UPDATE結果:', updateResult)

      if (deleteError) {
        console.error('[API DELETE TOOL SET] セット削除エラー:', deleteError)
        return NextResponse.json(
          { error: 'Failed to delete tool set', details: deleteError.message },
          { status: 500 }
        )
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('[API DELETE TOOL SET] UPDATEが0件。セットが見つからないか、既に削除済み')
        return NextResponse.json(
          { error: 'Tool set not found or already deleted' },
          { status: 404 }
        )
      }

      console.log('[API DELETE TOOL SET] セット削除成功 (soft delete):', toolSetId)

      // 監査ログを記録 - Admin clientで記録
      const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
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
        console.error('[API DELETE TOOL SET] 監査ログ記録エラー:', auditError)
        // 監査ログエラーは処理を止めない
      } else {
        console.log('[API DELETE TOOL SET] 監査ログ記録成功')
      }

      deletedSets.push({
        id: toolSetId,
        name: toolSet.name,
        itemCount: setItems?.length || 0
      })
    }

    console.log('[API DELETE TOOL SET] 削除完了。削除されたセット:', deletedSets)

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
