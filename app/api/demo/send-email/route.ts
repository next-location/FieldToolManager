import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, companyName, personName, demoEmail, demoPassword, expiresAt } = body

    if (!email || !demoEmail || !demoPassword) {
      return NextResponse.json(
        { error: 'Required fields are missing' },
        { status: 400 }
      )
    }

    // Resend APIキーチェック
    const resendApiKey = process.env.RESEND_API_KEY
    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured')
      return NextResponse.json(
        { error: 'Email service is not configured' },
        { status: 500 }
      )
    }

    // 有効期限をフォーマット
    const expiryDate = new Date(expiresAt)
    const formattedExpiry = expiryDate.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // メール本文
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
        <span class="credentials-value">https://ijthywxu.zairoku.com/login</span>
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
      <a href="https://ijthywxu.zairoku.com/login" class="button">デモ環境にログイン</a>
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
      お問い合わせフォーム: <a href="https://ijthywxu.zairoku.com/contact">https://ijthywxu.zairoku.com/contact</a>
    </p>
  </div>

  <div class="footer">
    <p>株式会社ネクストロケーション<br>
    © 2025 Zairoku. All rights reserved.</p>
  </div>
</body>
</html>
    `

    const emailText = `
${companyName} ${personName} 様

この度は資料請求いただきありがとうございます。

デモ環境のアクセス情報を下記にご案内いたします。
7日間、実際の操作感をお試しいただけます。

【デモ環境アクセス情報】
URL: https://ijthywxu.zairoku.com/login
メール: ${demoEmail}
パスワード: ${demoPassword}
有効期限: ${formattedExpiry}

【デモ環境でお試しいただける機能】
✓ QRコードでの工具管理
✓ リアルタイム在庫確認
✓ 作業報告書作成
✓ チーム管理機能

【ご注意】
• デモ環境は一部機能に制限があります
• 登録できる工具数は20個までです
• データは毎日午前3時にリセットされます
• 7日後に自動的にアカウントが削除されます

ご不明点やご質問がございましたら、お気軽にお問い合わせください。

株式会社ネクストロケーション
メール: support@zairoku.com
お問い合わせ: https://ijthywxu.zairoku.com/contact
    `

    // Resend APIでメール送信
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${resendApiKey}`
      },
      body: JSON.stringify({
        from: 'ザイロク <noreply@zairoku.com>',
        to: email,
        subject: '【ザイロク】資料とデモ環境のご案内',
        html: emailHtml,
        text: emailText
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Resend API error:', errorData)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      messageId: data.id
    })

  } catch (error) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { error: 'Server error occurred' },
      { status: 500 }
    )
  }
}
