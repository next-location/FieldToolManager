import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
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
    const supabase = createAdminClient()
    const body = await request.json()

    const {
      companyName,
      personName,
      email,
      phone,
      department,
      employeeCount,
      toolCount,
      timeline,
      message
    } = body

    // 必須項目チェック
    if (!companyName || !personName || !email || !phone) {
      return NextResponse.json(
        { error: '必須項目を入力してください' },
        { status: 400 }
      )
    }

    // IPアドレス取得
    const headersList = await headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0] : headersList.get('x-real-ip') || 'unknown'
    const userAgent = headersList.get('user-agent') || 'unknown'

    // 24時間以内の重複申請チェック（メールアドレスのみ）
    const oneDayAgo = new Date()
    oneDayAgo.setHours(oneDayAgo.getHours() - 24)

    const { data: existingRequest } = await supabase
      .from('demo_requests')
      .select('id')
      .eq('email', email)
      .gte('created_at', oneDayAgo.toISOString())
      .limit(1)

    if (existingRequest && existingRequest.length > 0) {
      return NextResponse.json(
        { error: '24時間以内に同じメールアドレスから申請がありました。しばらく時間をおいてから再度お試しください。' },
        { status: 429 }
      )
    }

    // デモ申請を登録
    const { data: demoRequest, error: insertError } = await supabase
      .from('demo_requests')
      .insert({
        company_name: companyName,
        person_name: personName,
        email,
        phone,
        department: department || null,
        employee_count: employeeCount || null,
        tool_count: toolCount || null,
        timeline: timeline || null,
        message: message || null,
        ip_address: ipAddress,
        user_agent: userAgent,
        status: 'pending'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to insert demo request:', insertError)
      return NextResponse.json(
        { error: 'データベースエラーが発生しました' },
        { status: 500 }
      )
    }

    // デモアカウント自動生成
    const timestamp = Date.now()
    const random = crypto.randomBytes(4).toString('hex')
    const demoEmail = `demo_${timestamp}_${random}@demo.zairoku.com`
    const demoPassword = generateSecurePassword(10)
    const expiresAt = getExpiryDate()

    // Supabase Authでユーザー作成
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
      user_metadata: {
        is_demo: true,
        company_name: companyName,
        expires_at: expiresAt.toISOString(),
        original_email: email,
        original_request_id: demoRequest.id
      }
    })

    if (authError || !authUser.user) {
      console.error('Failed to create auth user:', authError)
      return NextResponse.json(
        { error: 'デモアカウントの作成に失敗しました' },
        { status: 500 }
      )
    }

    // デモ用会社データ作成
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .insert({
        name: `${companyName}（デモ）`,
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
      await supabase.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json(
        { error: 'デモ会社の作成に失敗しました' },
        { status: 500 }
      )
    }

    // サンプルデータ投入
    try {
      await insertSampleData(authUser.user.id, company.id)
    } catch (sampleDataError) {
      console.error('Failed to insert sample data:', sampleDataError)
    }

    // demo_requests テーブル更新
    await supabase
      .from('demo_requests')
      .update({
        demo_email: demoEmail,
        demo_password_hash: crypto.createHash('sha256').update(demoPassword).digest('hex'),
        demo_user_id: authUser.user.id,
        demo_company_id: company.id,
        demo_expires_at: expiresAt.toISOString(),
        status: 'approved'
      })
      .eq('id', demoRequest.id)

    // メール送信
    try {
      const formattedExpiry = expiresAt.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })

      const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px 20px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .credentials {
      background: #f3f4f6;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #3b82f6;
    }
    .credentials-item {
      margin: 10px 0;
    }
    .credentials-label {
      font-weight: bold;
      color: #4b5563;
      display: inline-block;
      width: 120px;
    }
    .credentials-value {
      font-family: 'Courier New', monospace;
      background: #fff;
      padding: 5px 10px;
      border-radius: 4px;
      display: inline-block;
      color: #1f2937;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-decoration: none;
      border-radius: 25px;
      font-weight: bold;
      margin: 20px 0;
    }
    .features {
      margin: 20px 0;
    }
    .feature-item {
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .warning {
      background: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #6b7280;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
      margin-top: 30px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1 style="margin: 0; font-size: 28px;">ザイロク</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px;">資料とデモ環境のご案内</p>
  </div>

  <div class="content">
    <p>${companyName} ${personName} 様</p>

    <p>この度は資料請求いただきありがとうございます。</p>

    <p>デモ環境のアクセス情報を下記にご案内いたします。<br>
    7日間、実際の操作感をお試しいただけます。</p>

    <div class="credentials">
      <h3 style="margin-top: 0;">デモ環境アクセス情報</h3>
      <div class="credentials-item">
        <span class="credentials-label">URL:</span>
        <span class="credentials-value">https://zairoku.com/login</span>
      </div>
      <div class="credentials-item">
        <span class="credentials-label">メール:</span>
        <span class="credentials-value">${demoEmail}</span>
      </div>
      <div class="credentials-item">
        <span class="credentials-label">パスワード:</span>
        <span class="credentials-value">${demoPassword}</span>
      </div>
      <div class="credentials-item">
        <span class="credentials-label">有効期限:</span>
        <span class="credentials-value">${formattedExpiry}</span>
      </div>
    </div>

    <div style="text-align: center;">
      <a href="https://zairoku.com/login" class="button">デモ環境にログイン</a>
    </div>

    <div class="features">
      <h3>デモ環境でお試しいただける機能</h3>
      <div class="feature-item">✓ QRコードでの工具管理</div>
      <div class="feature-item">✓ リアルタイム在庫確認</div>
      <div class="feature-item">✓ 作業報告書作成</div>
      <div class="feature-item">✓ チーム管理機能</div>
    </div>

    <div class="warning">
      <strong>⚠️ ご注意</strong><br>
      • デモ環境は一部機能に制限があります<br>
      • 登録できる工具数は20個までです<br>
      • データは毎日午前3時にリセットされます<br>
      • 7日後に自動的にアカウントが削除されます
    </div>

    <h3>サポート</h3>
    <p>ご不明点やご質問がございましたら、お気軽にお問い合わせください。</p>
    <p>
      メール: support@zairoku.com<br>
      お問い合わせフォーム: <a href="https://zairoku.com/contact">https://zairoku.com/contact</a>
    </p>
  </div>

  <div class="footer">
    <p>株式会社ネクストロケーション<br>
    © 2025 Zairoku. All rights reserved.</p>
  </div>
</body>
</html>
      `

      const resendApiKey = process.env.RESEND_API_KEY
      if (resendApiKey) {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`
          },
          body: JSON.stringify({
            from: 'ザイロク <noreply@zairoku.com>',
            to: email,
            subject: '【ザイロク】資料とデモ環境のご案内',
            html: emailHtml
          })
        })

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json()
          console.error('Resend API error:', errorData)
        }
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: 'デモ申請を受け付けました'
    })

  } catch (error) {
    console.error('Demo request error:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}
