import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import bcrypt from 'bcryptjs';
import { sendSuperAdminWelcomeEmail } from '@/lib/email/super-admin-welcome';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/admin/super-admins - Super Admin作成（Ownerのみ）
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Owner権限チェック
    const { data: adminData } = await supabase
      .from('super_admins')
      .select('role')
      .eq('id', session.id)
      .single();

    if (adminData?.role !== 'owner') {
      return NextResponse.json(
        { error: 'この操作はオーナーのみ実行できます' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, password, role } = body;

    // バリデーション
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: '全ての項目を入力してください' },
        { status: 400 }
      );
    }

    if (!['owner', 'sales'].includes(role)) {
      return NextResponse.json(
        { error: '無効な権限レベルです' },
        { status: 400 }
      );
    }

    // メールアドレスの重複チェック
    const { data: existing } = await supabase
      .from('super_admins')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に登録されています' },
        { status: 400 }
      );
    }

    // パスワードハッシュ化
    const hashedPassword = await bcrypt.hash(password, 10);

    // Super Admin作成
    const { data: newAdmin, error } = await supabase
      .from('super_admins')
      .insert({
        name,
        email,
        password_hash: hashedPassword,
        permission_level: 'admin', // 全てのSuper Adminはadminレベル
        role,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating super admin:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // ログ記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: 'create_super_admin',
      target_type: 'super_admin',
      target_id: newAdmin.id,
      details: { name, email, role },
    });

    // ウェルカムメールを送信
    try {
      await sendSuperAdminWelcomeEmail({
        toEmail: email,
        adminName: name,
        password: password,
      });
      console.log(`[Super Admin] Welcome email sent to ${email}`);
    } catch (emailError: any) {
      // メール送信エラーはログに記録するが、アカウント作成自体は成功とする
      console.error('[Super Admin] Failed to send welcome email:', emailError);

      // メール送信失敗をログに記録
      await supabase.from('super_admin_logs').insert({
        super_admin_id: session.id,
        action: 'email_send_failed',
        target_type: 'super_admin',
        target_id: newAdmin.id,
        details: {
          email,
          error: emailError?.message || 'Unknown email error'
        },
      });
    }

    return NextResponse.json(
      { message: 'Super Adminを作成しました', admin: newAdmin },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error in POST /api/admin/super-admins:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
