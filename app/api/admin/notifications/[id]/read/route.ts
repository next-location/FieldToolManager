import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST: 通知を既読にする
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase
      .from('super_admin_notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        read_by: session.id,
      })
      .eq('id', id);

    if (error) {
      console.error('[API /api/admin/notifications/[id]/read] Error:', error);
      return NextResponse.json({ error: '既読化に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[API /api/admin/notifications/[id]/read] Error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
