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

    // 作業報告書の写真を取得
    const { data: photos, error } = await supabase
      .from('work_report_photos')
      .select('*')
      .eq('work_report_id', id)
      .order('uploaded_at', { ascending: true })

    if (error) {
      console.error('写真取得エラー:', error)
      return NextResponse.json(
        { error: '写真の取得に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(photos)
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
    const photoType = formData.get('photo_type') as string
    const caption = formData.get('caption') as string | null

    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが指定されていません' },
        { status: 400 }
      )
    }

    if (!photoType) {
      return NextResponse.json(
        { error: '写真タイプが指定されていません' },
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
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'JPEGまたはPNG形式の画像をアップロードしてください' },
        { status: 400 }
      )
    }

    // ファイル名を生成（UUID + 拡張子）
    const fileExt = file.name.split('.').pop()
    const fileName = `${user.id}/${id}/${crypto.randomUUID()}.${fileExt}`

    // Supabase Storageにアップロード
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('work-report-photos')
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
    } = supabase.storage.from('work-report-photos').getPublicUrl(fileName)

    // データベースに写真情報を保存
    const { data: photoData, error: dbError } = await supabase
      .from('work_report_photos')
      .insert({
        organization_id: userData.organization_id,
        work_report_id: id,
        photo_url: publicUrl,
        photo_type: photoType,
        caption: caption || null,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('データベース保存エラー:', dbError)
      // ストレージからファイルを削除
      await supabase.storage.from('work-report-photos').remove([fileName])
      return NextResponse.json(
        { error: '写真情報の保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json(photoData, { status: 201 })
  } catch (error) {
    console.error('写真アップロードエラー:', error)
    return NextResponse.json(
      { error: '写真のアップロードに失敗しました' },
      { status: 500 }
    )
  }
}
