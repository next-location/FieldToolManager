import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { verifyCsrfToken, csrfErrorResponse } from '@/lib/security/csrf';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    // CSRF検証（重要な操作のため）
    if (!await verifyCsrfToken(request)) {
      return csrfErrorResponse();
    }

    // スーパーアドミン認証チェック
    const session = await getSuperAdminSession();
    console.log('[API /api/admin/contracts] Session:', session);
    if (!session) {
      console.log('[API /api/admin/contracts] No session found, returning 401');
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }
    console.log('[API /api/admin/contracts] Session found, user:', session.email);

    // Super Admin の権限を確認
    const { data: adminData, error: adminError } = await supabase
      .from('super_admins')
      .select('role')
      .eq('id', session.id)
      .single();

    if (adminError || !adminData) {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 });
    }

    // Owner権限チェック
    if (adminData.role !== 'owner') {
      return NextResponse.json(
        { error: '契約の作成はオーナーのみ実行できます' },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 管理者情報のバリデーション
    if (!body.adminName || !body.adminEmail || !body.adminPassword) {
      return NextResponse.json({
        error: '初期管理者情報が不足しています。管理者氏名、メールアドレス、パスワードは必須です。'
      }, { status: 400 });
    }

    // パッケージIDからパッケージキーを取得
    let hasAssetPackage = false;
    let hasDxPackage = false;
    let hasFullIntegrationPackage = false;

    if (body.selectedPackageId) {
      const { data: selectedPackage } = await supabase
        .from('packages')
        .select('package_key')
        .eq('id', body.selectedPackageId)
        .single();

      if (selectedPackage) {
        if (selectedPackage.package_key === 'has_asset_package') hasAssetPackage = true;
        if (selectedPackage.package_key === 'has_dx_efficiency_package') hasDxPackage = true;
        if (selectedPackage.package_key === 'has_both_packages') hasFullIntegrationPackage = true;

        // フル機能統合パックが選択されている場合は、両方のフラグをtrueにする
        if (hasFullIntegrationPackage) {
          hasAssetPackage = true;
          hasDxPackage = true;
        }
      }
    }

    // 契約番号を生成（形式: CONT-YYYYMMDD-XXXX）
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0].replace(/-/g, '');

    // 同じ日付の契約数を取得
    const { count } = await supabase
      .from('contracts')
      .select('*', { count: 'exact', head: true })
      .like('contract_number', `CONT-${dateStr}%`);

    const contractNumber = `CONT-${dateStr}-${String((count || 0) + 1).padStart(4, '0')}`;

    // 契約データを作成（draftステータスで保存、アカウントは作成しない）
    const { data: contract, error } = await supabase
      .from('contracts')
      .insert({
        organization_id: body.organizationId,
        contract_number: contractNumber,
        contract_type: body.contractType,
        plan: body.plan,
        has_asset_package: hasAssetPackage,
        has_dx_efficiency_package: hasDxPackage,
        has_both_packages: hasFullIntegrationPackage, // フル機能統合パック
        user_limit: body.userLimit,
        user_count: body.userLimit, // Stripe請求用
        base_monthly_fee: body.baseMonthlyFee,
        package_monthly_fee: body.packageMonthlyFee,
        total_monthly_fee: body.totalMonthlyFee,
        monthly_fee: body.totalMonthlyFee, // 後方互換性のため
        monthly_base_fee: body.baseMonthlyFee, // Stripe請求用
        start_date: body.startDate,
        end_date: body.endDate || null,
        auto_renew: body.autoRenew,
        trial_end_date: body.trialEndDate || null,
        billing_cycle: body.contractType,
        billing_day: body.billingDay || 1, // 請求日（デフォルト1日）
        status: 'draft', // 🔥 契約準備中ステータス

        // 初期費用
        initial_setup_fee: body.initialSetupFee || 0,
        initial_data_registration_fee: body.initialDataRegistrationFee || 0,
        initial_onsite_fee: body.initialOnsiteFee || 0,
        initial_training_fee: body.initialTrainingFee || 0,
        initial_other_fee: body.initialOtherFee || 0,
        initial_discount: body.initialDiscount || 0,
        initial_fee: body.totalInitialFee || 0, // Stripe請求用
        first_month_discount: body.initialDiscount || 0, // Stripe請求用
        total_initial_fee: body.totalInitialFee || 0,

        // 請求情報
        billing_contact_name: body.billingContactName || null,
        billing_contact_email: body.billingContactEmail || null,
        billing_contact_phone: body.billingContactPhone || null,
        billing_address: body.billingAddress || null,

        // 🔥 初期管理者情報（契約完了時に使用）
        admin_name: body.adminName,
        admin_email: body.adminEmail,
        admin_password: body.adminPassword, // プレーンテキストで保存（契約完了時に使用）
        admin_phone: body.adminPhone || null,

        notes: body.notes || null,
        super_admin_created_by: session.id, // スーパーアドミンが作成
        // stripe_customer_idは契約完了時に設定
      })
      .select()
      .single();

    if (error) {
      console.error('Contract creation error:', error);
      return NextResponse.json({ error: '契約の作成に失敗しました', details: error.message }, { status: 500 });
    }

    // 選択されたパッケージをcontract_packagesテーブルに保存
    if (body.selectedPackageId) {
      const { error: packageError } = await supabase
        .from('contract_packages')
        .insert({
          contract_id: contract.id,
          package_id: body.selectedPackageId,
        });

      if (packageError) {
        console.error('Error saving contract package:', packageError);
        // エラーでも契約は作成されているので、警告ログのみ
      }
    }

    // 組織のプラン情報は更新しない（契約完了時に更新）
    // アカウントも作成しない（契約完了時に作成）

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'create_contract_draft',
        details: {
          contract_id: contract.id,
          organization_id: body.organizationId,
          status: 'draft',
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    console.log('[API /api/admin/contracts] Contract created with draft status:', contract.id);

    return NextResponse.json({
      success: true,
      contract,
      message: '契約を作成しました。契約書を作成して、契約完了後にアカウントが有効化されます。',
    });
  } catch (error: any) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'サーバーエラーが発生しました', details: error.message }, { status: 500 });
  }
}
