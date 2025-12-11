import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// PUT: メーカー更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // バリデーション
    if (!body.name) {
      return NextResponse.json({ error: 'メーカー名は必須です' }, { status: 400 });
    }

    // メーカー更新
    const { data: manufacturer, error } = await supabase
      .from('tool_manufacturers')
      .update({
        name: body.name,
        country: body.country || null,
        website_url: body.website_url || null,
        support_phone: body.support_phone || null,
        notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Error updating manufacturer:', error);
      return NextResponse.json({ error: 'メーカーの更新に失敗しました', details: error.message }, { status: 500 });
    }

    if (!manufacturer) {
      return NextResponse.json({ error: 'メーカーが見つかりません' }, { status: 404 });
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'update_manufacturer',
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

// DELETE: メーカー削除（論理削除）
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    // 論理削除
    const { data: manufacturer, error } = await supabase
      .from('tool_manufacturers')
      .update({
        deleted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Error deleting manufacturer:', error);
      return NextResponse.json({ error: 'メーカーの削除に失敗しました', details: error.message }, { status: 500 });
    }

    if (!manufacturer) {
      return NextResponse.json({ error: 'メーカーが見つかりません' }, { status: 404 });
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'delete_manufacturer',
        details: {
          manufacturer_id: manufacturer.id,
          manufacturer_name: manufacturer.name,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました', details: error.message }, { status: 500 });
  }
}
