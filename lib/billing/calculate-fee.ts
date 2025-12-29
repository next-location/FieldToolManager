/**
 * 契約情報から月額料金を計算
 *
 * 料金体系:
 * 月額料金 = 基本プラン料金（人数ベース） + 機能パック料金
 *
 * 【基本プラン】（いずれか1つ）:
 * - スタート（~10名）: ¥18,000
 * - スタンダード（11~30名）: ¥45,000
 * - ビジネス（31~50名）: ¥70,000
 * - プロ（51~100名）: ¥120,000
 * - エンタープライズ（101名~）: 要相談
 *
 * 【機能パック】（いずれか1つ）:
 * - 現場資産パックのみ: ¥18,000
 * - 現場DXパックのみ: ¥22,000
 * - フル機能統合パック: ¥32,000
 *
 * 初期費用・割引: 初回請求のみ適用
 */

export interface Contract {
  id: string;
  organization_id: string;
  plan: 'start' | 'standard' | 'business' | 'pro' | 'enterprise' | 'basic' | 'premium'; // basic,premiumは旧データ用
  user_count: number;

  // パッケージ選択（いずれか1つのみtrue）
  has_asset_package: boolean;         // 現場資産パックのみ
  has_dx_efficiency_package: boolean; // 現場DXパックのみ
  has_both_packages: boolean;         // フル機能統合パック

  // 初期費用・割引（初回のみ）
  initial_setup_fee: number;
  initial_discount: number; // パーセンテージ（例: 10 = 10%）

  // 基本プラン料金（契約で個別設定）
  monthly_base_fee?: number; // 人数ベース基本料金

  // 請求サイクル（2025-12-29追加）
  billing_cycle: 'monthly' | 'annual'; // 月払い/年払い

  // Stripe情報
  stripe_customer_id: string | null;

  // プラン変更関連（2025-12-29追加）
  pending_prorated_charge?: number;      // 次回請求に加算する日割り差額
  pending_prorated_description?: string | null; // 日割り差額の説明

  // その他
  start_date: string;
  created_at: string;
}

export interface MonthlyFeeCalculation {
  // 明細
  items: Array<{
    description: string;
    amount: number;
    type: 'package' | 'base_fee' | 'initial_fee' | 'discount' | 'prorated_charge';
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

  // 年払いの場合は12倍する
  const multiplier = contract.billing_cycle === 'annual' ? 12 : 1;

  // 1. 基本プラン料金（人数ベース）
  if (contract.monthly_base_fee && contract.monthly_base_fee > 0) {
    const planNames: Record<string, string> = {
      start: 'スタート',
      standard: 'スタンダード',
      business: 'ビジネス',
      pro: 'プロ',
      enterprise: 'エンタープライズ',
      basic: 'ベーシック（旧）',
      premium: 'プレミアム（旧）',
    };
    const planName = planNames[contract.plan] || contract.plan;
    const amount = contract.monthly_base_fee * multiplier;

    items.push({
      description: contract.billing_cycle === 'annual'
        ? `基本プラン（${planName}・${contract.user_count}名）年払い`
        : `基本プラン（${planName}・${contract.user_count}名）`,
      amount,
      type: 'base_fee',
    });
    subtotal += amount;
  }

  // 2. 機能パッケージ料金（いずれか1つのみ）
  if (contract.has_both_packages) {
    const amount = PACKAGE_PRICING.both * multiplier;
    items.push({
      description: contract.billing_cycle === 'annual'
        ? 'フル機能統合パック（年払い）'
        : 'フル機能統合パック',
      amount,
      type: 'package',
    });
    subtotal += amount;
  } else if (contract.has_asset_package) {
    const amount = PACKAGE_PRICING.asset * multiplier;
    items.push({
      description: contract.billing_cycle === 'annual'
        ? '現場資産パック（年払い）'
        : '現場資産パック',
      amount,
      type: 'package',
    });
    subtotal += amount;
  } else if (contract.has_dx_efficiency_package) {
    const amount = PACKAGE_PRICING.dx * multiplier;
    items.push({
      description: contract.billing_cycle === 'annual'
        ? '現場DX業務効率化パック（年払い）'
        : '現場DX業務効率化パック',
      amount,
      type: 'package',
    });
    subtotal += amount;
  }

  // 3. プラン変更時の日割り差額（グレードアップ時のみ）
  if (contract.pending_prorated_charge && contract.pending_prorated_charge > 0) {
    items.push({
      description: contract.pending_prorated_description || 'プラン変更差額',
      amount: contract.pending_prorated_charge,
      type: 'prorated_charge',
    });
    subtotal += contract.pending_prorated_charge;
  }

  // 4. 初期費用（初回のみ）
  if (firstInvoice && contract.initial_setup_fee > 0) {
    items.push({
      description: '初期導入費用（一回限り）',
      amount: contract.initial_setup_fee,
      type: 'initial_fee',
    });
    subtotal += contract.initial_setup_fee;
  }

  // 5. 割引計算（初回のみ）
  let discount = 0;
  if (firstInvoice && contract.initial_discount > 0) {
    discount = contract.initial_discount; // 金額をそのまま使用
    items.push({
      description: `初回割引`,
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
