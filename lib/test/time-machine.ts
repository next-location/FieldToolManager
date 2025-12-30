/**
 * テスト用タイムマシン機能
 * テスト環境でのみ有効な日付モック機能
 */

let mockDate: Date | null = null;

/**
 * モック日付を設定
 */
export function setMockDate(date: Date | string): void {
  if (typeof date === 'string') {
    mockDate = new Date(date);
  } else {
    mockDate = date;
  }
}

/**
 * モック日付を指定日数進める
 */
export function advanceDays(days: number): void {
  if (!mockDate) {
    mockDate = new Date();
  }
  mockDate.setDate(mockDate.getDate() + days);
}

/**
 * モック日付をリセット（実際の現在時刻に戻す）
 */
export function resetMockDate(): void {
  mockDate = null;
}

/**
 * 現在の日付を取得（モック日付が設定されていればそれを返す）
 */
export function getCurrentDate(): Date {
  return mockDate ? new Date(mockDate) : new Date();
}

/**
 * モック日付が設定されているか確認
 */
export function isMockDateSet(): boolean {
  return mockDate !== null;
}

/**
 * 現在のモック日付を取得（文字列形式）
 */
export function getMockDateString(): string | null {
  return mockDate ? mockDate.toISOString() : null;
}
