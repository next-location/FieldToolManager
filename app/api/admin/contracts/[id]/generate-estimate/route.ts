import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { stripe } from '@/lib/stripe/client';
import { calculateMonthlyFee, Contract } from '@/lib/billing/calculate-fee';
import { setupContractBilling } from '@/lib/billing/setup-contract-billing';
import { getAdjustedBillingDate } from '@/lib/utils/business-days';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * 見積もり生成API
 *
 * POST /api/admin/contracts/[id]/generate-estimate
 *
 * 契約のdraft状態で見積もりを生成します。
 * - 初期費用、初回割引、1ヶ月分（または1年分）の料金を計算
 * - Stripe Invoiceを作成（Draft状態のまま）
 * - データベースにinvoiceレコードを保存（document_type = 'estimate', status = 'estimate'）
 * - メール送信は行わない（プレビュー用）
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // スーパーアドミン認証チェック
    const session = await getSuperAdminSession();
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    // 営業権限チェック
    const { data: adminData } = await supabase
      .from('super_admins')
      .select('role')
      .eq('id', session.id)
      .single();

    if (adminData?.role === 'sales') {
      return NextResponse.json(
        { error: '営業権限では見積もりを生成できません' },
        { status: 403 }
      );
    }

    const { id: contractId } = await params;

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations!inner (
          id,
          name,
          payment_method
        )
      `)
      .eq('id', contractId)
      .single();

    if (contractError || !contract) {
      return NextResponse.json({ error: '契約が見つかりません' }, { status: 404 });
    }

    // organizationsは配列として返される可能性があるため、最初の要素を取得
    const organization = Array.isArray(contract.organizations)
      ? contract.organizations[0]
      : contract.organizations;

    if (!organization) {
      return NextResponse.json({ error: '組織情報が見つかりません' }, { status: 404 });
    }

    // ステータスがdraftであることを確認
    if (contract.status !== 'draft') {
      return NextResponse.json({
        error: `見積もりはdraft状態の契約でのみ生成できます。現在のステータス: ${contract.status}`
      }, { status: 400 });
    }

    // Stripe Customerが未作成の場合は自動作成
    let stripeCustomerId = contract.stripe_customer_id;
    if (!stripeCustomerId) {
      console.log('[GenerateEstimate] Stripe Customer not found, creating...');
      const billingResult = await setupContractBilling({
        contractId: contract.id,
        organizationId: organization.id,
        organizationName: organization.name,
        email: contract.admin_email || '',
        paymentMethod: organization.payment_method || 'invoice',
      });

      if (!billingResult.success || !billingResult.customerId) {
        return NextResponse.json({
          error: 'Stripe Customerの作成に失敗しました',
          details: billingResult.error,
        }, { status: 500 });
      }

      stripeCustomerId = billingResult.customerId;
      console.log('[GenerateEstimate] Stripe Customer created:', stripeCustomerId);
    }

    // デバッグ: 契約データの確認
    console.log('[GenerateEstimate] Contract data:', {
      contractId,
      plan: contract.plan,
      user_count: contract.user_count,
      billing_cycle: contract.billing_cycle,
      has_asset_package: contract.has_asset_package,
      has_dx_efficiency_package: contract.has_dx_efficiency_package,
      has_both_packages: contract.has_both_packages,
      base_monthly_fee: contract.base_monthly_fee,
      package_monthly_fee: contract.package_monthly_fee,
      total_monthly_fee: contract.total_monthly_fee,
      initial_setup_fee: contract.initial_setup_fee,
      initial_data_registration_fee: contract.initial_data_registration_fee,
      initial_onsite_fee: contract.initial_onsite_fee,
      initial_training_fee: contract.initial_training_fee,
      initial_other_fee: contract.initial_other_fee,
      initial_discount: contract.initial_discount,
    });

    // 料金計算（初回なので初期費用・割引が含まれる）
    const feeCalculation = calculateMonthlyFee(contract as Contract);

    console.log('[GenerateEstimate] Calculated fee:', {
      contractId,
      items: feeCalculation.items,
      subtotal: feeCalculation.subtotal,
      discount: feeCalculation.discount,
      total: feeCalculation.total,
      isFirstInvoice: feeCalculation.isFirstInvoice,
    });

    if (feeCalculation.total <= 0) {
      return NextResponse.json({
        error: '見積金額が0円以下です。契約内容を確認してください。',
      }, { status: 400 });
    }

    // Stripe Invoiceを作成（Draft状態のまま）
    const billingMonth = contract.billing_cycle === 'annual'
      ? `${new Date(contract.start_date).getFullYear()}年度`
      : `初回見積もり`;

    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      description: `初回見積もり（契約番号: ${contract.contract_number}）`,
      collection_method: organization.payment_method === 'card' ? 'charge_automatically' : 'send_invoice',
      days_until_due: organization.payment_method === 'card' ? undefined : 30,
      auto_advance: false,
      metadata: {
        contract_id: contract.id,
        organization_id: organization.id,
        billing_month: billingMonth,
        is_initial_invoice: 'true',
        document_type: 'estimate',
      },
    });

    // Stripe Invoice Itemsを作成
    for (const item of feeCalculation.items) {
      await stripe.invoiceItems.create({
        customer: stripeCustomerId,
        invoice: invoice.id,
        amount: item.amount,
        currency: 'jpy',
        description: item.description,
      });
    }

    console.log('[GenerateEstimate] Stripe invoice created (draft):', {
      invoiceId: invoice.id,
      amount: invoice.amount_due,
    });

    // 見積もり番号を生成（Stripe Invoiceがdraftの場合はnumberがnullのため）
    const estimateNumber = `EST-${Date.now()}`;
    const estimateDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD形式

    // 支払期限を契約のbilling_dayに基づいて計算（営業日調整あり）
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

    // getAdjustedBillingDate で営業日調整を適用
    const adjustedBillingDate = getAdjustedBillingDate(contract.billing_day, nextMonth);
    const dueDate = adjustedBillingDate.toISOString().split('T')[0];

    // 税込金額を計算
    const subtotalAfterDiscount = feeCalculation.total || 0;
    const taxAmount = Math.round(subtotalAfterDiscount * 0.1);
    const totalWithTax = subtotalAfterDiscount + taxAmount;

    // データベースに見積もりレコード保存
    const { data: savedEstimate, error: insertError } = await supabase
      .from('invoices')
      .insert({
        organization_id: organization.id,
        contract_id: contract.id,
        stripe_invoice_id: invoice.id,
        invoice_number: estimateNumber,
        invoice_date: estimateDate,
        billing_period_start: estimateDate,
        billing_period_end: estimateDate,
        amount: subtotalAfterDiscount,
        tax_amount: taxAmount,
        total_amount: totalWithTax,
        status: 'estimate',
        document_type: 'estimate',
        due_date: dueDate,
        is_initial_invoice: true,
      })
      .select()
      .single();

    if (insertError || !savedEstimate) {
      console.error('[GenerateEstimate] Failed to save estimate:', insertError);
      return NextResponse.json({
        error: 'データベースへの保存に失敗しました',
        details: insertError?.message,
      }, { status: 500 });
    }

    // invoice_itemsテーブルに明細を保存
    const itemsToInsert = feeCalculation.items.map(item => ({
      invoice_id: savedEstimate.id,
      description: item.description,
      quantity: 1,
      unit_price: item.amount,
      amount: item.amount,
    }));

    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error('[GenerateEstimate] Failed to save invoice items:', itemsError);
    }

    // ログを記録
    await supabase
      .from('super_admin_logs')
      .insert({
        super_admin_id: session.id,
        action: 'generate_estimate',
        details: {
          contract_id: contractId,
          estimate_id: savedEstimate.id,
          estimate_number: savedEstimate.invoice_number,
          total_amount: savedEstimate.total_amount,
        },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent'),
      });

    return NextResponse.json({
      success: true,
      message: '見積もりを生成しました',
      estimate_id: savedEstimate.id,
      estimate_number: savedEstimate.invoice_number,
      total_amount: savedEstimate.total_amount,
      status: savedEstimate.status,
      due_date: savedEstimate.due_date,
    });
  } catch (error: any) {
    console.error('[GenerateEstimate] Error:', error);
    return NextResponse.json({
      error: 'サーバーエラーが発生しました',
      details: error.message,
    }, { status: 500 });
  }
}
