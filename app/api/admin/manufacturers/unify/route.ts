import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: メーカー統一（自由入力メーカーをメーカーマスタに追加して統一）
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { oldName, newManufacturerName } = body;

    if (!oldName || !newManufacturerName) {
      return NextResponse.json({ error: 'oldNameとnewManufacturerNameは必須です' }, { status: 400 });
    }

    // Step 1: メーカーマスタに新しいメーカーを追加（既に存在する場合は取得）
    let manufacturerId: string;

    const { data: existingManufacturer } = await supabase
      .from('tool_manufacturers')
      .select('id')
      .eq('name', newManufacturerName)
      .is('deleted_at', null)
      .single();

    if (existingManufacturer) {
      // 既に存在する場合はそのIDを使用
      manufacturerId = existingManufacturer.id;
    } else {
      // 存在しない場合は新規作成
      const { data: newManufacturer, error: createError } = await supabase
        .from('tool_manufacturers')
        .insert({
          organization_id: null,
          is_system_common: true,
          name: newManufacturerName,
        })
        .select('id')
        .single();

      if (createError || !newManufacturer) {
        console.error('Error creating manufacturer:', createError);
        return NextResponse.json({ error: 'メーカーの作成に失敗しました' }, { status: 500 });
      }

      manufacturerId = newManufacturer.id;

      // ログ記録
      await supabase.from('super_admin_logs').insert({
        super_admin_id: session.id,
        action: 'create_manufacturer_from_unify',
        details: {
          manufacturer_id: manufacturerId,
          manufacturer_name: newManufacturerName,
          old_name: oldName,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });
    }

    // Step 2: 該当する道具のmanufacturerをmanufacturer_idに移行
    const { data: updatedTools, error: updateError } = await supabase
      .from('tools')
      .update({
        manufacturer_id: manufacturerId,
        manufacturer: null, // 自由入力をクリア
      })
      .eq('manufacturer', oldName)
      .is('manufacturer_id', null)
      .is('deleted_at', null)
      .select('id');

    if (updateError) {
      console.error('Error updating tools:', updateError);
      return NextResponse.json({ error: '道具の更新に失敗しました' }, { status: 500 });
    }

    // ログ記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: 'unify_manufacturer',
      details: {
        manufacturer_id: manufacturerId,
        manufacturer_name: newManufacturerName,
        old_name: oldName,
        updated_count: updatedTools?.length || 0,
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      manufacturerId,
      updatedCount: updatedTools?.length || 0,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました', details: error.message }, { status: 500 });
  }
}
