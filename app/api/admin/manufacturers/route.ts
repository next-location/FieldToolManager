import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: メーカー作成
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    if (!body.name) {
      return NextResponse.json({ error: 'メーカー名は必須です' }, { status: 400 });
    }

    // システム共通メーカーとして作成
    const { data: manufacturer, error } = await supabase
      .from('tool_manufacturers')
      .insert({
        organization_id: null,
        is_system_common: true,
        name: body.name,
        country: body.country || null,
        website_url: body.website_url || null,
        support_phone: body.support_phone || null,
        notes: body.notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating manufacturer:', error);
      return NextResponse.json({ error: 'メーカーの作成に失敗しました', details: error.message }, { status: 500 });
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'create_manufacturer',
        details: {
          manufacturer_id: manufacturer.id,
          manufacturer_name: manufacturer.name,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({ manufacturer });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました', details: error.message }, { status: 500 });
  }
}
