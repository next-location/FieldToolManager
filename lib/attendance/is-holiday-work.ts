import { isHoliday } from './holiday-checker'
import { createClient } from '@/lib/supabase/server'

interface WorkingDays {
  mon: boolean
  tue: boolean
  wed: boolean
  thu: boolean
  fri: boolean
  sat: boolean
  sun: boolean
}

interface AttendanceSettings {
  working_days: WorkingDays
  exclude_holidays: boolean
}

/**
 * 営業日設定と祝日を考慮して休日かどうかを判定
 *
 * @param date - 判定したい日付（Date型またはYYYY-MM-DD形式の文字列）
 * @param organizationId - 組織ID（設定取得用）
 * @returns { is_holiday: boolean, reason: string | null }
 *
 * @example
 * const result = await checkIsHolidayWork(new Date(), 'org-id')
 * if (result.is_holiday) {
 *   console.log(`今日は${result.reason}です`)
 * }
 */
export async function checkIsHolidayWork(
  date: Date | string,
  organizationId: string
): Promise<{ is_holiday: boolean; reason: string | null }> {
  // Supabaseクライアント作成
  const supabase = await createClient()

  // 勤怠設定を取得
  const { data: settings } = await supabase
    .from('organization_attendance_settings')
    .select('working_days, exclude_holidays')
    .eq('organization_id', organizationId)
    .single()

  if (!settings) {
    // 設定がない場合はデフォルト（月〜金が営業日、祝日除外ON）
    return await checkWithDefaultSettings(date)
  }

  // 日付をDateオブジェクトに変換
  const targetDate = typeof date === 'string' ? new Date(date + 'T00:00:00') : date

  // 1. 曜日チェック
  const dayOfWeek = targetDate.getDay() // 0=日, 1=月, ..., 6=土
  const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
  const dayKey = dayKeys[dayOfWeek]

  const workingDays: WorkingDays = settings.working_days || {
    mon: true,
    tue: true,
    wed: true,
    thu: true,
    fri: true,
    sat: false,
    sun: false,
  }

  if (!workingDays[dayKey]) {
    const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日']
    return {
      is_holiday: true,
      reason: `休日（${dayNames[dayOfWeek]}）`,
    }
  }

  // 2. 祝日チェック（exclude_holidaysがtrueの場合）
  if (settings.exclude_holidays) {
    const holidayName = await isHoliday(targetDate)
    if (holidayName) {
      return {
        is_holiday: true,
        reason: `祝日（${holidayName}）`,
      }
    }
  }

  return {
    is_holiday: false,
    reason: null,
  }
}

/**
 * デフォルト設定での判定（設定が存在しない場合）
 */
async function checkWithDefaultSettings(date: Date | string) {
  const targetDate = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  const dayOfWeek = targetDate.getDay()

  // デフォルト: 月〜金が営業日
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    const dayNames = ['日曜日', '土曜日']
    return {
      is_holiday: true,
      reason: `休日（${dayNames[dayOfWeek === 0 ? 0 : 1]}）`,
    }
  }

  // 祝日チェック
  const holidayName = await isHoliday(targetDate)
  if (holidayName) {
    return {
      is_holiday: true,
      reason: `祝日（${holidayName}）`,
    }
  }

  return {
    is_holiday: false,
    reason: null,
  }
}
