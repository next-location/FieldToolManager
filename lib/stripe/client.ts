import Stripe from 'stripe';

// Stripe APIバージョン
// const STRIPE_API_VERSION = '2024-11-20.acacia';

// 環境に応じたStripe Secret Keyを取得
const stripeSecretKey = process.env.NODE_ENV === 'production'
  ? process.env.STRIPE_SECRET_KEY
  : process.env.STRIPE_TEST_SECRET_KEY;

if (!stripeSecretKey) {
  const keyName = process.env.NODE_ENV === 'production' ? 'STRIPE_SECRET_KEY' : 'STRIPE_TEST_SECRET_KEY';
  throw new Error(`Stripe secret key is not defined. Please set ${keyName} in environment variables`);
}

// Stripe Clientの初期化
export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-11-17.clover',
  typescript: true,
});

// Price IDマッピング
// Stripe Productsを作成後、これらの環境変数を設定する必要があります
export const PRICE_IDS = {
  basic: process.env.STRIPE_PRICE_BASIC || '',
  standard: process.env.STRIPE_PRICE_STANDARD || '',
  premium: process.env.STRIPE_PRICE_PREMIUM || '',
} as const;

// プラン名からPrice IDを取得するヘルパー関数
export function getPriceId(plan: 'basic' | 'standard' | 'premium'): string {
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    throw new Error(`Price ID for plan "${plan}" is not defined. Please set STRIPE_PRICE_${plan.toUpperCase()} in .env.local`);
  }
  return priceId;
}

// Stripe Customer IDの検証
export function isValidStripeCustomerId(customerId: string): boolean {
  return customerId.startsWith('cus_') && customerId.length > 14;
}

// Stripe Subscription IDの検証
export function isValidStripeSubscriptionId(subscriptionId: string): boolean {
  return subscriptionId.startsWith('sub_') && subscriptionId.length > 14;
}
