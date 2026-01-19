/**
 * ユーザーパスワード変更リクエストAPI
 * POST /api/users/password/request-change
 *
 * フロー:
 * 1. 現在のパスワードを検証
 * 2. 6桁の確認コードを生成
 * 3. メールで確認コードを送信
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf';

export async function POST(request: NextRequest) {
  // CSRF検証
  const isValidCsrf = await verifyCsrfToken(request);
  if (!isValidCsrf) {
    console.error('[Password Change Request] CSRF validation failed');
    return csrfErrorResponse();
  }

  try {
    const supabase = await createClient();

    // 認証チェック
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { currentPassword } = await request.json();

    if (!currentPassword) {
      return NextResponse.json(
        { error: '現在のパスワードを入力してください' },
        { status: 400 }
      );
    }

    // ユーザー情報を取得
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, name, organization_id')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'ユーザー情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 現在のパスワードを検証（Supabase Authで再認証）
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userData.email,
      password: currentPassword,
    });

    if (signInError) {
      console.error('[Password Change Request] Invalid password for:', userData.email);
      return NextResponse.json(
        { error: '現在のパスワードが正しくありません' },
        { status: 401 }
      );
    }

    // 6桁の確認コードを生成
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // 有効期限（10分後）
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // トークンをDBに保存
    const { error: tokenError } = await supabase
      .from('user_password_change_tokens')
      .insert({
        user_id: user.id,
        token: verificationCode,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error('Failed to save password change token:', tokenError);
      return NextResponse.json(
        { error: '確認コードの生成に失敗しました' },
        { status: 500 }
      );
    }

    // メール送信
    const { Resend } = await import('resend');
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    if (!resend) {
      console.warn('Resend not configured, skipping email');
      return NextResponse.json(
        { error: 'メール送信サービスが設定されていません' },
        { status: 500 }
      );
    }

    await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'ザイロク <noreply@zairoku.com>',
      to: userData.email,
      subject: '【ザイロク】パスワード変更の確認コード',
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
              .code {
                font-size: 32px;
                letter-spacing: 8px;
                font-family: monospace;
                color: #2563eb;
                text-align: center;
                padding: 20px;
                background-color: #eff6ff;
                border-radius: 8px;
                margin: 20px 0;
                font-weight: bold;
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
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 パスワード変更の確認</h1>
              </div>

              <div class="content">
                <p>こんにちは、${userData.name || 'ユーザー'}様</p>

                <p>以下の確認コードを入力してパスワード変更を完了してください：</p>

                <div class="code">${verificationCode}</div>

                <p style="text-align: center; color: #6b7280; font-size: 14px;">
                  このコードは <strong>10分間</strong> 有効です。
                </p>

                <div class="warning">
                  <strong>⚠️ 重要な注意事項</strong>
                  <ul style="margin: 10px 0; padding-left: 20px;">
                    <li>このメールに心当たりがない場合は、すぐに管理者に連絡してください</li>
                    <li>確認コードは誰にも教えないでください</li>
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
    });

    // 監査ログを記録
    await supabase.from('user_history').insert({
      organization_id: userData.organization_id,
      user_id: user.id,
      changed_by: user.id,
      change_type: 'password_change_request',
      old_values: {},
      new_values: { verification_code_sent: true },
      notes: 'パスワード変更の確認コードを送信しました',
    });

    return NextResponse.json({
      success: true,
      message: '確認コードをメールで送信しました',
    });
  } catch (error) {
    console.error('Password change request error:', error);
    return NextResponse.json({ error: 'エラーが発生しました' }, { status: 500 });
  }
}
