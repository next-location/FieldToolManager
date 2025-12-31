/**
 * メールベースの2FA認証コード送信API
 * POST /api/auth/2fa/send-email
 *
 * 2要素認証にメールを使用する場合のコード送信処理
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'crypto';
import { Resend } from 'resend';
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf';

// Resend初期化
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request);
  if (!isValidCsrf) {
    console.error('[2FA EMAIL SEND API] CSRF validation failed');
    return csrfErrorResponse();
  }

  try {
    // リクエストボディを取得
    const body = await request.json();
    const { email, alternateEmail, purpose } = body;

    // purposeの検証
    if (!['login', 'setup', 'verify'].includes(purpose)) {
      return NextResponse.json(
        { error: '無効なリクエストです' },
        { status: 400 }
      );
    }

    // メールアドレスの検証
    const targetEmail = alternateEmail || email;
    if (!targetEmail) {
      return NextResponse.json(
        { error: 'メールアドレスが必要です' },
        { status: 400 }
      );
    }

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ユーザー情報の取得（emailから）
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, name, organization_id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // 6桁の認証コードを生成
    const verificationCode = randomInt(100000, 999999).toString();

    // 有効期限を設定（10分）
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // 2FA一時トークンを保存
    const { error: saveError } = await supabase
      .from('two_factor_tokens')
      .upsert({
        user_id: user.id,
        token: verificationCode,
        type: 'email',
        email: targetEmail,
        purpose,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      });

    if (saveError) {
      console.error('Failed to save verification token:', saveError);
      return NextResponse.json(
        { error: 'トークンの保存に失敗しました' },
        { status: 500 }
      );
    }

    // メール送信
    try {
      const emailSubject =
        purpose === 'login' ? 'ログイン認証コード' :
        purpose === 'setup' ? '2要素認証の設定' :
        '認証コードの確認';

      const emailBody = `
        <div style="font-family: 'Hiragino Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">${emailSubject}</h2>
          <p>こんにちは、${user.name}様</p>

          <p>以下の認証コードを使用してください：</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #2563eb;">
              ${verificationCode}
            </span>
          </div>

          <p style="color: #666; font-size: 14px;">
            このコードは10分間有効です。他の人と共有しないでください。
          </p>

          ${purpose === 'setup' ? `
            <div style="background-color: #fef3c7; border: 1px solid #fbbf24; padding: 12px; border-radius: 6px; margin-top: 20px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>重要:</strong> この認証コードを入力することで、2要素認証が有効になります。
              </p>
            </div>
          ` : ''}

          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

          <p style="color: #999; font-size: 12px;">
            このメールに心当たりがない場合は、無視してください。
          </p>
        </div>
      `;

      if (!resend) {
        console.warn("Resend API is not configured. Skipping email send.");
        return NextResponse.json({ success: true, message: "Email service not configured" });
      }

      const { error: emailError } = await resend.emails.send({
        from: 'FieldTool Manager <noreply@zairoku.com>',
        to: targetEmail,
        subject: emailSubject,
        html: emailBody,
      });

      if (emailError) {
        console.error('Failed to send email:', emailError);
        return NextResponse.json(
          { error: 'メール送信に失敗しました' },
          { status: 500 }
        );
      }
    } catch (emailErr) {
      console.error('Email sending error:', emailErr);
      return NextResponse.json(
        { error: 'メール送信中にエラーが発生しました' },
        { status: 500 }
      );
    }

    // レート制限のための簡易的な記録
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: user.organization_id,
        action: '2FA_EMAIL_SENT',
        details: {
          email: targetEmail,
          purpose,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      message: `認証コードを${targetEmail}に送信しました`,
      expiresIn: 600, // 10分（秒単位）
    });

  } catch (error) {
    console.error('2FA email send error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}

/**
 * 認証コードの検証API
 * POST /api/auth/2fa/verify-email
 */
export async function PUT(request: NextRequest) {
  // CSRF検証（セキュリティ強化）
  const isValidCsrf = await verifyCsrfToken(request);
  if (!isValidCsrf) {
    console.error('[2FA EMAIL VERIFY API] CSRF validation failed');
    return csrfErrorResponse();
  }

  try {
    const body = await request.json();
    const { email, code, purpose } = body;

    if (!email || !code || !purpose) {
      return NextResponse.json(
        { error: '必要な情報が不足しています' },
        { status: 400 }
      );
    }

    // Supabaseクライアントを作成
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // ユーザー情報の取得
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, organization_id')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      );
    }

    // トークンの検証
    const { data: token, error: tokenError } = await supabase
      .from('two_factor_tokens')
      .select('*')
      .eq('user_id', user.id)
      .eq('token', code)
      .eq('type', 'email')
      .eq('purpose', purpose)
      .gte('expires_at', new Date().toISOString())
      .single();

    if (tokenError || !token) {
      return NextResponse.json(
        { error: '認証コードが無効または期限切れです' },
        { status: 401 }
      );
    }

    // トークンを使用済みにする
    await supabase
      .from('two_factor_tokens')
      .delete()
      .eq('id', token.id);

    // 監査ログ
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        organization_id: user.organization_id,
        action: '2FA_EMAIL_VERIFIED',
        details: {
          purpose,
        },
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      message: '認証が成功しました',
      userId: user.id,
    });

  } catch (error) {
    console.error('2FA email verify error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}