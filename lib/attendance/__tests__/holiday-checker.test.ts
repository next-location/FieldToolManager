/**
 * 祝日判定ユーティリティのテスト
 */

import { isHoliday, isWorkingDay, clearHolidayCache } from '../holiday-checker'

describe('holiday-checker', () => {
  beforeEach(() => {
    // 各テストの前にキャッシュをクリア
    clearHolidayCache()
  })

  describe('isHoliday', () => {
    it('元日（2026-01-01）を祝日として判定する', async () => {
      const result = await isHoliday('2026-01-01')
      expect(result).toBe('元日')
    })

    it('建国記念の日（2026-02-11）を祝日として判定する', async () => {
      const result = await isHoliday('2026-02-11')
      expect(result).toBe('建国記念の日')
    })

    it('平日（2026-01-20）を祝日でないと判定する', async () => {
      const result = await isHoliday('2026-01-20')
      expect(result).toBeNull()
    })

    it('Date型の引数を受け取れる', async () => {
      const result = await isHoliday(new Date('2026-01-01'))
      expect(result).toBe('元日')
    })
  })

  describe('isWorkingDay', () => {
    const mondayToFriday = {
      mon: true,
      tue: true,
      wed: true,
      thu: true,
      fri: true,
      sat: false,
      sun: false
    }

    it('平日の月曜日を営業日として判定する', async () => {
      // 2026-01-26は月曜日
      const result = await isWorkingDay('2026-01-26', mondayToFriday, true)
      expect(result).toBe(true)
    })

    it('土曜日を休日として判定する', async () => {
      // 2026-01-24は土曜日
      const result = await isWorkingDay('2026-01-24', mondayToFriday, true)
      expect(result).toBe(false)
    })

    it('日曜日を休日として判定する', async () => {
      // 2026-01-25は日曜日
      const result = await isWorkingDay('2026-01-25', mondayToFriday, true)
      expect(result).toBe(false)
    })

    it('祝日（元日）を休日として判定する', async () => {
      // 2026-01-01は木曜日だが祝日
      const result = await isWorkingDay('2026-01-01', mondayToFriday, true)
      expect(result).toBe(false)
    })

    it('excludeHolidays=falseの場合、祝日でも曜日設定に従う', async () => {
      // 2026-01-01は木曜日で祝日
      const result = await isWorkingDay('2026-01-01', mondayToFriday, false)
      expect(result).toBe(true) // 木曜日なのでtrue
    })

    it('土日出勤の設定で土曜日を営業日として判定する', async () => {
      const allWeek = {
        mon: true,
        tue: true,
        wed: true,
        thu: true,
        fri: true,
        sat: true,
        sun: true
      }
      // 2026-01-24は土曜日
      const result = await isWorkingDay('2026-01-24', allWeek, true)
      expect(result).toBe(true)
    })
  })
})
