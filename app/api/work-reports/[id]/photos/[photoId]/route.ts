import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// キャプション・表示順序更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id, photoId } = await params
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // リクエストボディの取得
    const body = await request.json()
    const { caption, display_order, taken_at, location_name } = body

    // 写真の存在と権限チェック
    const { data: photo, error: photoError } = await supabase
      .from('work_report_photos')
      .select('id, work_report_id')
      .eq('id', photoId)
      .eq('work_report_id', id)
      .is('deleted_at', null)
      .single()

    if (photoError || !photo) {
      return NextResponse.json(
        { error: '写真が見つかりません' },
        { status: 404 }
      )
    }

    // 更新データの準備
    const updateData: any = {}
    if (caption !== undefined) updateData.caption = caption
    if (display_order !== undefined) updateData.display_order = display_order
    if (taken_at !== undefined) updateData.taken_at = taken_at
    if (location_name !== undefined) updateData.location_name = location_name

    // 更新
    const { data: updatedPhoto, error: updateError } = await supabase
      .from('work_report_photos')
      .update(updateData)
      .eq('id', photoId)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: '写真情報の更新に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ photo: updatedPhoto })
  } catch (error) {
    console.error('Error in PUT /api/work-reports/[id]/photos/[photoId]:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}

// 写真削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const { id, photoId } = await params
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 写真情報を取得
    const { data: photo, error: photoError } = await supabase
      .from('work_report_photos')
      .select('id, work_report_id, storage_path')
      .eq('id', photoId)
      .eq('work_report_id', id)
      .is('deleted_at', null)
      .single()

    if (photoError || !photo) {
      return NextResponse.json(
        { error: '写真が見つかりません' },
        { status: 404 }
      )
    }

    // Storageからファイルを削除
    const { error: storageError } = await supabase.storage
      .from('work-report-photos')
      .remove([photo.storage_path])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Storageエラーでも処理を継続（DB削除は実行）
    }

    // データベースから論理削除（deleted_atを設定）
    const { error: deleteError } = await supabase
      .from('work_report_photos')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', photoId)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return NextResponse.json(
        { error: '写真の削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '写真を削除しました' })
  } catch (error) {
    console.error('写真削除エラー:', error)
    return NextResponse.json(
      { error: '写真の削除に失敗しました' },
      { status: 500 }
    )
  }
}
