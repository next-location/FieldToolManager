import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET: 未登録メーカー一覧取得（自由入力されたmanufacturerフィールドを集計）
export async function GET(request: NextRequest) {
  try {
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // manufacturer (自由入力) が入っている道具を取得
    const { data: tools, error } = await supabase
      .from('tools')
      .select('manufacturer, organization_id, organizations(name)')
      .not('manufacturer', 'is', null)
      .is('manufacturer_id', null) // メーカーIDがnullのもの = 自由入力
      .is('deleted_at', null);

    if (error) {
      console.error('Error fetching unregistered manufacturers:', error);
      return NextResponse.json({ error: '未登録メーカーの取得に失敗しました' }, { status: 500 });
    }

    // メーカー名ごとに集計
    const manufacturerMap = new Map<string, {
      name: string;
      count: number;
      organizations: Set<string>;
    }>();

    tools?.forEach((tool: any) => {
      const mfrName = tool.manufacturer.trim();
      if (!manufacturerMap.has(mfrName)) {
        manufacturerMap.set(mfrName, {
          name: mfrName,
          count: 0,
          organizations: new Set(),
        });
      }
      const mfr = manufacturerMap.get(mfrName)!;
      mfr.count++;
      if (tool.organizations?.name) {
        mfr.organizations.add(tool.organizations.name);
      }
    });

    // Map to Array
    const unregisteredManufacturers = Array.from(manufacturerMap.values()).map(mfr => ({
      name: mfr.name,
      count: mfr.count,
      organizations: Array.from(mfr.organizations),
    })).sort((a, b) => b.count - a.count); // 使用回数が多い順

    return NextResponse.json({ manufacturers: unregisteredManufacturers });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 });
  }
}
