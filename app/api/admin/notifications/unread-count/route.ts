import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * GET: 未読通知数取得
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { count, error } = await supabase
      .from('super_admin_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('is_read', false)
      .is('deleted_at', null);

    if (error) {
      console.error('[API /api/admin/notifications/unread-count] Error:', error);
      return NextResponse.json({ error: '未読数の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ unreadCount: count || 0 });
  } catch (error: any) {
    console.error('[API /api/admin/notifications/unread-count] Error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
