import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('📋 テスト請求書を作成します...\n');

  // 1. 既存の有効な契約を取得
  const { data: contracts, error: contractError } = await supabase
    .from('contracts')
    .select(`
      id,
      organization_id,
      plan,
      monthly_base_fee,
      has_asset_package,
      has_dx_efficiency_package,
      initial_fee,
      start_date,
      organizations (
        id,
        name,
        billing_address
      )
    `)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (contractError || !contracts) {
    console.error('❌ 契約の取得に失敗:', contractError);
    return;
  }

  console.log('✅ 契約を取得:', (contracts.organizations as any)[0]?.name);

  // 2. 請求書番号を生成
  const invoiceNumber = `INV-TEST-${Date.now()}`;
  const today = new Date();
  const dueDate = new Date(today);
  dueDate.setDate(dueDate.getDate() + 30);

  // 3. 料金計算（初回請求として初期手数料を含む）
  const isInitialInvoice = true; // テストとして初回請求書を作成
  const monthlyBaseFee = contracts.monthly_base_fee || 50000;
  const initialFee = isInitialInvoice ? (contracts.initial_fee || 100000) : 0;

  // 明細データ
  const items = [];

  // 基本プラン料金
  const planName = contracts.plan === 'basic' ? 'ベーシック' :
                   contracts.plan === 'premium' ? 'プレミアム' : 'エンタープライズ';
  items.push({
    description: `基本プラン（${planName}）`,
    amount: Number(monthlyBaseFee),
  });

  // 機能パック料金
  if (contracts.has_asset_package) {
    items.push({
      description: '現場資産パック',
      amount: 20000,
    });
  }
  if (contracts.has_dx_efficiency_package) {
    items.push({
      description: '現場DX業務効率化パック',
      amount: 30000,
    });
  }

  // 初期手数料
  if (initialFee > 0) {
    items.push({
      description: '初期手数料',
      amount: Number(initialFee),
    });
  }

  // 小計・消費税・合計を計算
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const taxAmount = Math.round(subtotal * 0.1);
  const total = subtotal + taxAmount;

  console.log('\n💰 料金内訳:');
  items.forEach(item => {
    console.log(`  - ${item.description}: ¥${item.amount.toLocaleString()}`);
  });
  console.log(`  小計: ¥${subtotal.toLocaleString()}`);
  console.log(`  消費税(10%): ¥${taxAmount.toLocaleString()}`);
  console.log(`  合計: ¥${total.toLocaleString()}\n`);

  // 4. 請求書レコードを作成
  const billingPeriodStart = new Date(today);
  billingPeriodStart.setDate(1); // 今月の1日
  const billingPeriodEnd = new Date(billingPeriodStart);
  billingPeriodEnd.setMonth(billingPeriodEnd.getMonth() + 1);
  billingPeriodEnd.setDate(0); // 今月の最終日

  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      organization_id: contracts.organization_id,
      contract_id: contracts.id,
      invoice_number: invoiceNumber,
      amount: subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      status: 'sent',
      invoice_date: today.toISOString(),
      due_date: dueDate.toISOString(),
      billing_period_start: billingPeriodStart.toISOString().split('T')[0],
      billing_period_end: billingPeriodEnd.toISOString().split('T')[0],
    })
    .select()
    .single();

  if (invoiceError || !invoice) {
    console.error('❌ 請求書の作成に失敗:', invoiceError);
    return;
  }

  console.log('✅ 請求書を作成:', invoice.invoice_number);
  console.log(`   ID: ${invoice.id}`);

  // 5. 請求書明細を作成
  const itemsToInsert = items.map(item => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: 1,
    unit_price: item.amount,
    amount: item.amount,
  }));

  const { error: itemsError } = await supabase
    .from('invoice_items')
    .insert(itemsToInsert);

  if (itemsError) {
    console.error('❌ 請求書明細の作成に失敗:', itemsError);
    return;
  }

  console.log(`✅ 請求書明細を作成: ${itemsToInsert.length}件\n`);

  console.log('🎉 テスト請求書の作成が完了しました！');
  console.log(`\n📄 請求書番号: ${invoice.invoice_number}`);
  console.log(`📅 請求日: ${today.toLocaleDateString('ja-JP')}`);
  console.log(`📅 支払期限: ${dueDate.toLocaleDateString('ja-JP')}`);
  console.log(`💵 合計金額: ¥${total.toLocaleString()}`);
  console.log(`\n🔗 PDFダウンロードURL: http://localhost:3000/api/admin/invoices/${invoice.id}/pdf`);
  console.log(`🔗 管理画面URL: http://localhost:3000/admin/invoices\n`);
}

main().catch(console.error);
