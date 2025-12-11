import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST: CSV一括インポート
export async function POST(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const body = await request.json();
    const { csvData } = body;

    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json({ error: 'CSVデータが不正です' }, { status: 400 });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as { row: number; name: string; error: string }[],
    };

    // 各行を処理
    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const rowNumber = i + 2; // ヘッダー行を考慮

      try {
        // バリデーション
        if (!row.name || !row.name.trim()) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: row.name || '(空)',
            error: '道具名は必須です',
          });
          continue;
        }

        if (!row.management_type || !['individual', 'consumable'].includes(row.management_type)) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: row.name,
            error: '管理タイプは "individual" または "consumable" である必要があります',
          });
          continue;
        }

        // カテゴリIDの取得（カテゴリ名が指定されている場合）
        let category_id = null;
        if (row.category_name && row.category_name.trim()) {
          const { data: category } = await supabase
            .from('tool_categories')
            .select('id')
            .eq('name', row.category_name.trim())
            .single();

          category_id = category?.id || null;
        }

        // 共通道具として挿入
        const { error } = await supabase.from('tools').insert({
          organization_id: null, // システム共通道具
          is_system_common: true,
          name: row.name.trim(),
          category_id,
          model_number: row.model_number?.trim() || null,
          manufacturer: row.manufacturer?.trim() || null,
          management_type: row.management_type,
          unit: row.unit?.trim() || '個',
          purchase_price: row.purchase_price ? parseFloat(row.purchase_price) : null,
          image_url: row.image_url?.trim() || null,
          notes: row.notes?.trim() || null,
          current_location: 'warehouse',
          status: 'available',
          quantity: 1,
        });

        if (error) {
          results.failed++;
          results.errors.push({
            row: rowNumber,
            name: row.name,
            error: error.message,
          });
        } else {
          results.success++;
        }
      } catch (error: any) {
        results.failed++;
        results.errors.push({
          row: rowNumber,
          name: row.name || '(不明)',
          error: error.message || '不明なエラー',
        });
      }
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'import_common_tools',
        details: {
          total: csvData.length,
          success: results.success,
          failed: results.failed,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました', details: error.message },
      { status: 500 }
    );
  }
}
