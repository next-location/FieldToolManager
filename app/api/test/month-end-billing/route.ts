import { NextRequest, NextResponse } from 'next/server';
import { getAdjustedBillingDate } from '@/lib/utils/business-days';

/**
 * 月末請求（billing_day=99）専用テスト
 *
 * 実際のデータベース操作なしで、billing_day=99の計算ロジックのみを検証
 */
export async function GET(request: NextRequest) {
  const results: any[] = [];
  let passedTests = 0;
  let failedTests = 0;

  const testCases = [
    {
      name: 'ケース1: 2025年1月（月末=31日金曜日、平日）',
      targetDate: '2025-01-15',
      billing_day: 99,
      expected_billing_date: '2025-01-31',
      expected_day_of_week: '金曜日',
    },
    {
      name: 'ケース2: 2025年2月（月末=28日金曜日、平日）',
      targetDate: '2025-02-15',
      billing_day: 99,
      expected_billing_date: '2025-02-28',
      expected_day_of_week: '金曜日',
    },
    {
      name: 'ケース3: 2025年8月（月末=31日日曜日→29日金曜日に調整）',
      targetDate: '2025-08-15',
      billing_day: 99,
      expected_billing_date: '2025-08-29',
      expected_day_of_week: '金曜日',
      is_adjusted: true,
    },
    {
      name: 'ケース4: 2025年11月（月末=30日日曜日→28日金曜日に調整）',
      targetDate: '2025-11-15',
      billing_day: 99,
      expected_billing_date: '2025-11-28',
      expected_day_of_week: '金曜日',
      is_adjusted: true,
    },
  ];

  const dayNames = ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'];

  for (const testCase of testCases) {
    try {
      const targetDate = new Date(testCase.targetDate + 'T00:00:00Z');
      const billingDate = getAdjustedBillingDate(testCase.billing_day, targetDate);
      const resultStr = billingDate.toISOString().split('T')[0];
      const dayOfWeek = dayNames[billingDate.getUTCDay()];

      const success = resultStr === testCase.expected_billing_date;

      results.push({
        case: testCase.name,
        status: success ? 'PASS' : 'FAIL',
        data: {
          billing_day: testCase.billing_day,
          target_date: testCase.targetDate,
          calculated_billing_date: resultStr,
          expected_billing_date: testCase.expected_billing_date,
          day_of_week: dayOfWeek,
          expected_day_of_week: testCase.expected_day_of_week,
          is_adjusted: testCase.is_adjusted || false,
        },
      });

      if (success) {
        passedTests++;
      } else {
        failedTests++;
      }
    } catch (error: any) {
      results.push({
        case: testCase.name,
        status: 'ERROR',
        message: error.message,
      });
      failedTests++;
    }
  }

  // 請求書送信日の計算テスト（billing_day=99）
  {
    try {
      const baseDate = new Date('2025-01-15T00:00:00Z');
      const nextMonth = new Date(baseDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const billingDate = getAdjustedBillingDate(99, nextMonth);
      const invoiceSendDate = new Date(billingDate);
      invoiceSendDate.setDate(invoiceSendDate.getDate() - 20);

      const billingDateStr = billingDate.toISOString().split('T')[0];
      const invoiceSendDateStr = invoiceSendDate.toISOString().split('T')[0];

      // 2月末(2/28) の20日前 = 2/8
      const success = billingDateStr === '2025-02-28' && invoiceSendDateStr === '2025-02-08';

      results.push({
        case: 'ケース5: 請求書送信日計算（billing_day=99、2月）',
        status: success ? 'PASS' : 'FAIL',
        data: {
          base_date: '2025-01-15',
          billing_date: billingDateStr,
          invoice_send_date: invoiceSendDateStr,
          expected_billing: '2025-02-28',
          expected_invoice_send: '2025-02-08',
        },
      });

      if (success) {
        passedTests++;
      } else {
        failedTests++;
      }
    } catch (error: any) {
      results.push({
        case: 'ケース5: 請求書送信日計算',
        status: 'ERROR',
        message: error.message,
      });
      failedTests++;
    }
  }

  return NextResponse.json({
    summary: {
      total: testCases.length + 1,
      passed: passedTests,
      failed: failedTests,
      success_rate: `${Math.round((passedTests / (testCases.length + 1)) * 100)}%`,
    },
    results,
  });
}
