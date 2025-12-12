import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function main() {
  console.log('🗑️  テスト請求書を削除します...\n');

  // テスト請求書を削除（invoice_numberがINV-TESTで始まるもの）
  const { data: deletedInvoices, error } = await supabase
    .from('invoices')
    .delete()
    .like('invoice_number', 'INV-TEST%')
    .select();

  if (error) {
    console.error('❌ 削除に失敗:', error);
    return;
  }

  console.log(`✅ ${deletedInvoices?.length || 0}件のテスト請求書を削除しました\n`);

  if (deletedInvoices && deletedInvoices.length > 0) {
    console.log('削除された請求書:');
    deletedInvoices.forEach(inv => {
      console.log(`  - ${inv.invoice_number} (¥${inv.total_amount?.toLocaleString()})`);
    });
  }
}

main().catch(console.error);
