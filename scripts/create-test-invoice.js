require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestInvoice() {
  try {
    console.log('=== テスト用未払い請求書作成スクリプト ===\n');

    // 1. 組織を取得
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, subdomain')
      .limit(5);

    if (orgError || !orgs || orgs.length === 0) {
      console.error('❌ 組織が見つかりません:', orgError);
      return;
    }

    console.log('✅ 組織一覧:');
    orgs.forEach((org, i) => {
      console.log(`  ${i + 1}. ${org.name} (${org.subdomain || 'サブドメインなし'})`);
    });

    const targetOrg = orgs[0];
    console.log(`\n📌 対象組織: ${targetOrg.name} (ID: ${targetOrg.id})\n`);

    // 2. 契約を取得または確認
    const { data: contracts } = await supabase
      .from('contracts')
      .select('*')
      .eq('organization_id', targetOrg.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!contracts) {
      console.log('⚠️  有効な契約がありません。契約を作成してください。');
      return;
    }

    console.log(`✅ 契約情報:`);
    console.log(`  - 契約番号: ${contracts.contract_number}`);
    console.log(`  - 月額料金: ¥${contracts.total_monthly_fee.toLocaleString()}\n`);

    // 3. 既存の請求書を確認
    const { data: existingInvoices } = await supabase
      .from('invoices')
      .select('*')
      .eq('organization_id', targetOrg.id)
      .order('created_at', { ascending: false })
      .limit(3);

    console.log(`📄 既存請求書: ${existingInvoices?.length || 0}件`);
    if (existingInvoices && existingInvoices.length > 0) {
      existingInvoices.forEach((inv) => {
        console.log(`  - ${inv.invoice_number}: ${inv.status} (¥${inv.total_amount.toLocaleString()})`);
      });
    }
    console.log('');

    // 4. テスト用請求書を作成
    const invoiceDate = new Date();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30); // 30日後

    const invoiceNumber = `INV-TEST-${Date.now()}`;

    const taxAmount = Math.floor(contracts.total_monthly_fee * 0.10);
    const totalAmount = contracts.total_monthly_fee + taxAmount;

    const invoiceData = {
      organization_id: targetOrg.id,
      contract_id: contracts.id,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate.toISOString().split('T')[0],
      due_date: dueDate.toISOString().split('T')[0],
      amount: contracts.total_monthly_fee,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      status: 'sent', // 'unpaid' ではなく 'sent' を使用
      billing_period_start: invoiceDate.toISOString().split('T')[0],
      billing_period_end: new Date(invoiceDate.getFullYear(), invoiceDate.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0],
      notes: 'テスト用請求書（入金管理テスト用）',
    };

    console.log('📝 請求書データ:');
    console.log(JSON.stringify(invoiceData, null, 2));
    console.log('');

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (invoiceError) {
      console.error('❌ 請求書作成エラー:', invoiceError);
      return;
    }

    console.log('✅ 請求書作成完了！\n');
    console.log('=== 作成された請求書 ===');
    console.log(`請求書番号: ${invoice.invoice_number}`);
    console.log(`組織: ${targetOrg.name}`);
    console.log(`請求日: ${invoice.invoice_date}`);
    console.log(`支払期限: ${invoice.due_date}`);
    console.log(`金額: ¥${invoice.amount.toLocaleString()}`);
    console.log(`消費税: ¥${invoice.tax_amount.toLocaleString()}`);
    console.log(`合計: ¥${invoice.total_amount.toLocaleString()}`);
    console.log(`ステータス: ${invoice.status}`);
    console.log('');
    console.log('🔗 システム管理画面で確認:');
    console.log('   http://localhost:3000/admin/invoices');
    console.log('');
    console.log('💡 入金記録作成手順:');
    console.log('   1. http://localhost:3000/admin/payments にアクセス');
    console.log('   2. 「+ 入金記録」ボタンをクリック');
    console.log(`   3. 請求書「${invoice.invoice_number}」を選択`);
    console.log('   4. 入金情報を入力して保存');

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

createTestInvoice();
