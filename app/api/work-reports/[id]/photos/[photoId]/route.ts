import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      .select('*, work_reports!inner(organization_id, created_by)')
      .eq('id', photoId)
      .eq('work_report_id', id)
      .single()

    if (photoError || !photo) {
      return NextResponse.json(
        { error: '写真が見つかりません' },
        { status: 404 }
      )
    }

    // 権限チェック（アップロードユーザーまたは作業報告書作成者）
    if (photo.uploaded_by !== user.id && (photo as any).work_reports.created_by !== user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // ストレージからファイルを削除
    // URLからファイルパスを抽出
    const urlParts = photo.photo_url.split('/work-report-photos/')
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      await supabase.storage.from('work-report-photos').remove([filePath])
    }

    // データベースから削除
    const { error: deleteError } = await supabase
      .from('work_report_photos')
      .delete()
      .eq('id', photoId)

    if (deleteError) {
      console.error('削除エラー:', deleteError)
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
