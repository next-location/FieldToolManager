/**
 * 2FAリセット要求API
 * POST /api/auth/2fa/request-reset
 *
 * メールアドレスを受け取り、リセットトークンを生成してメール送信
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
// import { sendEmail } from '@/lib/email'; // TODO: Implement email service

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    // バリデーション
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: '有効なメールアドレスを入力してください' },
        { status: 400 }
      );
    }

    // ユーザーを検索
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, name, email, two_factor_enabled')
      .eq('email', email)
      .single();

    // ユーザーが見つからない場合も、セキュリティのため成功レスポンスを返す
    if (userError || !userData) {
      console.log(`2FA reset requested for non-existent email: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'メールアドレスが登録されている場合、リセットリンクを送信しました。'
      });
    }

    // 2FAが有効でない場合
    if (!userData.two_factor_enabled) {
      return NextResponse.json({
        success: true,
        message: 'メールアドレスが登録されている場合、リセットリンクを送信しました。'
      });
    }

    // 既存の未使用トークンを無効化
    await supabase
      .from('two_factor_reset_tokens')
      .update({ used: true })
      .eq('user_id', userData.id)
      .eq('used', false);

    // リセットトークンを生成（URLセーフな32バイトトークン）
    const resetToken = crypto.randomBytes(32).toString('base64url');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // トークンの有効期限（1時間）
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // トークンをデータベースに保存
    const { error: tokenError } = await supabase
      .from('two_factor_reset_tokens')
      .insert({
        user_id: userData.id,
        token: hashedToken,
        expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    if (tokenError) {
      console.error('Failed to save reset token:', tokenError);
      return NextResponse.json(
        { error: 'リセットトークンの生成に失敗しました' },
        { status: 500 }
      );
    }

    // リセットリンクを生成
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-2fa?token=${resetToken}`;

    // メール送信
    try {
      // TODO: Implement email sending
      console.log('TODO: Send 2FA reset email to:', userData.email, 'Token:', resetToken);
      /* await sendEmail({
        to: userData.email,
        subject: '【ザイロク】2FA（二要素認証）リセットのお知らせ',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>2FA（二要素認証）のリセット</h2>
            <p>${userData.name} 様</p>
            <p>2FAリセットのリクエストを受け付けました。</p>
            <p>以下のボタンをクリックして、2FAをリセットしてください：</p>
            <div style="margin: 30px 0;">
              <a href="${resetUrl}"
                 style="background-color: #3b82f6; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                2FAをリセット
              </a>
            </div>
            <p>このリンクは1時間有効です。</p>
            <p>もしこのリクエストに心当たりがない場合は、このメールを無視してください。</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e5e5;">
            <p style="color: #666; font-size: 12px;">
              このメールは自動送信されています。返信はできません。<br>
              ザイロク - 現場の道具管理システム
            </p>
          </div>
        `
      }); */
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // メール送信に失敗しても、セキュリティのため成功レスポンスを返す
    }

    // ログを記録
    await supabase
      .from('two_factor_reset_logs')
      .insert({
        user_id: userData.id,
        reset_type: 'self',
        reset_reason: 'User requested reset via email',
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    return NextResponse.json({
      success: true,
      message: 'メールアドレスが登録されている場合、リセットリンクを送信しました。'
    });

  } catch (error) {
    console.error('2FA reset request error:', error);
    return NextResponse.json(
      { error: 'リセットリクエストの処理に失敗しました' },
      { status: 500 }
    );
  }
}