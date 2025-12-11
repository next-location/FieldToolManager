import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// GET /api/admin/packages/[id] - パッケージ詳細取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: packageData, error } = await supabase
      .from('packages')
      .select(`
        *,
        features:package_features(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching package:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!packageData) {
      return NextResponse.json({ error: 'パッケージが見つかりません' }, { status: 404 });
    }

    // 機能リストをソート
    const packageWithSortedFeatures = {
      ...packageData,
      features: packageData.features?.sort((a: any, b: any) => a.display_order - b.display_order) || [],
    };

    return NextResponse.json(packageWithSortedFeatures);
  } catch (error: any) {
    console.error('Error in GET /api/admin/packages/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT /api/admin/packages/[id] - パッケージ更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { error: 'パッケージの編集はオーナーのみ実行できます' },
        { status: 403 }
      );
    }

    const body = await request.json();

    const { name, description, monthly_fee, package_key, is_active, features } = body;

    // パッケージ本体を更新
    const { data: updatedPackage, error: packageError } = await supabase
      .from('packages')
      .update({
        name,
        description,
        monthly_fee,
        package_key,
        is_active,
      })
      .eq('id', id)
      .select()
      .single();

    if (packageError) {
      console.error('Error updating package:', packageError);
      return NextResponse.json({ error: packageError.message }, { status: 500 });
    }

    // 既存の機能を削除
    const { error: deleteError } = await supabase
      .from('package_features')
      .delete()
      .eq('package_id', id);

    if (deleteError) {
      console.error('Error deleting old features:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // 新しい機能リストを追加
    if (features && Array.isArray(features) && features.length > 0) {
      const featuresToInsert = features.map((feature: any, index: number) => ({
        package_id: id,
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

    return NextResponse.json(updatedPackage);
  } catch (error: any) {
    console.error('Error in PUT /api/admin/packages/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/packages/[id] - パッケージ削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
        { error: 'パッケージの削除はオーナーのみ実行できます' },
        { status: 403 }
      );
    }

    // 契約で使用されているかチェック
    const { data: contractPackages, error: checkError } = await supabase
      .from('contract_packages')
      .select('id')
      .eq('package_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking contract packages:', checkError);
      return NextResponse.json({ error: checkError.message }, { status: 500 });
    }

    if (contractPackages && contractPackages.length > 0) {
      return NextResponse.json(
        { error: 'このパッケージは契約で使用されているため削除できません' },
        { status: 400 }
      );
    }

    // パッケージを削除（CASCADE で機能も削除される）
    const { error: deleteError } = await supabase
      .from('packages')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting package:', deleteError);
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'パッケージを削除しました' });
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/packages/[id]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
