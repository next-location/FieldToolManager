import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json(
        { error: 'メールアドレスを入力してください' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // ユーザーを検索
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, organization_id')
      .eq('email', email)
      .single()

    // セキュリティ上、ユーザーが存在しない場合でも成功レスポンスを返す
    if (userError || !user) {
      return NextResponse.json({
        message: 'パスワードリセットのリンクをメールで送信しました。メールをご確認ください。'
      })
    }

    // トークン生成（32バイトのランダム文字列）
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setHours(expiresAt.getHours() + 1) // 1時間有効

    // トークンをデータベースに保存
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
      })

    if (tokenError) {
      console.error('Failed to create reset token:', tokenError)
      return NextResponse.json(
        { error: 'リセットトークンの作成に失敗しました' },
        { status: 500 }
      )
    }

    // リセットリンクを生成
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`

    // メール送信
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY!)

      await resend.emails.send({
        from: 'ザイロク <noreply@zairoku.com>',
        to: email,
        subject: 'パスワードリセットのご案内 - ザイロク',
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #333;
                  max-width: 600px;
                  margin: 0 auto;
                  padding: 20px;
                }
                .container {
                  background-color: #f9fafb;
                  border-radius: 8px;
                  padding: 30px;
                  margin: 20px 0;
                }
                .header {
                  text-align: center;
                  margin-bottom: 30px;
                }
                .header h1 {
                  color: #1e40af;
                  margin: 0;
                }
                .content {
                  background-color: white;
                  border-radius: 8px;
                  padding: 30px;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                .button {
                  display: inline-block;
                  background-color: #2563eb;
                  color: white;
                  padding: 12px 30px;
                  text-decoration: none;
                  border-radius: 6px;
                  margin: 20px 0;
                  font-weight: 500;
                }
                .button:hover {
                  background-color: #1d4ed8;
                }
                .warning {
                  background-color: #fef3c7;
                  border-left: 4px solid #f59e0b;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .footer {
                  text-align: center;
                  margin-top: 30px;
                  padding-top: 20px;
                  border-top: 1px solid #e5e7eb;
                  color: #6b7280;
                  font-size: 14px;
                }
                .link {
                  word-break: break-all;
                  color: #2563eb;
                  text-decoration: none;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>🔐 パスワードリセット</h1>
                </div>

                <div class="content">
                  <p>こんにちは、${user.name || 'ユーザー'}様</p>

                  <p>パスワードリセットのリクエストを受け付けました。</p>

                  <p>下記のボタンをクリックして、新しいパスワードを設定してください。</p>

                  <div style="text-align: center;">
                    <a href="${resetLink}" class="button">パスワードをリセット</a>
                  </div>

                  <p style="font-size: 14px; color: #6b7280;">
                    ボタンが機能しない場合は、以下のリンクをコピーしてブラウザに貼り付けてください：<br>
                    <a href="${resetLink}" class="link">${resetLink}</a>
                  </p>

                  <div class="warning">
                    <strong>⚠️ 重要な注意事項</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                      <li>このリンクは <strong>1時間</strong> のみ有効です</li>
                      <li>このメールに心当たりがない場合は、無視してください</li>
                      <li>パスワードは変更されていません</li>
                    </ul>
                  </div>
                </div>

                <div class="footer">
                  <p>このメールは自動送信されています。返信はできません。</p>
                  <p>© ${new Date().getFullYear()} ザイロク. All rights reserved.</p>
                </div>
              </div>
            </body>
          </html>
        `,
      })
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError)
      return NextResponse.json(
        { error: 'メールの送信に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'パスワードリセットのリンクをメールで送信しました。メールをご確認ください。'
    })

  } catch (error) {
    console.error('Forgot password error:', error)
    return NextResponse.json(
      { error: '予期しないエラーが発生しました' },
      { status: 500 }
    )
  }
}
