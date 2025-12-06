import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// 写真一覧取得
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

    // 写真一覧取得（削除されていないもの、表示順序でソート）
    const { data: photos, error } = await supabase
      .from('work_report_photos')
      .select('*')
      .eq('work_report_id', id)
      .is('deleted_at', null)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) {
      console.error('写真取得エラー:', error)
      return NextResponse.json(
        { error: '写真の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ photos: photos || [] })
  } catch (error) {
    console.error('写真取得エラー:', error)
    return NextResponse.json(
      { error: '写真の取得に失敗しました' },
      { status: 500 }
    )
  }
}

// 写真アップロード
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
    const caption = formData.get('caption') as string | null
    const displayOrder = formData.get('display_order') as string | null
    const takenAt = formData.get('taken_at') as string | null
    const locationName = formData.get('location_name') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      )
    }

    // ファイルサイズチェック（5MB）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは5MB以下にしてください' },
        { status: 400 }
      )
    }

    // MIMEタイプチェック
    const ALLOWED_MIME_TYPES = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ]
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'JPEG、PNG、WebP形式の画像のみアップロード可能です' },
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
      .from('work-report-photos')
      .upload(storagePath, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json(
        { error: '写真のアップロードに失敗しました' },
        { status: 500 }
      )
    }

    // データベースにメタデータ保存
    const { data: photo, error: insertError } = await supabase
      .from('work_report_photos')
      .insert({
        work_report_id: id,
        organization_id: report.organization_id,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        caption: caption || null,
        display_order: displayOrder ? parseInt(displayOrder, 10) : null,
        taken_at: takenAt || null,
        location_name: locationName || null,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)

      // Storageからファイル削除（ロールバック）
      await supabase.storage.from('work-report-photos').remove([storagePath])

      return NextResponse.json(
        { error: '写真情報の保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({ photo }, { status: 201 })
  } catch (error) {
    console.error('写真アップロードエラー:', error)
    return NextResponse.json(
      { error: '写真のアップロードに失敗しました' },
      { status: 500 }
    )
  }
}
