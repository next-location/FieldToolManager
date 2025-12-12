/**
 * Stripe Products & Prices セットアップスクリプト
 *
 * このスクリプトは以下を実行します：
 * 1. Basic/Standard/Premiumの3つのプランを作成
 * 2. 各プランの月額料金を設定
 * 3. Price IDを出力（.env.localに設定が必要）
 *
 * 実行方法:
 * npx tsx scripts/setup-stripe-products.ts
 */

import Stripe from 'stripe';
import * as dotenv from 'dotenv';

// 環境変数の読み込み
dotenv.config({ path: '.env.local' });

const stripeSecretKey = process.env.STRIPE_TEST_SECRET_KEY;

if (!stripeSecretKey) {
  console.error('❌ エラー: STRIPE_TEST_SECRET_KEY が .env.local に設定されていません');
  console.error('');
  console.error('Stripe Dashboardから取得してください:');
  console.error('https://dashboard.stripe.com/test/apikeys');
  console.error('');
  process.exit(1);
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-11-20.acacia',
  typescript: true,
});

interface Plan {
  name: string;
  description: string;
  amount: number; // JPY
  nickname: string;
}

const PLANS: Plan[] = [
  {
    name: 'Field Tool Manager - Basic Plan',
    description: '基本プラン（10名まで）',
    amount: 10000,
    nickname: 'basic_monthly',
  },
  {
    name: 'Field Tool Manager - Standard Plan',
    description: '標準プラン（30名まで）',
    amount: 20000,
    nickname: 'standard_monthly',
  },
  {
    name: 'Field Tool Manager - Premium Plan',
    description: 'プレミアムプラン（100名まで）',
    amount: 30000,
    nickname: 'premium_monthly',
  },
];

async function setupProducts() {
  console.log('🚀 Stripe Products & Prices のセットアップを開始します...\n');

  try {
    // 既存のProductsを確認
    const existingProducts = await stripe.products.list({ limit: 100 });
    console.log(`📦 既存のProducts: ${existingProducts.data.length}件`);

    const results: Array<{ plan: string; productId: string; priceId: string }> = [];

    for (const plan of PLANS) {
      console.log(`\n⚙️  ${plan.name} を作成中...`);

      // 同名のProductが既に存在するかチェック
      const existingProduct = existingProducts.data.find((p) => p.name === plan.name);

      let product: Stripe.Product;
      if (existingProduct) {
        console.log(`✓ Product が既に存在します: ${existingProduct.id}`);
        product = existingProduct;
      } else {
        // Product作成
        product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: {
            plan_type: plan.nickname.replace('_monthly', ''),
          },
        });
        console.log(`✓ Product を作成しました: ${product.id}`);
      }

      // 既存のPriceを確認
      const existingPrices = await stripe.prices.list({
        product: product.id,
        limit: 10,
      });

      const existingPrice = existingPrices.data.find(
        (p) => p.nickname === plan.nickname && p.active
      );

      let price: Stripe.Price;
      if (existingPrice) {
        console.log(`✓ Price が既に存在します: ${existingPrice.id}`);
        price = existingPrice;
      } else {
        // Price作成
        price = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.amount,
          currency: 'jpy',
          recurring: {
            interval: 'month',
            interval_count: 1,
          },
          nickname: plan.nickname,
          metadata: {
            plan_type: plan.nickname.replace('_monthly', ''),
          },
        });
        console.log(`✓ Price を作成しました: ${price.id}`);
        console.log(`  金額: ¥${(plan.amount).toLocaleString('ja-JP')}/月`);
      }

      results.push({
        plan: plan.nickname.replace('_monthly', '').toUpperCase(),
        productId: product.id,
        priceId: price.id,
      });
    }

    // 結果を表示
    console.log('\n' + '='.repeat(80));
    console.log('✅ セットアップ完了！');
    console.log('='.repeat(80));
    console.log('\n以下のPrice IDを .env.local に追加してください:\n');

    results.forEach((result) => {
      console.log(`STRIPE_PRICE_${result.plan}=${result.priceId}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('📝 次のステップ:');
    console.log('1. 上記のPrice IDを .env.local にコピー&ペースト');
    console.log('2. Next.jsアプリを再起動');
    console.log('3. Customer作成APIをテスト');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      console.error('\n❌ Stripeエラー:', error.message);
      console.error('エラータイプ:', error.type);
      if (error.code) {
        console.error('エラーコード:', error.code);
      }
    } else {
      console.error('\n❌ 予期しないエラー:', error);
    }
    process.exit(1);
  }
}

// スクリプト実行
setupProducts();
