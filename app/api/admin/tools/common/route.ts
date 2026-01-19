import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { createAuditLogFromRequest } from '@/lib/audit-log';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: システム共通道具一覧取得
export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const category_id = searchParams.get('category_id');
    const management_type = searchParams.get('management_type');

    // クエリ構築
    let query = supabase
      .from('tools')
      .select(`
        *,
        tool_categories (
          id,
          name
        )
      `)
      .eq('is_system_common', true)
      .is('organization_id', null)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    // 検索フィルタ
    if (search) {
      query = query.or(`name.ilike.%${search}%,model_number.ilike.%${search}%,manufacturer.ilike.%${search}%`);
    }

    // カテゴリフィルタ
    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    // 管理タイプフィルタ
    if (management_type) {
      query = query.eq('management_type', management_type);
    }

    const { data: tools, error } = await query;

    if (error) {
      console.error('Error fetching common tools:', error);
      return NextResponse.json({ error: '共通道具の取得に失敗しました' }, { status: 500 });
    }

    return NextResponse.json({ tools });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// POST: システム共通道具作成
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.name) {
      return NextResponse.json({ error: '道具名は必須です' }, { status: 400 });
    }

    if (!body.management_type || !['individual', 'consumable'].includes(body.management_type)) {
      return NextResponse.json({ error: '管理タイプは必須です（individual または consumable）' }, { status: 400 });
    }

    // システム共通道具として作成
    const { data: tool, error } = await supabase
      .from('tools')
      .insert({
        organization_id: null, // システム共通道具
        is_system_common: true,
        name: body.name,
        category_id: body.category_id || null,
        model_number: body.model_number || null,
        manufacturer_id: body.manufacturer_id || null,
        management_type: body.management_type,
        unit: body.unit || '個',
        purchase_price: body.purchase_price ? parseFloat(body.purchase_price) : null,
        image_url: body.image_url || null,
        notes: body.notes || null,
        // デフォルト値
        current_location: 'warehouse',
        status: 'available',
        quantity: 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating common tool:', error);
      return NextResponse.json({ error: '共通道具の作成に失敗しました', details: error.message }, { status: 500 });
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'create_common_tool',
        details: {
          tool_id: tool.id,
          tool_name: tool.name,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    // 監査ログを記録（消耗品の場合）
    if (body.management_type === 'consumable') {
      await createAuditLogFromRequest(
        request,
        session.id,
        'system', // システム共通道具は組織IDがnull
        {
          action: 'create',
          entity_type: 'consumables',
          entity_id: tool.id,
          new_values: body
        }
      );
    }

    return NextResponse.json({ tool });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました', details: error.message }, { status: 500 });
  }
}
