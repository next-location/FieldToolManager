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

    // 資料情報を取得
    const { data: attachment, error: attachmentError } = await supabase
      .from('work_report_attachments')
      .select('*, work_reports!inner(organization_id, created_by)')
      .eq('id', attachmentId)
      .eq('work_report_id', id)
      .single()

    if (attachmentError || !attachment) {
      return NextResponse.json(
        { error: '資料が見つかりません' },
        { status: 404 }
      )
    }

    // 権限チェック（アップロードユーザーまたは作業報告書作成者）
    if (attachment.uploaded_by !== user.id && (attachment as any).work_reports.created_by !== user.id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // ストレージからファイルを削除
    // URLからファイルパスを抽出
    const urlParts = attachment.file_url.split('/work-report-attachments/')
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      await supabase.storage.from('work-report-attachments').remove([filePath])
    }

    // データベースから削除
    const { error: deleteError } = await supabase
      .from('work_report_attachments')
      .delete()
      .eq('id', attachmentId)

    if (deleteError) {
      console.error('削除エラー:', deleteError)
      return NextResponse.json(
        { error: '資料の削除に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: '資料を削除しました' })
  } catch (error) {
    console.error('資料削除エラー:', error)
    return NextResponse.json(
      { error: '資料の削除に失敗しました' },
      { status: 500 }
    )
  }
}
