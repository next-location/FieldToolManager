/**
 * パスワード変更実行API
 * POST /api/admin/password/verify-and-change
 *
 * 確認コード検証後、新しいパスワードに変更
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf';
import bcrypt from 'bcrypt';

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

    const { verificationCode, newPassword } = await request.json();

    if (!verificationCode || !newPassword) {
      return NextResponse.json(
        { error: '確認コードと新しいパスワードを入力してください' },
        { status: 400 }
      );
    }

    // パスワードポリシーチェック
    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'パスワードは8文字以上で設定してください' },
        { status: 400 }
      );
    }

    if (!/[A-Z]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'パスワードには大文字を含めてください' },
        { status: 400 }
      );
    }

    if (!/[a-z]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'パスワードには小文字を含めてください' },
        { status: 400 }
      );
    }

    if (!/[0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'パスワードには数字を含めてください' },
        { status: 400 }
      );
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      return NextResponse.json(
        { error: 'パスワードには記号を含めてください' },
        { status: 400 }
      );
    }

    // 確認コードを検証
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_change_tokens')
      .select('*')
      .eq('super_admin_id', session.id)
      .eq('token', verificationCode)
      .eq('used', false)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { error: '確認コードが正しくありません' },
        { status: 401 }
      );
    }

    // 有効期限チェック
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: '確認コードの有効期限が切れています' },
        { status: 401 }
      );
    }

    // 新しいパスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // パスワードを更新
    const { error: updateError } = await supabase
      .from('super_admins')
      .update({
        password_hash: hashedPassword,
        updated_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('Failed to update password:', updateError);
      return NextResponse.json(
        { error: 'パスワードの更新に失敗しました' },
        { status: 500 }
      );
    }

    // トークンを使用済みにする
    await supabase
      .from('password_change_tokens')
      .update({ used: true })
      .eq('id', tokenData.id);

    // スーパー管理者情報を取得（メール送信用）
    const { data: adminData } = await supabase
      .from('super_admins')
      .select('email, name')
      .eq('id', session.id)
      .single();

    // 完了通知メールを送信
    const { Resend } = await import('resend');
    const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

    if (resend && adminData) {
      const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
      const userAgent = request.headers.get('user-agent') || 'unknown';

      await resend.emails.send({
        from: 'ザイロク <noreply@zairoku.com>',
        to: adminData.email,
        subject: '【ザイロク】パスワードが変更されました',
        html: `
          <h2>パスワード変更完了</h2>
          <p>お使いの管理者アカウントのパスワードが変更されました。</p>

          <h3>変更情報</h3>
          <ul>
            <li>日時: ${new Date().toLocaleString('ja-JP')}</li>
            <li>IPアドレス: ${ipAddress}</li>
            <li>ブラウザ: ${userAgent}</li>
          </ul>

          <p style="color: #dc2626; font-weight: bold;">⚠️ 心当たりがない場合は、すぐに管理者に連絡してください。</p>
        `,
      });

      // system@zairoku.comにも通知
      await resend.emails.send({
        from: 'ザイロク <noreply@zairoku.com>',
        to: 'system@zairoku.com',
        subject: '【ザイロク】管理者アカウントのパスワードが変更されました',
        html: `
          <h2>管理者パスワード変更通知</h2>
          <p>以下の管理者アカウントのパスワードが変更されました。</p>

          <h3>変更情報</h3>
          <ul>
            <li>アカウント: ${adminData.email} (${adminData.name})</li>
            <li>日時: ${new Date().toLocaleString('ja-JP')}</li>
            <li>IPアドレス: ${ipAddress}</li>
            <li>ブラウザ: ${userAgent}</li>
          </ul>
        `,
      });
    }

    // 監査ログを記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: 'パスワード変更完了',
      details: { email: adminData?.email },
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown',
    });

    return NextResponse.json({
      success: true,
      message: 'パスワードを変更しました',
    });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json(
      { error: 'エラーが発生しました' },
      { status: 500 }
    );
  }
}
