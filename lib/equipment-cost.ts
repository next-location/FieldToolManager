// 重機コスト計算ユーティリティ
// 作成日: 2025-12-04

import type {
  HeavyEquipment,
  HeavyEquipmentMaintenance,
  EquipmentCostSummary,
  DepreciationCalculation,
  CostReport,
} from '@/types/heavy-equipment';

// ==========================================
// 減価償却計算
// ==========================================

/**
 * 建設機械の法定耐用年数マッピング（国税庁基準）
 */
const USEFUL_LIFE_MAP: Record<string, number> = {
  backhoe: 6,        // バックホウ
  dump_truck: 4,     // ダンプトラック
  crane: 7,          // クレーン車
  bulldozer: 6,      // ブルドーザー
  roller: 6,         // ローラー
  excavator: 6,      // 掘削機
  forklift: 4,       // フォークリフト
  mixer_truck: 4,    // ミキサー車
  default: 6,        // デフォルト
};

/**
 * 減価償却計算（定額法）
 */
export function calculateDepreciation(
  equipment: HeavyEquipment,
  categoryCode?: string
): DepreciationCalculation | null {
  if (equipment.ownership_type !== 'owned' || !equipment.purchase_price || !equipment.purchase_date) {
    return null;
  }

  const purchasePrice = equipment.purchase_price;
  const purchaseDate = new Date(equipment.purchase_date);
  const today = new Date();

  // 耐用年数の取得
  const usefulLifeYears = categoryCode
    ? USEFUL_LIFE_MAP[categoryCode] || USEFUL_LIFE_MAP.default
    : USEFUL_LIFE_MAP.default;

  // 経過月数
  const monthsElapsed =
    (today.getFullYear() - purchaseDate.getFullYear()) * 12 +
    (today.getMonth() - purchaseDate.getMonth());

  // 定額法: 年間償却額 = 取得価額 / 耐用年数
  const annualDepreciation = Math.floor(purchasePrice / usefulLifeYears);

  // 累計償却額 = (年間償却額 / 12) * 経過月数
  const accumulatedDepreciation = Math.min(
    Math.floor((annualDepreciation / 12) * monthsElapsed),
    purchasePrice
  );

  // 簿価 = 取得価額 - 累計償却額
  const bookValue = Math.max(purchasePrice - accumulatedDepreciation, 0);

  // 償却完了判定（簿価が0または耐用年数経過）
  const depreciationComplete =
    bookValue === 0 ||
    monthsElapsed >= usefulLifeYears * 12;

  return {
    equipment_id: equipment.id,
    purchase_price: purchasePrice,
    purchase_date: equipment.purchase_date,
    useful_life_years: usefulLifeYears,
    depreciation_method: 'straight_line',
    annual_depreciation: annualDepreciation,
    accumulated_depreciation: accumulatedDepreciation,
    book_value: bookValue,
    depreciation_complete: depreciationComplete,
  };
}

// ==========================================
// リース・レンタルコスト計算
// ==========================================

/**
 * リース・レンタルの残り月数とコスト計算
 */
export function calculateLeaseCost(equipment: HeavyEquipment): {
  monthsRemaining: number | null;
  totalLeaseCost: number;
} {
  if (
    (equipment.ownership_type !== 'leased' && equipment.ownership_type !== 'rented') ||
    !equipment.monthly_cost ||
    !equipment.contract_start_date ||
    !equipment.contract_end_date
  ) {
    return { monthsRemaining: null, totalLeaseCost: 0 };
  }

  const today = new Date();
  const startDate = new Date(equipment.contract_start_date);
  const endDate = new Date(equipment.contract_end_date);

  // 契約期間の総月数
  const totalMonths =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    (endDate.getMonth() - startDate.getMonth());

  // 残り月数
  const monthsRemaining = Math.max(
    (endDate.getFullYear() - today.getFullYear()) * 12 +
    (endDate.getMonth() - today.getMonth()),
    0
  );

  // 総コスト = 月額 × 総月数
  const totalLeaseCost = equipment.monthly_cost * totalMonths;

  return { monthsRemaining, totalLeaseCost };
}

// ==========================================
// 点検・修理コスト集計
// ==========================================

/**
 * 点検・修理コストの集計
 */
export function calculateMaintenanceCost(
  maintenanceRecords: HeavyEquipmentMaintenance[],
  periodStart?: string,
  periodEnd?: string
): {
  total: number;
  thisYear: number;
  thisMonth: number;
  periodCost: number;
} {
  const today = new Date();
  const thisYear = today.getFullYear();
  const thisMonth = today.getMonth();

  let total = 0;
  let thisYearCost = 0;
  let thisMonthCost = 0;
  let periodCost = 0;

  // 期間フィルタ用の日付オブジェクト
  const startDate = periodStart ? new Date(periodStart) : null;
  const endDate = periodEnd ? new Date(periodEnd) : null;

  for (const record of maintenanceRecords) {
    const cost = record.cost || 0;
    total += cost;

    const recordDate = new Date(record.maintenance_date);

    // 今年のコスト
    if (recordDate.getFullYear() === thisYear) {
      thisYearCost += cost;

      // 今月のコスト
      if (recordDate.getMonth() === thisMonth) {
        thisMonthCost += cost;
      }
    }

    // 期間内のコスト
    if (startDate && endDate) {
      if (recordDate >= startDate && recordDate <= endDate) {
        periodCost += cost;
      }
    }
  }

  return {
    total,
    thisYear: thisYearCost,
    thisMonth: thisMonthCost,
    periodCost,
  };
}

// ==========================================
// 個別重機のコストサマリー生成
// ==========================================

/**
 * 1台の重機のコストサマリーを生成
 */
export function generateEquipmentCostSummary(
  equipment: HeavyEquipment,
  maintenanceRecords: HeavyEquipmentMaintenance[],
  categoryCode?: string,
  periodStart?: string,
  periodEnd?: string
): EquipmentCostSummary {
  const depreciation = calculateDepreciation(equipment, categoryCode);
  const leaseCost = calculateLeaseCost(equipment);
  const maintenanceCost = calculateMaintenanceCost(maintenanceRecords, periodStart, periodEnd);

  // 期間内の月数を計算（リース・レンタルコスト用）
  let periodMonths = 12; // デフォルトは年間
  if (periodStart && periodEnd) {
    const start = new Date(periodStart);
    const end = new Date(periodEnd);
    periodMonths = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));
  }

  // 期間内のリース・レンタルコスト
  let periodLeaseCost = 0;
  if (equipment.ownership_type === 'leased' || equipment.ownership_type === 'rented') {
    periodLeaseCost = (equipment.monthly_cost || 0) * periodMonths;
  }

  // 今年の総コスト計算
  let totalCostThisYear = maintenanceCost.thisYear;
  if (equipment.ownership_type === 'leased' || equipment.ownership_type === 'rented') {
    totalCostThisYear += (equipment.monthly_cost || 0) * 12;
  }

  // 今月の総コスト計算
  let totalCostThisMonth = maintenanceCost.thisMonth;
  if (equipment.ownership_type === 'leased' || equipment.ownership_type === 'rented') {
    totalCostThisMonth += equipment.monthly_cost || 0;
  }

  // 期間内の総コスト（期間指定がある場合）
  const totalCostForPeriod = periodStart && periodEnd
    ? periodLeaseCost + maintenanceCost.periodCost
    : totalCostThisYear;

  return {
    equipment_id: equipment.id,
    equipment_code: equipment.equipment_code,
    equipment_name: equipment.name,
    ownership_type: equipment.ownership_type,

    // リース・レンタル
    monthly_cost: equipment.monthly_cost,
    total_lease_cost: leaseCost.totalLeaseCost,
    months_remaining: leaseCost.monthsRemaining,

    // 購入資産
    purchase_price: equipment.purchase_price,
    purchase_date: equipment.purchase_date,
    book_value: depreciation?.book_value || null,
    depreciation: depreciation?.accumulated_depreciation || null,
    depreciation_rate: depreciation ? (1 / depreciation.useful_life_years) : 0,

    // 点検・修理コスト
    maintenance_cost_total: maintenanceCost.total,
    maintenance_cost_this_year: maintenanceCost.periodCost || maintenanceCost.thisYear,
    maintenance_cost_this_month: maintenanceCost.thisMonth,

    // 総コスト（期間指定がある場合は期間内のコスト、なければ今年のコスト）
    total_cost_this_year: totalCostForPeriod,
    total_cost_this_month: totalCostThisMonth,
  };
}

// ==========================================
// 組織全体のコストレポート生成
// ==========================================

/**
 * 組織全体のコストレポートを生成
 */
export function generateCostReport(
  equipmentList: HeavyEquipment[],
  maintenanceRecordsMap: Record<string, HeavyEquipmentMaintenance[]>,
  periodStart: string,
  periodEnd: string
): CostReport {
  const equipmentDetails: EquipmentCostSummary[] = [];

  let ownedCount = 0;
  let ownedValue = 0;
  let ownedMaintenanceCost = 0;

  let leasedCount = 0;
  let leasedMonthlyCost = 0;

  let rentedCount = 0;
  let rentedMonthlyCost = 0;

  for (const equipment of equipmentList) {
    const maintenanceRecords = maintenanceRecordsMap[equipment.id] || [];
    const summary = generateEquipmentCostSummary(equipment, maintenanceRecords, undefined, periodStart, periodEnd);
    equipmentDetails.push(summary);

    // 所有形態別集計
    if (equipment.ownership_type === 'owned') {
      ownedCount++;
      ownedValue += summary.book_value || equipment.purchase_price || 0;
      ownedMaintenanceCost += summary.maintenance_cost_this_year;
    } else if (equipment.ownership_type === 'leased') {
      leasedCount++;
      leasedMonthlyCost += equipment.monthly_cost || 0;
    } else if (equipment.ownership_type === 'rented') {
      rentedCount++;
      rentedMonthlyCost += equipment.monthly_cost || 0;
    }
  }

  // 期間の月数を計算
  const start = new Date(periodStart);
  const end = new Date(periodEnd);
  const periodMonths = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30));

  const totalMonthlyCost = leasedMonthlyCost + rentedMonthlyCost;
  const totalPeriodCost = totalMonthlyCost * periodMonths;
  const totalMaintenanceCost = equipmentDetails.reduce(
    (sum, e) => sum + e.maintenance_cost_this_year,
    0
  );
  const grandTotalCost = totalPeriodCost + totalMaintenanceCost;

  return {
    period_start: periodStart,
    period_end: periodEnd,

    owned_equipment_count: ownedCount,
    owned_equipment_value: ownedValue,
    owned_maintenance_cost: ownedMaintenanceCost,

    leased_equipment_count: leasedCount,
    leased_monthly_cost: leasedMonthlyCost,
    leased_annual_cost: leasedMonthlyCost * periodMonths,

    rented_equipment_count: rentedCount,
    rented_monthly_cost: rentedMonthlyCost,
    rented_annual_cost: rentedMonthlyCost * periodMonths,

    total_equipment_count: equipmentList.length,
    total_monthly_cost: totalMonthlyCost,
    total_annual_cost: totalPeriodCost,
    total_maintenance_cost: totalMaintenanceCost,
    grand_total_cost: grandTotalCost,

    equipment_details: equipmentDetails,
  };
}

// ==========================================
// フォーマット用ユーティリティ
// ==========================================

/**
 * 金額を日本円形式でフォーマット
 */
export function formatCurrency(amount: number | null): string {
  if (amount === null) return '—';
  return `¥${amount.toLocaleString('ja-JP')}`;
}

/**
 * パーセンテージをフォーマット
 */
export function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * 所有形態のラベル取得
 */
export function getOwnershipTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    owned: '自社所有',
    leased: 'リース',
    rented: 'レンタル',
  };
  return labels[type] || type;
}
