/**
 * 営業日判定ユーティリティ
 *
 * 日本の祝日と土日を考慮した営業日計算
 */

/**
 * 日本の祝日リスト（2025年）
 * 本番運用時は外部APIまたは定期更新が必要
 */
const JAPANESE_HOLIDAYS_2025 = [
  '2025-01-01', // 元日
  '2025-01-13', // 成人の日
  '2025-02-11', // 建国記念の日
  '2025-02-23', // 天皇誕生日
  '2025-02-24', // 振替休日
  '2025-03-20', // 春分の日
  '2025-04-29', // 昭和の日
  '2025-05-03', // 憲法記念日
  '2025-05-04', // みどりの日
  '2025-05-05', // こどもの日
  '2025-05-06', // 振替休日
  '2025-07-21', // 海の日
  '2025-08-11', // 山の日
  '2025-09-15', // 敬老の日
  '2025-09-23', // 秋分の日
  '2025-10-13', // スポーツの日
  '2025-11-03', // 文化の日
  '2025-11-23', // 勤労感謝の日
  '2025-11-24', // 振替休日
];

const JAPANESE_HOLIDAYS_2026 = [
  '2026-01-01', // 元日
  '2026-01-12', // 成人の日
  '2026-02-11', // 建国記念の日
  '2026-02-23', // 天皇誕生日
  '2026-03-20', // 春分の日
  '2026-04-29', // 昭和の日
  '2026-05-03', // 憲法記念日
  '2026-05-04', // みどりの日
  '2026-05-05', // こどもの日
  '2026-05-06', // 振替休日
  '2026-07-20', // 海の日
  '2026-08-11', // 山の日
  '2026-09-21', // 敬老の日
  '2026-09-22', // 国民の休日
  '2026-09-23', // 秋分の日
  '2026-10-12', // スポーツの日
  '2026-11-03', // 文化の日
  '2026-11-23', // 勤労感謝の日
];

const ALL_HOLIDAYS = [...JAPANESE_HOLIDAYS_2025, ...JAPANESE_HOLIDAYS_2026];

/**
 * 指定日が土曜日または日曜日かを判定
 */
export function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 = 日曜日, 6 = 土曜日
}

/**
 * 指定日が日本の祝日かを判定
 */
export function isJapaneseHoliday(date: Date): boolean {
  const dateStr = date.toISOString().split('T')[0];
  return ALL_HOLIDAYS.includes(dateStr);
}

/**
 * 指定日が営業日かを判定
 */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isJapaneseHoliday(date);
}

/**
 * 指定日から最も近い前営業日を取得
 *
 * @param date 基準日
 * @param maxDaysBack 最大何日前まで遡るか（デフォルト: 7日）
 * @returns 前営業日（見つからない場合は元の日付）
 */
export function getPreviousBusinessDay(date: Date, maxDaysBack: number = 7): Date {
  let currentDate = new Date(date);
  let daysChecked = 0;

  while (daysChecked < maxDaysBack) {
    if (isBusinessDay(currentDate)) {
      return currentDate;
    }

    // 1日前に戻る
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() - 1);
    daysChecked++;
  }

  // 営業日が見つからない場合は元の日付を返す
  return date;
}

/**
 * 指定日から最も近い次営業日を取得
 *
 * @param date 基準日
 * @param maxDaysForward 最大何日後まで進むか（デフォルト: 7日）
 * @returns 次営業日（見つからない場合は元の日付）
 */
export function getNextBusinessDay(date: Date, maxDaysForward: number = 7): Date {
  let currentDate = new Date(date);
  let daysChecked = 0;

  while (daysChecked < maxDaysForward) {
    if (isBusinessDay(currentDate)) {
      return currentDate;
    }

    // 1日後に進む
    currentDate = new Date(currentDate);
    currentDate.setDate(currentDate.getDate() + 1);
    daysChecked++;
  }

  // 営業日が見つからない場合は元の日付を返す
  return date;
}

/**
 * 月末日を取得
 */
export function getEndOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * 請求日を営業日調整して取得
 *
 * @param billingDay 請求日（1-28 or 99=月末）
 * @param targetDate 対象月の任意の日付
 * @returns 営業日調整後の請求日
 */
export function getAdjustedBillingDate(billingDay: number, targetDate: Date = new Date()): Date {
  const year = targetDate.getFullYear();
  const month = targetDate.getMonth(); // 0-11

  let billingDate: Date;

  if (billingDay === 99) {
    // 月末
    const lastDay = getEndOfMonth(year, month + 1);
    billingDate = new Date(year, month, lastDay);
  } else {
    // 指定日（1-28）
    billingDate = new Date(year, month, billingDay);
  }

  // 営業日でない場合は前営業日に調整
  if (!isBusinessDay(billingDate)) {
    billingDate = getPreviousBusinessDay(billingDate);
  }

  return billingDate;
}
