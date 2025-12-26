import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/admin/logs - 操作ログ一覧取得
export async function GET(request: NextRequest) {
  try {
    // Super Admin認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    // フィルター条件
    const action = searchParams.get('action');
    const adminId = searchParams.get('admin_id');
    const targetType = searchParams.get('target_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // ページネーション
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // クエリ構築
    let query = supabase
      .from('super_admin_logs')
      .select(`
        *,
        admin:super_admins!super_admin_logs_super_admin_id_fkey(id, name, email)
      `, { count: 'exact' });

    // フィルター適用
    if (action) {
      query = query.eq('action', action);
    }
    if (adminId) {
      query = query.eq('super_admin_id', adminId);
    }
    if (targetType) {
      query = query.eq('target_type', targetType);
    }
    if (startDate) {
      query = query.gte('performed_at', startDate);
    }
    if (endDate) {
      query = query.lte('performed_at', endDate);
    }

    // ソート・ページネーション
    query = query
      .order('performed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) {
      console.error('Error fetching logs:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error: any) {
    console.error('Error in GET /api/admin/logs:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
