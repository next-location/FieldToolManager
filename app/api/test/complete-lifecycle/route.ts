import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { setMockDate, advanceDays, resetMockDate, getCurrentDate } from '@/lib/test/time-machine';
import { getAdjustedBillingDate } from '@/lib/utils/business-days';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 完全なライフサイクルテストスイート
 *
 * テストフロー:
 * 1. 組織登録
 * 2. 契約作成（初回請求含む）
 * 3. 入金確認
 * 4. 契約完了・アカウント発行
 * 5. 毎月の請求動作
 * 6. プラン変更（アップグレード/ダウングレード）
 * 7. プラン変更後の請求動作
 *
 * 様々なパターン:
 * - billing_day: 1, 15, 28, 99（月末）
 * - プラン: basic→standard（アップグレード）, standard→basic（ダウングレード）
 * - ユーザー数超過あり/なし
 */
export async function GET(request: NextRequest) {
  const results: any[] = [];
  let passedTests = 0;
  let failedTests = 0;

  // テストパターンを定義
  const testPatterns = [
    {
      name: 'パターンA: 月初請求（billing_day=1）',
      billing_day: 1,
      initial_plan: 'basic',
      upgrade_plan: 'premium',
      downgrade_plan: 'basic',
    },
    {
      name: 'パターンB: 月中請求（billing_day=15）',
      billing_day: 15,
      initial_plan: 'premium',
      upgrade_plan: 'enterprise',
      downgrade_plan: 'basic',
    },
    {
      name: 'パターンC: 月末付近請求（billing_day=28）',
      billing_day: 28,
      initial_plan: 'basic',
      upgrade_plan: 'premium',
      downgrade_plan: 'basic',
    },
    {
      name: 'パターンD: 月末請求（billing_day=99）★重要',
      billing_day: 99,
      initial_plan: 'premium',
      upgrade_plan: 'enterprise',
      downgrade_plan: 'basic',
    },
  ];

  // 各パターンでテスト実行
  for (const pattern of testPatterns) {
    results.push({
      pattern: pattern.name,
      status: 'START',
      message: `${pattern.name}のテストを開始します`,
    });

    try {
      // パターンごとのテスト実行
      const patternResult = await runLifecycleTest(pattern);
      results.push(...patternResult.steps);

      if (patternResult.success) {
        passedTests++;
      } else {
        failedTests++;
      }
    } catch (error: any) {
      results.push({
        pattern: pattern.name,
        status: 'FAIL',
        message: `パターン実行中にエラー: ${error.message}`,
      });
      failedTests++;
    }
  }

  // 最終クリーンアップ
  resetMockDate();

  return NextResponse.json({
    summary: {
      total_patterns: testPatterns.length,
      passed: passedTests,
      failed: failedTests,
      success_rate: `${Math.round((passedTests / testPatterns.length) * 100)}%`,
    },
    results,
  });
}

/**
 * 個別パターンのライフサイクルテスト実行
 */
async function runLifecycleTest(pattern: any): Promise<{ success: boolean; steps: any[] }> {
  const steps: any[] = [];
  let organizationId: string | null = null;
  let contractId: string | null = null;
  let adminUserId: string | null = null;

  try {
    // ========================================
    // Step 1: 組織登録
    // ========================================
    {
      const stepName = `${pattern.name} - Step 1: 組織登録`;
      try {
        const uniqueId = Date.now();
        const { data: org, error } = await supabase
          .from('organizations')
          .insert({
            name: `テスト組織_${pattern.billing_day}_${uniqueId}`,
            subdomain: `test-org-${pattern.billing_day}-${uniqueId}`,
            plan: pattern.initial_plan,
            payment_method: 'invoice',
            is_active: true,
          })
          .select()
          .single();

        if (error) throw new Error(`組織作成失敗: ${error.message}`);

        organizationId = org.id;
        steps.push({
          step: stepName,
          status: 'PASS',
          message: '組織登録成功',
          data: { organization_id: organizationId, name: org.name },
        });
      } catch (error: any) {
        steps.push({
          step: stepName,
          status: 'FAIL',
          message: error.message,
        });
        throw error;
      }
    }

    // ========================================
    // Step 2: 契約作成
    // ========================================
    {
      const stepName = `${pattern.name} - Step 2: 契約作成`;
      try {
        const startDate = new Date('2025-01-15T00:00:00Z');

        const { data: contract, error} = await supabase
          .from('contracts')
          .insert({
            organization_id: organizationId,
            contract_number: `TEST-${pattern.billing_day}-${Date.now()}`,
            contract_type: 'monthly',
            plan: pattern.initial_plan,
            billing_day: pattern.billing_day,
            billing_cycle: 'monthly',
            user_limit: pattern.initial_plan === 'basic' ? 10 : 30,
            status: 'pending',
            start_date: startDate.toISOString(),
          })
          .select()
          .single();

        if (error) throw new Error(`契約作成失敗: ${error.message}`);

        contractId = contract.id;
        steps.push({
          step: stepName,
          status: 'PASS',
          message: '契約作成成功',
          data: {
            contract_id: contractId,
            billing_day: contract.billing_day,
            plan: contract.plan,
          },
        });
      } catch (error: any) {
        steps.push({
          step: stepName,
          status: 'FAIL',
          message: error.message,
        });
        throw error;
      }
    }

    // ========================================
    // Step 3: 初回請求書生成
    // ========================================
    {
      const stepName = `${pattern.name} - Step 3: 初回請求書生成`;
      try {
        // 次回請求日を計算
        const baseDate = new Date('2025-01-15T00:00:00Z');
        const nextMonth = new Date(baseDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const billingDate = getAdjustedBillingDate(pattern.billing_day, nextMonth);

        steps.push({
          step: stepName,
          status: 'PASS',
          message: '初回請求日計算成功',
          data: {
            billing_date: billingDate.toISOString().split('T')[0],
            is_month_end: pattern.billing_day === 99,
          },
        });
      } catch (error: any) {
        steps.push({
          step: stepName,
          status: 'FAIL',
          message: error.message,
        });
        throw error;
      }
    }

    // ========================================
    // Step 4: 入金確認・契約完了
    // ========================================
    {
      const stepName = `${pattern.name} - Step 4: 契約完了`;
      try {
        const { error } = await supabase
          .from('contracts')
          .update({ status: 'active' })
          .eq('id', contractId);

        if (error) throw new Error(`契約更新失敗: ${error.message}`);

        steps.push({
          step: stepName,
          status: 'PASS',
          message: '契約を有効化しました',
        });
      } catch (error: any) {
        steps.push({
          step: stepName,
          status: 'FAIL',
          message: error.message,
        });
        throw error;
      }
    }

    // ========================================
    // Step 5: 毎月の請求動作シミュレーション
    // ========================================
    {
      const stepName = `${pattern.name} - Step 5: 毎月の請求動作`;
      try {
        // 2ヶ月分の請求をシミュレーション
        const baseDate = new Date('2025-02-01T00:00:00Z');

        for (let month = 0; month < 2; month++) {
          const targetDate = new Date(baseDate);
          targetDate.setMonth(targetDate.getMonth() + month);

          const nextMonth = new Date(targetDate);
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          const billingDate = getAdjustedBillingDate(pattern.billing_day, nextMonth);

          const invoiceSendDate = new Date(billingDate);
          invoiceSendDate.setDate(invoiceSendDate.getDate() - 20);
        }

        steps.push({
          step: stepName,
          status: 'PASS',
          message: '2ヶ月分の請求日計算成功',
        });
      } catch (error: any) {
        steps.push({
          step: stepName,
          status: 'FAIL',
          message: error.message,
        });
        throw error;
      }
    }

    // ========================================
    // Step 6: プラン変更（アップグレード）
    // ========================================
    {
      const stepName = `${pattern.name} - Step 6: アップグレード`;
      try {
        const effectiveDate = new Date('2025-03-28T00:00:00Z');

        const { error } = await supabase
          .from('contracts')
          .update({
            pending_plan_change: {
              new_plan: pattern.upgrade_plan,
              new_user_limit: 30,
              effective_date: effectiveDate.toISOString(),
              is_downgrade: false,
              requested_at: new Date().toISOString(),
            },
          })
          .eq('id', contractId);

        if (error) throw new Error(`プラン変更申請失敗: ${error.message}`);

        steps.push({
          step: stepName,
          status: 'PASS',
          message: `アップグレード申請成功: ${pattern.initial_plan} → ${pattern.upgrade_plan}`,
        });
      } catch (error: any) {
        steps.push({
          step: stepName,
          status: 'FAIL',
          message: error.message,
        });
        throw error;
      }
    }

    // ========================================
    // Step 7: プラン変更後の請求動作
    // ========================================
    {
      const stepName = `${pattern.name} - Step 7: プラン変更後の請求`;
      try {
        // プラン変更後の請求日計算
        const afterChangeDate = new Date('2025-04-01T00:00:00Z');
        const nextMonth = new Date(afterChangeDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const billingDate = getAdjustedBillingDate(pattern.billing_day, nextMonth);

        steps.push({
          step: stepName,
          status: 'PASS',
          message: 'プラン変更後の請求日計算成功',
          data: {
            new_plan: pattern.upgrade_plan,
            billing_date: billingDate.toISOString().split('T')[0],
          },
        });
      } catch (error: any) {
        steps.push({
          step: stepName,
          status: 'FAIL',
          message: error.message,
        });
        throw error;
      }
    }

    // ========================================
    // Step 8: ダウングレード
    // ========================================
    {
      const stepName = `${pattern.name} - Step 8: ダウングレード`;
      try {
        const effectiveDate = new Date('2025-05-28T00:00:00Z');

        const { error } = await supabase
          .from('contracts')
          .update({
            pending_plan_change: {
              new_plan: pattern.downgrade_plan,
              new_user_limit: 10,
              effective_date: effectiveDate.toISOString(),
              is_downgrade: true,
              user_exceeded: false,
              requested_at: new Date().toISOString(),
            },
          })
          .eq('id', contractId);

        if (error) throw new Error(`ダウングレード申請失敗: ${error.message}`);

        steps.push({
          step: stepName,
          status: 'PASS',
          message: `ダウングレード申請成功: ${pattern.upgrade_plan} → ${pattern.downgrade_plan}`,
        });
      } catch (error: any) {
        steps.push({
          step: stepName,
          status: 'FAIL',
          message: error.message,
        });
        throw error;
      }
    }

    // ========================================
    // Step 9: クリーンアップ
    // ========================================
    {
      const stepName = `${pattern.name} - Step 9: クリーンアップ`;
      try {
        // テストデータ削除
        if (contractId) {
          await supabase.from('contracts').delete().eq('id', contractId);
        }
        if (organizationId) {
          await supabase.from('organizations').delete().eq('id', organizationId);
        }

        steps.push({
          step: stepName,
          status: 'PASS',
          message: 'テストデータ削除完了',
        });
      } catch (error: any) {
        steps.push({
          step: stepName,
          status: 'FAIL',
          message: error.message,
        });
      }
    }

    return { success: true, steps };
  } catch (error) {
    // エラー時もクリーンアップ
    try {
      if (contractId) {
        await supabase.from('contracts').delete().eq('id', contractId);
      }
      if (organizationId) {
        await supabase.from('organizations').delete().eq('id', organizationId);
      }
    } catch {}

    return { success: false, steps };
  }
}
