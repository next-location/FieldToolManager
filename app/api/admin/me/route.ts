import { NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    // スーパーアドミン認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Super Admin の情報を取得
    const { data: adminData, error } = await supabase
      .from('super_admins')
      .select('id, name, email, role, two_factor_enabled')
      .eq('id', session.id)
      .single();

    if (error || !adminData) {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
      ...adminData,
      twoFactorEnabled: adminData.two_factor_enabled
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/me:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
