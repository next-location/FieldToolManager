import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/admin/packages - パッケージ一覧取得
export async function GET() {
  try {
    // サービスロールキーでSupabaseクライアントを作成（RLS回避）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // パッケージ一覧を取得（機能リスト含む）
    const { data: packages, error } = await supabase
      .from('packages')
      .select(`
        *,
        features:package_features(*)
      `)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching packages:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 機能リストをソート
    const packagesWithSortedFeatures = packages?.map((pkg) => ({
      ...pkg,
      features: pkg.features?.sort((a: any, b: any) => a.display_order - b.display_order) || [],
    }));

    return NextResponse.json(packagesWithSortedFeatures);
  } catch (error: any) {
    console.error('Error in GET /api/admin/packages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/admin/packages - 新規パッケージ作成
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // セッションから管理者IDを取得
    const authHeader = request.headers.get('cookie');
    if (!authHeader) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // Super Admin の権限を確認
    const adminId = authHeader.match(/super_admin_id=([^;]+)/)?.[1];
    if (!adminId) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { data: adminData, error: adminError } = await supabase
      .from('super_admins')
      .select('role')
      .eq('id', adminId)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 });
    }

    // Owner権限チェック
    if (adminData.role !== 'owner') {
      return NextResponse.json(
        { error: 'パッケージの作成はオーナーのみ実行できます' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { name, description, monthly_fee, features } = body;

    // バリデーション
    if (!name || monthly_fee === undefined || monthly_fee === null) {
      return NextResponse.json(
        { error: 'name, monthly_fee は必須です' },
        { status: 400 }
      );
    }

    // 表示順の最大値を取得
    const { data: maxOrderData } = await supabase
      .from('packages')
      .select('display_order')
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrderData?.display_order || 0) + 1;

    // パッケージキーを自動生成（package_001, package_002, ...）
    const { count } = await supabase
      .from('packages')
      .select('*', { count: 'exact', head: true });

    const packageKey = `package_${String((count || 0) + 1).padStart(3, '0')}`;

    // パッケージを作成
    const { data: newPackage, error: packageError } = await supabase
      .from('packages')
      .insert({
        name,
        description,
        monthly_fee,
        package_key: packageKey,
        display_order: nextOrder,
      })
      .select()
      .single();

    if (packageError) {
      console.error('Error creating package:', packageError);
      return NextResponse.json({ error: packageError.message }, { status: 500 });
    }

    // 機能リストを追加
    if (features && Array.isArray(features) && features.length > 0) {
      const featuresToInsert = features.map((feature: any, index: number) => ({
        package_id: newPackage.id,
        feature_name: feature.feature_name,
        feature_key: feature.feature_key,
        is_header: feature.is_header || false,
        display_order: index,
      }));

      const { error: featuresError } = await supabase
        .from('package_features')
        .insert(featuresToInsert);

      if (featuresError) {
        console.error('Error creating package features:', featuresError);
        return NextResponse.json({ error: featuresError.message }, { status: 500 });
      }
    }

    return NextResponse.json(newPackage, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/admin/packages:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
