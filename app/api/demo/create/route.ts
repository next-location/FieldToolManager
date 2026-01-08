import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertSampleData } from '@/lib/demo/sample-data'
import crypto from 'crypto'

// パスワード生成関数
function generateSecurePassword(length: number = 10): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

// 7日後の日時を取得
function getExpiryDate(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return date
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const body = await request.json()
    const { demoRequestId } = body

    if (!demoRequestId) {
      return NextResponse.json(
        { error: 'demoRequestId is required' },
        { status: 400 }
      )
    }

    // デモ申請情報を取得
    const { data: demoRequest, error: fetchError } = await supabase
      .from('demo_requests')
      .select('*')
      .eq('id', demoRequestId)
      .single()

    if (fetchError || !demoRequest) {
      return NextResponse.json(
        { error: 'Demo request not found' },
        { status: 404 }
      )
    }

    // 1. デモ用メールアドレスとパスワード生成
    const timestamp = Date.now()
    const random = crypto.randomBytes(4).toString('hex')
    const demoEmail = `demo_${timestamp}_${random}@demo.zairoku.com`
    const demoPassword = generateSecurePassword(10)
    const expiresAt = getExpiryDate()

    // 2. Supabase Authでユーザー作成
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        is_demo: true,
        company_name: demoRequest.company_name,
        expires_at: expiresAt.toISOString(),
        original_email: demoRequest.email,
        original_request_id: demoRequestId
      }
    })

    if (authError || !authUser.user) {
      console.error('Failed to create auth user:', authError)
      return NextResponse.json(
        { error: 'Failed to create demo account' },
        { status: 500 }
      )
    }

    // 3. デモ用会社データ作成
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: `${demoRequest.company_name}（デモ）`,
        subdomain: `demo${timestamp}`,
        is_demo: true,
        plan: 'demo',
        created_by: authUser.user.id,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single()

    if (companyError || !company) {
      console.error('Failed to create company:', companyError)
      // ユーザーを削除してロールバック
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { error: 'Failed to create demo company' },
        { status: 500 }
      )
    }

    // 4. サンプルデータ投入
    try {
      await insertSampleData(authUser.user.id, company.id)
    } catch (sampleDataError) {
      console.error('Failed to insert sample data:', sampleDataError)
      // サンプルデータ投入失敗でもアカウントは作成済みとする
    }

    // 5. demo_requests テーブル更新
    const { error: updateError } = await supabase
      .from('demo_requests')
      .update({
        demo_email: demoEmail,
        demo_password_hash: crypto.createHash('sha256').update(demoPassword).digest('hex'),
        demo_user_id: authUser.user.id,
        demo_company_id: company.id,
        demo_expires_at: expiresAt.toISOString(),
        status: 'approved'
      })
      .eq('id', demoRequestId)

    if (updateError) {
      console.error('Failed to update demo request:', updateError)
    }

    // 6. メール送信（非同期）
    try {
      await fetch(`${request.nextUrl.origin}/api/demo/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: demoRequest.email,
          companyName: demoRequest.company_name,
          personName: demoRequest.person_name,
          demoEmail,
          demoPassword,
          expiresAt: expiresAt.toISOString()
        })
      })
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
      // メール送信失敗でもアカウントは作成済み
    }

    return NextResponse.json({
      success: true,
      demoEmail,
      expiresAt: expiresAt.toISOString()
    })

  } catch (error) {
    console.error('Demo account creation error:', error)
    return NextResponse.json(
      { error: 'Server error occurred' },
      { status: 500 }
    )
  }
}
