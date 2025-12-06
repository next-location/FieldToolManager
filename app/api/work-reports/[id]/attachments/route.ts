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

    // 作業報告書の存在と権限チェック
    const { data: report, error: reportError } = await supabase
      .from('work_reports')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: '作業報告書が見つかりません' },
        { status: 404 }
      )
    }

    // 添付ファイル一覧取得（削除されていないもの、表示順序でソート）
    const { data: attachments, error } = await supabase
      .from('work_report_attachments')
      .select('*')
      .eq('work_report_id', id)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('資料取得エラー:', error)
      return NextResponse.json(
        { error: '資料の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ attachments: attachments || [] })
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

    // 作業報告書の存在と権限チェック
    const { data: report, error: reportError } = await supabase
      .from('work_reports')
      .select('id, organization_id')
      .eq('id', id)
      .single()

    if (reportError || !report) {
      return NextResponse.json(
        { error: '作業報告書が見つかりません' },
        { status: 404 }
      )
    }

    // FormDataの取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('file_type') as string | null
    const description = formData.get('description') as string | null
    const displayOrder = formData.get('display_order') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
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
    const ALLOWED_MIME_TYPES = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'PDF、画像、Excel、Wordファイルのみアップロード可能です' },
        { status: 400 }
      )
    }

    // ファイル名の生成（タイムスタンプ + オリジナルファイル名）
    const timestamp = Date.now()
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${timestamp}_${sanitizedFileName}`

    // Storageパス: {user_id}/{report_id}/{timestamp}_{filename}
    const storagePath = `${user.id}/${id}/${fileName}`

    // Supabase Storageにアップロード
    const { error: uploadError } = await supabase.storage
      .from('work-report-attachments')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: 'ファイルのアップロードに失敗しました' },
        { status: 500 }
      )
    }

    // データベースにメタデータ保存
    const { data: attachment, error: insertError } = await supabase
      .from('work_report_attachments')
      .insert({
        work_report_id: id,
        organization_id: report.organization_id,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        file_type: fileType || 'その他',
        description: description || null,
        display_order: displayOrder ? parseInt(displayOrder, 10) : null,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)

      // Storageからファイル削除（ロールバック）
      await supabase.storage
        .from('work-report-attachments')
        .remove([storagePath])

      return NextResponse.json(
        { error: '資料情報の保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ attachment }, { status: 201 })
  } catch (error) {
    console.error('資料アップロードエラー:', error)
    return NextResponse.json(
      { error: '資料のアップロードに失敗しました' },
      { status: 500 }
    )
  }
}
