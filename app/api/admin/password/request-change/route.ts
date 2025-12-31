/**
 * パスワード変更リクエストAPI
 * POST /api/admin/password/request-change
 *
 * 現在のパスワード検証後、確認コードをメール送信
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession, verifySuperAdminPassword } from '@/lib/auth/super-admin';
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  // CSRF検証
  const isValidCsrf = await verifyCsrfToken(request);
  if (!isValidCsrf) {
    return csrfErrorResponse();
  }

  try {
    // 認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { currentPassword } = await request.json();

    if (!currentPassword) {
      return NextResponse.json(
        { error: '現在のパスワードを入力してください' },
        { status: 400 }
      );
    }

    // スーパー管理者情報を取得
    const { data: adminData, error: adminError } = await supabase
      .from('super_admins')
      .select('id, email, password_hash')
      .eq('id', session.id)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json(
        { error: 'アカウント情報の取得に失敗しました' },
        { status: 500 }
      );
    }

    // 現在のパスワード検証
    console.log('[Password Change Request] Verifying password for:', adminData.email);
    console.log('[Password Change Request] Password length:', currentPassword.length);
    const isValidPassword = await verifySuperAdminPassword(
      currentPassword,
      adminData.password_hash
    );
    console.log('[Password Change Request] Password verification result:', isValidPassword);

    if (!isValidPassword) {
      console.error('[Password Change Request] Invalid password for:', adminData.email);
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
      .from('password_change_tokens')
      .insert({
        super_admin_id: adminData.id,
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
      return NextResponse.json(
        { error: 'メール送信サービスが設定されていません' },
        { status: 500 }
      );
    }

    await resend.emails.send({
      from: 'ザイロク <noreply@zairoku.com>',
      to: adminData.email,
      subject: '【ザイロク】パスワード変更の確認コード',
      html: `
        <h2>パスワード変更の確認</h2>
        <p>以下の確認コードを入力してパスワード変更を完了してください：</p>
        <h1 style="font-size: 32px; letter-spacing: 8px; font-family: monospace; color: #2563eb;">${verificationCode}</h1>
        <p>このコードは10分間有効です。</p>
        <p style="color: #dc2626; font-weight: bold;">⚠️ このメールに心当たりがない場合は、すぐに管理者に連絡してください。</p>
      `,
    });

    // 監査ログを記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: adminData.id,
      action: 'パスワード変更リクエスト',
      details: { email: adminData.email },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: '確認コードをメールで送信しました',
    });
  } catch (error) {
    console.error('Password change request error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
