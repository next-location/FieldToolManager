import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf'
import { createClient } from '@/lib/supabase/server'
import { generatePersonalSeal } from '@/lib/personal-seal/generate-seal'

/**
 * PUT /api/users/personal-seal
 * 個人印鑑を生成して保存
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // リクエストボディ取得
    const body = await request.json()
    const { surname } = body

    if (!surname || typeof surname !== 'string') {
      return NextResponse.json(
        { error: '苗字が指定されていません' },
        { status: 400 }
      )
    }

    if (surname.length === 0 || surname.length > 4) {
      return NextResponse.json(
        { error: '苗字は1〜4文字で指定してください' },
        { status: 400 }
      )
    }

    // 印鑑データ生成
    const sealData = generatePersonalSeal(surname)

    // DBに保存
    const { error } = await supabase
      .from('users')
      .update({ personal_seal_data: sealData })
      .eq('id', user.id)

    if (error) {
      console.error('Personal seal update error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      seal_data: sealData,
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/users/personal-seal
 * 個人印鑑を削除
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // DBから削除
    const { error } = await supabase
      .from('users')
      .update({ personal_seal_data: null })
      .eq('id', user.id)

    if (error) {
      console.error('Personal seal delete error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
