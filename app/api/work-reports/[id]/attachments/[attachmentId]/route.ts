import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 資料削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  try {
    const { id, attachmentId } = await params
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 添付ファイル情報を取得
    const { data: attachment, error: attachmentError } = await supabase
      .from('work_report_attachments')
      .select('id, work_report_id, file_url')
      .eq('id', attachmentId)
      .eq('work_report_id', id)
      .single()

    if (attachmentError || !attachment) {
      return NextResponse.json(
        { error: '添付ファイルが見つかりません' },
        { status: 404 }
      )
    }

    // Storageからファイルを削除
    if (attachment.file_url) {
      // file_urlからストレージパスを抽出
      let storagePath = attachment.file_url

      // URLの場合はパス部分を抽出
      if (storagePath.includes('/storage/v1/object/public/work-report-attachments/')) {
        storagePath = storagePath.split('/storage/v1/object/public/work-report-attachments/')[1]
      }

      const { error: storageError } = await supabase.storage
        .from('work-report-attachments')
        .remove([storagePath])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Storageエラーでも処理を継続（DB削除は実行）
      }
    }

    // データベースから物理削除
    const { error: deleteError } = await supabase
      .from('work_report_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      console.error('Database delete error:', deleteError)
      return NextResponse.json(
        { error: '添付ファイルの削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '添付ファイルを削除しました' })
  } catch (error) {
    console.error('資料削除エラー:', error)
    return NextResponse.json(
      { error: '資料の削除に失敗しました' },
      { status: 500 }
    )
  }
}
