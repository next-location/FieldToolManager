/**
 * 祝日判定ユーティリティ
 *
 * 内閣府の祝日CSVを使用して日本の祝日を判定します
 * API: https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv
 */

interface Holiday {
  date: string // YYYY-MM-DD
  name: string
}

// メモリキャッシュ（サーバー起動中のみ有効、1日1回更新）
let holidayCache: Holiday[] = []
let lastFetchDate: string | null = null

/**
 * 内閣府から祝日データを取得
 */
async function fetchHolidays(): Promise<Holiday[]> {
  try {
    const response = await fetch('https://www8.cao.go.jp/chosei/shukujitsu/syukujitsu.csv')

    if (!response.ok) {
      console.error('[祝日API] HTTPエラー:', response.status)
      return []
    }

    const csvText = await response.text()
    const lines = csvText.split('\n')

    // 1行目はヘッダーなのでスキップ
    const holidays: Holiday[] = []

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // CSV形式: "日付,名称"
      const parts = line.split(',')
      if (parts.length < 2) continue

      const dateStr = parts[0].trim()
      const name = parts[1].trim()

      // 日付フォーマット変換: YYYY/MM/DD → YYYY-MM-DD
      const formattedDate = dateStr.replace(/\//g, '-')

      holidays.push({
        date: formattedDate,
        name: name
      })
    }

    console.log(`[祝日API] ${holidays.length}件の祝日データを取得しました`)
    return holidays

  } catch (error) {
    console.error('[祝日API] 取得エラー:', error)
    return []
  }
}

/**
 * 祝日データを取得（キャッシュ付き）
 * 1日1回のみAPIを叩く
 */
async function getHolidays(): Promise<Holiday[]> {
  const today = new Date().toISOString().split('T')[0]

  // キャッシュが有効な場合はそれを返す
  if (holidayCache.length > 0 && lastFetchDate === today) {
    return holidayCache
  }

  // キャッシュが古いまたは空の場合は再取得
  console.log('[祝日API] キャッシュを更新します')
  holidayCache = await fetchHolidays()
  lastFetchDate = today

  return holidayCache
}

/**
 * 指定した日付が祝日かどうかを判定
 *
 * @param date - 判定したい日付（Date型またはYYYY-MM-DD形式の文字列）
 * @returns 祝日の場合は祝日名、祝日でない場合はnull
 *
 * @example
 * const result = await isHoliday(new Date('2026-01-01'))
 * if (result) {
 *   console.log(`${result}です`) // "元日です"
 * }
 */
export async function isHoliday(date: Date | string): Promise<string | null> {
  // 日付を YYYY-MM-DD 形式に変換
  const dateStr = typeof date === 'string'
    ? date
    : date.toISOString().split('T')[0]

  // 祝日データを取得
  const holidays = await getHolidays()

  // 該当する祝日を検索
  const holiday = holidays.find(h => h.date === dateStr)

  return holiday ? holiday.name : null
}

/**
 * 指定した日付が営業日かどうかを判定
 *
 * @param date - 判定したい日付
 * @param workingDays - 営業日設定（例: {"mon":true,"tue":true,...}）
 * @param excludeHolidays - 祝日を休日として扱うか
 * @returns 営業日の場合はtrue
 *
 * @example
 * const isWorkDay = await isWorkingDay(
 *   new Date('2026-01-26'),
 *   { mon: true, tue: true, wed: true, thu: true, fri: true, sat: false, sun: false },
 *   true
 * )
 */
export async function isWorkingDay(
  date: Date | string,
  workingDays: { mon: boolean; tue: boolean; wed: boolean; thu: boolean; fri: boolean; sat: boolean; sun: boolean },
  excludeHolidays: boolean
): Promise<boolean> {
  const dateObj = typeof date === 'string' ? new Date(date) : date

  // 曜日を取得（0=日曜日, 1=月曜日, ..., 6=土曜日）
  const dayOfWeek = dateObj.getDay()
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const dayKey = dayKeys[dayOfWeek]

  // 営業日設定で休日の場合
  if (!workingDays[dayKey]) {
    return false
  }

  // 祝日チェック
  if (excludeHolidays) {
    const holidayName = await isHoliday(dateObj)
    if (holidayName) {
      return false
    }
  }

  return true
}

/**
 * キャッシュをクリア（テスト用）
 */
export function clearHolidayCache(): void {
  holidayCache = []
  lastFetchDate = null
}
