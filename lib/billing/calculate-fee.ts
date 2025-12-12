/**
 * 契約情報から月額料金を計算
 *
 * 料金体系:
 * - 基本料金（人数ベース）: 契約で個別設定
 * - パッケージ料金:
 *   - 現場資産パック: ¥18,000
 *   - 現場DX業務効率化パック: ¥22,000
 *   - フル機能統合パック: ¥32,000（両方の割引適用）
 * - 初期費用: 初回のみ（契約で個別設定）
 * - 割引: 初回のみ（契約で個別設定）
 */

export interface Contract {
  id: string;
  organization_id: string;
  plan: 'basic' | 'standard' | 'premium';
  user_count: number;

  // パッケージ選択
  has_asset_package: boolean;
  has_dx_efficiency_package: boolean;
  has_both_packages: boolean;

  // 初期費用・割引
  initial_setup_fee: number;
  initial_discount: number; // パーセンテージ（例: 10 = 10%）

  // 個別設定料金
  monthly_base_fee?: number; // 人数ベース基本料金（個別設定）

  // Stripe情報
  stripe_customer_id: string | null;

  // その他
  start_date: string;
  created_at: string;
}

export interface MonthlyFeeCalculation {
  // 明細
  items: Array<{
    description: string;
    amount: number;
    type: 'package' | 'base_fee' | 'initial_fee' | 'discount';
  }>;

  // 合計
  subtotal: number;
  discount: number;
  total: number;

  // フラグ
  isFirstInvoice: boolean;
}

/**
 * パッケージ料金定義
 */
const PACKAGE_PRICING = {
  asset: 18000,      // 現場資産パック
  dx: 22000,         // 現場DX業務効率化パック
  both: 32000,       // フル機能統合パック（割引適用済み）
} as const;

/**
 * 初回請求かどうかを判定
 */
export function isFirstInvoice(contract: Contract): boolean {
  const startDate = new Date(contract.start_date);
  const today = new Date();

  // 契約開始から1ヶ月以内なら初回
  const oneMonthLater = new Date(startDate);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

  return today <= oneMonthLater;
}

/**
 * 契約情報から月額料金を計算
 */
export function calculateMonthlyFee(contract: Contract): MonthlyFeeCalculation {
  const items: MonthlyFeeCalculation['items'] = [];
  let subtotal = 0;
  const firstInvoice = isFirstInvoice(contract);

  // 1. パッケージ料金
  if (contract.has_both_packages) {
    // フル機能統合パック
    items.push({
      description: 'フル機能統合パック',
      amount: PACKAGE_PRICING.both,
      type: 'package',
    });
    subtotal += PACKAGE_PRICING.both;
  } else {
    // 個別パッケージ
    if (contract.has_asset_package) {
      items.push({
        description: '現場資産パック',
        amount: PACKAGE_PRICING.asset,
        type: 'package',
      });
      subtotal += PACKAGE_PRICING.asset;
    }

    if (contract.has_dx_efficiency_package) {
      items.push({
        description: '現場DX業務効率化パック',
        amount: PACKAGE_PRICING.dx,
        type: 'package',
      });
      subtotal += PACKAGE_PRICING.dx;
    }
  }

  // 2. 基本料金（人数ベース、個別設定）
  if (contract.monthly_base_fee && contract.monthly_base_fee > 0) {
    items.push({
      description: `基本料金（${contract.user_count}名）`,
      amount: contract.monthly_base_fee,
      type: 'base_fee',
    });
    subtotal += contract.monthly_base_fee;
  }

  // 3. 初期費用（初回のみ）
  if (firstInvoice && contract.initial_setup_fee > 0) {
    items.push({
      description: '初期導入費用（一回限り）',
      amount: contract.initial_setup_fee,
      type: 'initial_fee',
    });
    subtotal += contract.initial_setup_fee;
  }

  // 4. 割引計算（初回のみ）
  let discount = 0;
  if (firstInvoice && contract.initial_discount > 0) {
    discount = Math.floor(subtotal * (contract.initial_discount / 100));
    items.push({
      description: `初回割引（${contract.initial_discount}%）`,
      amount: -discount,
      type: 'discount',
    });
  }

  const total = subtotal - discount;

  return {
    items,
    subtotal,
    discount,
    total,
    isFirstInvoice: firstInvoice,
  };
}

/**
 * 料金明細を文字列に整形（メール・PDF用）
 */
export function formatFeeBreakdown(calculation: MonthlyFeeCalculation): string {
  let text = '';

  calculation.items.forEach((item) => {
    const amountStr = item.amount >= 0
      ? `¥${item.amount.toLocaleString('ja-JP')}`
      : `-¥${Math.abs(item.amount).toLocaleString('ja-JP')}`;
    text += `${item.description}: ${amountStr}\n`;
  });

  text += `\n小計: ¥${calculation.subtotal.toLocaleString('ja-JP')}`;

  if (calculation.discount > 0) {
    text += `\n割引: -¥${calculation.discount.toLocaleString('ja-JP')}`;
  }

  text += `\n\n合計: ¥${calculation.total.toLocaleString('ja-JP')}`;

  return text;
}

/**
 * Stripe Invoice Item用の説明文を生成
 */
export function generateInvoiceDescription(contract: Contract, billingMonth: string): string {
  const packages: string[] = [];

  if (contract.has_both_packages) {
    packages.push('フル機能統合パック');
  } else {
    if (contract.has_asset_package) packages.push('現場資産パック');
    if (contract.has_dx_efficiency_package) packages.push('現場DX業務効率化パック');
  }

  const packageStr = packages.join('、');
  const userCountStr = `${contract.user_count}名`;

  return `${billingMonth}分利用料（${packageStr}、${userCountStr}）`;
}
