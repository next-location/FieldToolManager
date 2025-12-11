import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 特定のシステム共通道具取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id } = await params;

    const { data: tool, error } = await supabase
      .from('tools')
      .select(`
        *,
        tool_categories (
          id,
          name
        )
      `)
      .eq('id', id)
      .eq('is_system_common', true)
      .is('organization_id', null)
      .is('deleted_at', null)
      .single();

    if (error || !tool) {
      return NextResponse.json({ error: '共通道具が見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ tool });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}

// PUT: システム共通道具更新
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
      return NextResponse.json({ error: '道具名は必須です' }, { status: 400 });
    }

    if (!body.management_type || !['individual', 'consumable'].includes(body.management_type)) {
      return NextResponse.json({ error: '管理タイプは必須です' }, { status: 400 });
    }

    // システム共通道具であることを確認
    const { data: existingTool } = await supabase
      .from('tools')
      .select('id, is_system_common, organization_id')
      .eq('id', id)
      .single();

    if (!existingTool || !existingTool.is_system_common || existingTool.organization_id !== null) {
      return NextResponse.json({ error: 'この道具はシステム共通道具ではありません' }, { status: 403 });
    }

    // 更新実行
    const { data: tool, error } = await supabase
      .from('tools')
      .update({
        name: body.name,
        category_id: body.category_id || null,
        model_number: body.model_number || null,
        manufacturer: body.manufacturer || null,
        management_type: body.management_type,
        unit: body.unit || '個',
        purchase_price: body.purchase_price ? parseFloat(body.purchase_price) : null,
        image_url: body.image_url || null,
        notes: body.notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating common tool:', error);
      return NextResponse.json({ error: '共通道具の更新に失敗しました', details: error.message }, { status: 500 });
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'update_common_tool',
        details: {
          tool_id: tool.id,
          tool_name: tool.name,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({ tool });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました', details: error.message }, { status: 500 });
  }
}

// DELETE: システム共通道具削除（論理削除）
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

    // システム共通道具であることを確認
    const { data: existingTool } = await supabase
      .from('tools')
      .select('id, name, is_system_common, organization_id')
      .eq('id', id)
      .single();

    if (!existingTool || !existingTool.is_system_common || existingTool.organization_id !== null) {
      return NextResponse.json({ error: 'この道具はシステム共通道具ではありません' }, { status: 403 });
    }

    // 論理削除
    const { error } = await supabase
      .from('tools')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      console.error('Error deleting common tool:', error);
      return NextResponse.json({ error: '共通道具の削除に失敗しました', details: error.message }, { status: 500 });
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'delete_common_tool',
        details: {
          tool_id: id,
          tool_name: existingTool.name,
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
