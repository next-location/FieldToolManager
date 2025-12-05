import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 資料一覧取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // 作業報告書の資料を取得
    const { data: attachments, error } = await supabase
      .from('work_report_attachments')
      .select('*')
      .eq('work_report_id', id)
      .order('uploaded_at', { ascending: true })

    if (error) {
      console.error('資料取得エラー:', error)
      return NextResponse.json(
        { error: '資料の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(attachments)
  } catch (error) {
    console.error('資料取得エラー:', error)
    return NextResponse.json(
      { error: '資料の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 資料アップロード
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // ユーザーの組織IDを取得
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!userData) {
      return NextResponse.json(
        { error: 'ユーザー情報が見つかりません' },
        { status: 404 }
      )
    }

    // 作業報告書の存在確認と権限チェック
    const { data: report } = await supabase
      .from('work_reports')
      .select('id, organization_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (!report) {
      return NextResponse.json(
        { error: '作業報告書が見つかりません' },
        { status: 404 }
      )
    }

    if (report.organization_id !== userData.organization_id) {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // フォームデータを取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    const attachmentType = formData.get('attachment_type') as string
    const description = formData.get('description') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      )
    }

    if (!attachmentType) {
      return NextResponse.json(
        { error: '資料タイプが指定されていません' },
        { status: 400 }
      )
    }

    // ファイルサイズチェック（10MB）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは10MB以下にしてください' },
        { status: 400 }
      )
    }

    // MIMEタイプチェック
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'PDF、画像、Excel、Wordファイルのみアップロード可能です' },
        { status: 400 }
      )
    }

    // ファイル名を生成（UUID + 拡張子）
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${id}/${crypto.randomUUID()}.${fileExt}`

    // Supabase Storageにアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('work-report-attachments')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      })

    if (uploadError) {
      console.error('アップロードエラー:', uploadError)
      return NextResponse.json(
        { error: 'ファイルのアップロードに失敗しました' },
        { status: 500 }
      )
    }

    // 公開URLを取得
    const {
      data: { publicUrl },
    } = supabase.storage.from('work-report-attachments').getPublicUrl(fileName)

    // データベースに資料情報を保存
    const { data: attachmentData, error: dbError } = await supabase
      .from('work_report_attachments')
      .insert({
        organization_id: userData.organization_id,
        work_report_id: id,
        file_url: publicUrl,
        attachment_type: attachmentType,
        file_name: file.name,
        description: description || null,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('データベース保存エラー:', dbError)
      // ストレージからファイルを削除
      await supabase.storage.from('work-report-attachments').remove([fileName])
      return NextResponse.json(
        { error: '資料情報の保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(attachmentData, { status: 201 })
  } catch (error) {
    console.error('資料アップロードエラー:', error)
    return NextResponse.json(
      { error: '資料のアップロードに失敗しました' },
      { status: 500 }
    )
  }
}
