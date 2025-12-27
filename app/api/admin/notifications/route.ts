import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET: スーパーアドミン通知一覧取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';

    let query = supabase
      .from('super_admin_notifications')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[API /api/admin/notifications] Error:', error);
      return NextResponse.json({ error: '通知の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ notifications: data });
  } catch (error: any) {
    console.error('[API /api/admin/notifications] Error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
