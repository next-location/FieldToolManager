import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySuperAdminPassword, setSuperAdminCookie } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'メールアドレスとパスワードを入力してください' }, { status: 400 });
    }

    // スーパーアドミン取得
    const { data: superAdmin, error } = await supabase
      .from('super_admins')
      .select('*')
      .eq('email', email)
      .eq('is_active', true)
      .single();

    if (error || !superAdmin) {
      return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 });
    }

    // アカウントロック確認
    if (superAdmin.locked_until && new Date(superAdmin.locked_until) > new Date()) {
      return NextResponse.json({
        error: 'アカウントがロックされています。しばらくしてから再度お試しください。'
      }, { status: 403 });
    }

    // パスワード検証
    const isValidPassword = await verifySuperAdminPassword(password, superAdmin.password_hash);

    if (!isValidPassword) {
      // ログイン失敗回数を更新
      const failedAttempts = (superAdmin.failed_login_attempts || 0) + 1;
      const updates: any = { failed_login_attempts: failedAttempts };

      // 5回失敗でロック（30分）
      if (failedAttempts >= 5) {
        updates.locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      }

      await supabase
        .from('super_admins')
        .update(updates)
        .eq('id', superAdmin.id);

      return NextResponse.json({ error: 'メールアドレスまたはパスワードが正しくありません' }, { status: 401 });
    }

    // ログイン成功 - セッションを作成
    await setSuperAdminCookie({
      id: superAdmin.id,
      email: superAdmin.email,
      name: superAdmin.name,
      permission_level: superAdmin.permission_level,
    });

    // ログイン情報を更新
    await supabase
      .from('super_admins')
      .update({
        last_login_at: new Date().toISOString(),
        last_login_ip: request.headers.get('x-forwarded-for') || 'unknown',
        failed_login_attempts: 0,
        locked_until: null,
      })
      .eq('id', superAdmin.id);

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: superAdmin.id,
        action: 'login',
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({ success: true, redirect: '/admin/dashboard' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'ログインエラーが発生しました' }, { status: 500 });
  }
}
