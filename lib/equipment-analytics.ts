// 重機稼働率・分析ユーティリティ
// 作成日: 2025-12-04

import type {
  HeavyEquipment,
  HeavyEquipmentUsageRecord,
  OperationAnalysis,
  AnalyticsReport,
  EquipmentCostSummary,
} from '@/types/heavy-equipment';
import { generateEquipmentCostSummary } from './equipment-cost';

// ==========================================
// 稼働率計算
// ==========================================

/**
 * 重機の稼働日数を計算
 */
function calculateOperationDays(
  usageRecords: HeavyEquipmentUsageRecord[],
  periodStart: Date,
  periodEnd: Date
): number {
  // チェックアウトの日付を抽出
  const operationDates = new Set<string>();

  for (const record of usageRecords) {
    if (record.action_type !== 'checkout') continue;

    const actionDate = new Date(record.action_at);
    if (actionDate >= periodStart && actionDate <= periodEnd) {
      // YYYY-MM-DD形式の日付文字列
      const dateStr = actionDate.toISOString().split('T')[0];
      operationDates.add(dateStr);
    }
  }

  return operationDates.size;
}

/**
 * 稼働時間の集計（メーター管理が有効な場合）
 */
function calculateTotalHourMeter(
  usageRecords: HeavyEquipmentUsageRecord[],
  periodStart: Date,
  periodEnd: Date
): number | null {
  const records = usageRecords.filter((r) => {
    const actionDate = new Date(r.action_at);
    return (
      actionDate >= periodStart &&
      actionDate <= periodEnd &&
      r.hour_meter_reading !== null
    );
  });

  if (records.length === 0) return null;

  // メーター値の最大値と最小値の差分
  const meterReadings = records
    .map((r) => r.hour_meter_reading!)
    .filter((v) => v !== null);

  if (meterReadings.length < 2) return null;

  const maxMeter = Math.max(...meterReadings);
  const minMeter = Math.min(...meterReadings);

  return maxMeter - minMeter;
}

/**
 * コスト効率スコアの計算（0-100）
 */
function calculateCostEfficiencyScore(
  operationRate: number,
  ownershipType: string,
  costPerDay: number | null
): number {
  // 基本スコア: 稼働率（0-100）
  let score = operationRate;

  // 自社所有の場合、稼働率が高いほどスコアが高い
  if (ownershipType === 'owned') {
    score = operationRate;
  }
  // リース・レンタルの場合、稼働率とコスト効率を考慮
  else if (ownershipType === 'leased' || ownershipType === 'rented') {
    // 稼働率が低いとコスト効率が悪い
    if (operationRate < 50) {
      score = operationRate * 0.7; // ペナルティ
    } else {
      score = operationRate;
    }

    // 1日あたりコストが高い場合のペナルティ
    if (costPerDay && costPerDay > 5000) {
      score = Math.max(0, score - 10);
    }
  }

  return Math.min(100, Math.max(0, score));
}

// ==========================================
// 個別重機の稼働率分析
// ==========================================

/**
 * 1台の重機の稼働率分析を生成
 */
export function generateOperationAnalysis(
  equipment: HeavyEquipment,
  usageRecords: HeavyEquipmentUsageRecord[],
  costSummary: EquipmentCostSummary,
  periodStart: string,
  periodEnd: string
): OperationAnalysis {
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  // 総日数
  const totalDays = Math.floor(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  // 稼働日数
  const operationDays = calculateOperationDays(usageRecords, startDate, endDate);

  // 稼働率（%）
  const operationRate = totalDays > 0 ? (operationDays / totalDays) * 100 : 0;

  // 使用回数
  const checkoutCount = usageRecords.filter(
    (r) =>
      r.action_type === 'checkout' &&
      new Date(r.action_at) >= startDate &&
      new Date(r.action_at) <= endDate
  ).length;

  const totalUsageCount = usageRecords.filter((r) => {
    const actionDate = new Date(r.action_at);
    return actionDate >= startDate && actionDate <= endDate;
  }).length;

  // メーター情報
  const totalHourMeter = equipment.enable_hour_meter
    ? calculateTotalHourMeter(usageRecords, startDate, endDate)
    : null;

  const averageDailyHours =
    totalHourMeter && operationDays > 0
      ? totalHourMeter / operationDays
      : null;

  // コスト効率
  const monthlyCost = costSummary.monthly_cost;
  const costPerOperationDay =
    operationDays > 0 && monthlyCost
      ? (monthlyCost * (totalDays / 30)) / operationDays
      : null;

  const costEfficiencyScore = calculateCostEfficiencyScore(
    operationRate,
    equipment.ownership_type,
    costPerOperationDay
  );

  return {
    equipment_id: equipment.id,
    equipment_code: equipment.equipment_code,
    equipment_name: equipment.name,
    ownership_type: equipment.ownership_type,

    total_days: totalDays,
    operation_days: operationDays,
    operation_rate: Math.round(operationRate * 10) / 10,

    checkout_count: checkoutCount,
    total_usage_count: totalUsageCount,

    total_hour_meter: totalHourMeter,
    average_daily_hours: averageDailyHours
      ? Math.round(averageDailyHours * 10) / 10
      : null,

    monthly_cost: monthlyCost,
    cost_per_operation_day: costPerOperationDay
      ? Math.round(costPerOperationDay)
      : null,
    cost_efficiency_score: Math.round(costEfficiencyScore),
  };
}

// ==========================================
// 組織全体の分析レポート生成
// ==========================================

/**
 * 組織全体の分析レポートを生成
 */
export function generateAnalyticsReport(
  equipmentList: HeavyEquipment[],
  usageRecordsMap: Record<string, HeavyEquipmentUsageRecord[]>,
  costSummariesMap: Record<string, EquipmentCostSummary>,
  periodStart: string,
  periodEnd: string
): AnalyticsReport {
  const startDate = new Date(periodStart);
  const endDate = new Date(periodEnd);

  const totalDays =
    Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const equipmentAnalytics: OperationAnalysis[] = [];
  let totalOperationRate = 0;
  let highPerformersCount = 0;
  let lowPerformersCount = 0;

  let ownedCount = 0;
  let ownedTotalRate = 0;
  let leasedCount = 0;
  let leasedTotalRate = 0;
  let rentedCount = 0;
  let rentedTotalRate = 0;

  for (const equipment of equipmentList) {
    const usageRecords = usageRecordsMap[equipment.id] || [];
    const costSummary = costSummariesMap[equipment.id];

    if (!costSummary) continue;

    const analysis = generateOperationAnalysis(
      equipment,
      usageRecords,
      costSummary,
      periodStart,
      periodEnd
    );

    equipmentAnalytics.push(analysis);
    totalOperationRate += analysis.operation_rate;

    // ハイパフォーマー・ローパフォーマー判定
    if (analysis.operation_rate >= 80) {
      highPerformersCount++;
    } else if (analysis.operation_rate <= 30) {
      lowPerformersCount++;
    }

    // 所有形態別集計
    if (equipment.ownership_type === 'owned') {
      ownedCount++;
      ownedTotalRate += analysis.operation_rate;
    } else if (equipment.ownership_type === 'leased') {
      leasedCount++;
      leasedTotalRate += analysis.operation_rate;
    } else if (equipment.ownership_type === 'rented') {
      rentedCount++;
      rentedTotalRate += analysis.operation_rate;
    }
  }

  const averageOperationRate =
    equipmentList.length > 0 ? totalOperationRate / equipmentList.length : 0;

  return {
    period_start: periodStart,
    period_end: periodEnd,
    total_days: totalDays,

    total_equipment_count: equipmentList.length,
    average_operation_rate: Math.round(averageOperationRate * 10) / 10,
    high_performers_count: highPerformersCount,
    low_performers_count: lowPerformersCount,

    owned_avg_operation_rate:
      ownedCount > 0 ? Math.round((ownedTotalRate / ownedCount) * 10) / 10 : 0,
    leased_avg_operation_rate:
      leasedCount > 0 ? Math.round((leasedTotalRate / leasedCount) * 10) / 10 : 0,
    rented_avg_operation_rate:
      rentedCount > 0 ? Math.round((rentedTotalRate / rentedCount) * 10) / 10 : 0,

    equipment_analytics: equipmentAnalytics,
  };
}

// ==========================================
// ユーティリティ関数
// ==========================================

/**
 * 稼働率のパフォーマンスレベルを取得
 */
export function getPerformanceLevel(
  operationRate: number
): 'high' | 'medium' | 'low' {
  if (operationRate >= 80) return 'high';
  if (operationRate >= 50) return 'medium';
  return 'low';
}

/**
 * 稼働率に応じた色を取得
 */
export function getOperationRateColor(operationRate: number): string {
  if (operationRate >= 80) return 'text-green-600';
  if (operationRate >= 50) return 'text-yellow-600';
  return 'text-red-600';
}

/**
 * 稼働率に応じた背景色を取得
 */
export function getOperationRateBgColor(operationRate: number): string {
  if (operationRate >= 80) return 'bg-green-50 border-green-200';
  if (operationRate >= 50) return 'bg-yellow-50 border-yellow-200';
  return 'bg-red-50 border-red-200';
}
