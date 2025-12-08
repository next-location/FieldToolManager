import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface Params {
  params: Promise<{
    id: string
    photoId: string
  }>
}

// DELETE: 写真削除
export async function DELETE(request: NextRequest, { params }: Params) {
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
    const { data: photo, error: fetchError } = await supabase
      .from('work_report_photos')
      .select('*')
      .eq('id', photoId)
      .eq('work_report_id', id)
      .single()

    if (fetchError || !photo) {
      console.error('写真取得エラー:', fetchError)
      return NextResponse.json(
        { error: '写真が見つかりません' },
        { status: 404 }
      )
    }

    // Storageからファイル削除
    if (photo.photo_url) {
      // photo_urlからストレージパスを抽出
      let storagePath = photo.photo_url

      // URLの場合はパス部分を抽出
      if (storagePath.includes('/storage/v1/object/public/work-report-photos/')) {
        storagePath = storagePath.split('/storage/v1/object/public/work-report-photos/')[1]
      }

      const { error: storageError } = await supabase.storage
        .from('work-report-photos')
        .remove([storagePath])

      if (storageError) {
        console.error('Storage削除エラー:', storageError)
        // Storageの削除に失敗してもデータベースの削除は続行
      }
    }

    // データベースから削除
    const { error: deleteError } = await supabase
      .from('work_report_photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      console.error('データベース削除エラー:', deleteError)
      return NextResponse.json(
        { error: '写真の削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '写真を削除しました' }, { status: 200 })
  } catch (error) {
    console.error('写真削除エラー:', error)
    return NextResponse.json(
      { error: '写真の削除に失敗しました' },
      { status: 500 }
    )
  }
}