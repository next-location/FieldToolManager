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

    console.log('[Duplicate Check] Request body:', body);

    if (!name) {
      return NextResponse.json({ error: '組織名を入力してください' }, { status: 400 });
    }

    // 「株式会社」「(株)」「有限会社」などを除いた検索用の名前
    const normalizedName = name
      .replace(/株式会社|（株）|\(株\)|有限会社|（有）|\(有\)|合同会社|合資会社|合名会社/g, '')
      .trim();

    let query = supabase
      .from('organizations')
      .select('id, name, subdomain, address, phone, email');

    // 除外するID（編集時に自分自身を除外）
    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    // 1. 完全一致チェック（名前と住所）
    if (address) {
      const { data: exactMatch } = await supabase
        .from('organizations')
        .select('id, name, subdomain, address, phone, email')
        .eq('name', name)
        .eq('address', address)
        .neq('id', excludeId || '00000000-0000-0000-0000-000000000000')
        .maybeSingle();

      if (exactMatch) {
        return NextResponse.json({
          isDuplicate: true,
          matchType: 'exact',
          message: '同じ組織名と住所の組織が既に登録されています',
          similarOrganizations: [exactMatch],
        });
      }
    }

    const similarOrganizations: any[] = [];

    // 2. 会社名の部分一致（正規化した名前で検索）
    if (normalizedName.length >= 2) {
      const { data: nameMatches } = await supabase
        .from('organizations')
        .select('id, name, subdomain, address, phone, email')
        .or(`name.ilike.%${normalizedName}%,name.ilike.%${name}%`)
        .neq('id', excludeId || '00000000-0000-0000-0000-000000000000')
        .limit(10);

      if (nameMatches) {
        similarOrganizations.push(...nameMatches);
      }
    }

    // 3. 住所の前方一致（都道府県+市区町村レベルで一致する可能性）
    if (address && address.length >= 6) {
      const addressPrefix = address.substring(0, 10);
      const { data: addressMatches } = await supabase
        .from('organizations')
        .select('id, name, subdomain, address, phone, email')
        .ilike('address', `${addressPrefix}%`)
        .neq('id', excludeId || '00000000-0000-0000-0000-000000000000')
        .limit(10);

      if (addressMatches) {
        addressMatches.forEach((match) => {
          if (!similarOrganizations.find((org) => org.id === match.id)) {
            similarOrganizations.push(match);
          }
        });
      }
    }

    // 4. 電話番号の一致
    if (phone) {
      const cleanedPhone = phone.replace(/[-\s()]/g, '');
      if (cleanedPhone.length >= 10) {
        const { data: phoneMatches } = await supabase
          .from('organizations')
          .select('id, name, subdomain, address, phone, email')
          .eq('phone', phone)
          .neq('id', excludeId || '00000000-0000-0000-0000-000000000000')
          .limit(5);

        if (phoneMatches) {
          phoneMatches.forEach((match) => {
            if (!similarOrganizations.find((org) => org.id === match.id)) {
              similarOrganizations.push(match);
            }
          });
        }
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
