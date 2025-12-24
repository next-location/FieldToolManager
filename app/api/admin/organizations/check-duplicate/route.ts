import { NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 組織の重複チェックAPI
 * 会社名と住所を基に、類似する組織を検索
 */
export async function POST(request: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, address, phone, excludeId } = body;

    if (!name) {
      return NextResponse.json({ error: '組織名を入力してください' }, { status: 400 });
    }

    // 「株式会社」「(株)」「有限会社」などを除いた検索用の名前
    const normalizedName = name
      .replace(/株式会社|（株）|\(株\)|有限会社|（有）|\(有\)|合同会社|合資会社|合名会社/g, '')
      .trim();

    let query = supabase
      .from('organizations')
      .select('id, name, subdomain');

    // 除外するID（編集時に自分自身を除外）
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    // 1. 完全一致チェック（名前のみ）
    const { data: exactMatch } = await query
      .eq('name', name)
      .maybeSingle();

    if (exactMatch) {
      return NextResponse.json({
        isDuplicate: true,
        matchType: 'exact',
        message: '同じ組織名の組織が既に登録されています',
        similarOrganizations: [exactMatch],
      });
    }

    const similarOrganizations: any[] = [];

    // 2. 会社名の部分一致（正規化した名前で検索）
    if (normalizedName.length >= 2) {
      const { data: nameMatches } = await supabase
        .from('organizations')
        .select('id, name, subdomain')
        .or(`name.ilike.%${normalizedName}%,name.ilike.%${name}%`)
        .neq('id', excludeId || '00000000-0000-0000-0000-000000000000')
        .limit(10);

      if (nameMatches) {
        similarOrganizations.push(...nameMatches);
      }
    }


    // 重複候補がある場合
    if (similarOrganizations.length > 0) {
      return NextResponse.json({
        isDuplicate: true,
        matchType: 'similar',
        message: '類似する組織が見つかりました',
        similarOrganizations: similarOrganizations.slice(0, 5), // 最大5件
      });
    }

    // 重複なし
    return NextResponse.json({
      isDuplicate: false,
      message: '重複する組織は見つかりませんでした',
      similarOrganizations: [],
    });
  } catch (error) {
    console.error('[Organizations Duplicate Check API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
