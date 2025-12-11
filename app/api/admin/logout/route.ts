import { NextResponse } from 'next/server';
import { clearSuperAdminCookie, getSuperAdminSession } from '@/lib/auth/super-admin';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const session = await getSuperAdminSession();

    if (session) {
      await supabase
        .from('super_admin_logs')
        .insert({
          super_admin_id: session.id,
          action: 'logout',
        });
    }

    await clearSuperAdminCookie();

    return NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json({ error: 'ログアウトエラーが発生しました' }, { status: 500 });
  }
}
