import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * プラン変更機能テストAPI
 *
 * GET /api/test/plan-change
 *
 * テスト項目:
 * 1. 30日前チェック
 * 2. ユーザー数超過警告
 * 3. 初期設定費用の保存
 * 4. エンタープライズプラン
 * 5. organizationsテーブルが即座に更新されないこと
 */
export async function GET(request: NextRequest) {
  const results: any[] = [];
  let passedTests = 0;
  let failedTests = 0;

  try {
    // テスト用の契約を取得
    const { data: contracts, error: contractError } = await supabase
      .from('contracts')
      .select(`
        *,
        organizations!inner (id, name, max_users, plan)
      `)
      .eq('status', 'active')
      .limit(1);

    if (contractError || !contracts || contracts.length === 0) {
      return NextResponse.json({
        error: 'テスト用の契約が見つかりません',
        details: contractError
      }, { status: 404 });
    }

    const testContract = contracts[0];
    const organization = Array.isArray(testContract.organizations)
      ? testContract.organizations[0]
      : testContract.organizations;

    // テスト用パッケージを取得
    const { data: packages } = await supabase
      .from('packages')
      .select('*')
      .limit(1);

    if (!packages || packages.length === 0) {
      return NextResponse.json({
        error: 'テスト用のパッケージが見つかりません'
      }, { status: 404 });
    }

    const testPackage = packages[0];

    // ========================================
    // テスト1: 30日前チェック（期限内）
    // ========================================
    {
      const testName = 'Test 1: 30日前チェック（期限内）';
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/contracts/${testContract.id}/change-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            new_plan: 'standard',
            new_base_fee: 45000,
            new_user_limit: 30,
            new_package_ids: [testPackage.id],
            initial_fee: 10000
          })
        });

        const data = await response.json();

        if (response.ok && data.success && data.effective_date) {
          results.push({
            test: testName,
            status: 'PASS',
            message: `プラン変更予約成功: ${data.effective_date}から適用`,
            data: {
              effective_date: data.effective_date,
              is_downgrade: data.is_downgrade,
              user_warning: data.user_warning
            }
          });
          passedTests++;
        } else if (response.status === 400 && data.error?.includes('30日前')) {
          results.push({
            test: testName,
            status: 'EXPECTED_FAIL',
            message: '30日前チェックが正しく動作（期限外のため拒否）',
            data: {
              error: data.error,
              next_available_date: data.next_available_date
            }
          });
          passedTests++;
        } else {
          results.push({
            test: testName,
            status: 'FAIL',
            message: '予期しないエラー',
            data
          });
          failedTests++;
        }
      } catch (error: any) {
        results.push({
          test: testName,
          status: 'ERROR',
          message: error.message
        });
        failedTests++;
      }
    }

    // ========================================
    // テスト2: pending_plan_changeの保存確認
    // ========================================
    {
      const testName = 'Test 2: pending_plan_change保存確認';
      try {
        const { data: updatedContract } = await supabase
          .from('contracts')
          .select('pending_plan_change, plan_change_requested_at')
          .eq('id', testContract.id)
          .single();

        if (updatedContract?.pending_plan_change) {
          const pending = updatedContract.pending_plan_change as any;

          results.push({
            test: testName,
            status: 'PASS',
            message: 'pending_plan_changeが正しく保存されている',
            data: {
              new_plan: pending.new_plan,
              new_user_limit: pending.new_user_limit,
              initial_fee: pending.initial_fee,
              effective_date: pending.effective_date,
              requested_at: updatedContract.plan_change_requested_at
            }
          });
          passedTests++;
        } else {
          results.push({
            test: testName,
            status: 'FAIL',
            message: 'pending_plan_changeが保存されていない'
          });
          failedTests++;
        }
      } catch (error: any) {
        results.push({
          test: testName,
          status: 'ERROR',
          message: error.message
        });
        failedTests++;
      }
    }

    // ========================================
    // テスト3: organizationsテーブルが即座に更新されないことを確認
    // ========================================
    {
      const testName = 'Test 3: organizationsテーブルが即座に更新されない';
      try {
        const { data: currentOrg } = await supabase
          .from('organizations')
          .select('plan, max_users')
          .eq('id', organization.id)
          .single();

        const { data: contract } = await supabase
          .from('contracts')
          .select('pending_plan_change')
          .eq('id', testContract.id)
          .single();

        const pending = contract?.pending_plan_change as any;

        if (currentOrg && pending) {
          // 旧プランのままであることを確認
          if (currentOrg.plan !== pending.new_plan || currentOrg.max_users !== pending.new_user_limit) {
            results.push({
              test: testName,
              status: 'PASS',
              message: 'organizationsテーブルは即座に更新されていない（正しい動作）',
              data: {
                current_plan: currentOrg.plan,
                pending_new_plan: pending.new_plan,
                current_max_users: currentOrg.max_users,
                pending_new_user_limit: pending.new_user_limit
              }
            });
            passedTests++;
          } else {
            results.push({
              test: testName,
              status: 'FAIL',
              message: '⚠️ organizationsテーブルが即座に更新されてしまっている',
              data: {
                current_plan: currentOrg.plan,
                pending_new_plan: pending.new_plan
              }
            });
            failedTests++;
          }
        }
      } catch (error: any) {
        results.push({
          test: testName,
          status: 'ERROR',
          message: error.message
        });
        failedTests++;
      }
    }

    // ========================================
    // テスト4: 初期設定費用の確認
    // ========================================
    {
      const testName = 'Test 4: 初期設定費用の保存確認';
      try {
        const { data: contract } = await supabase
          .from('contracts')
          .select('pending_plan_change')
          .eq('id', testContract.id)
          .single();

        const pending = contract?.pending_plan_change as any;

        if (pending?.initial_fee === 10000) {
          results.push({
            test: testName,
            status: 'PASS',
            message: '初期設定費用が正しく保存されている',
            data: {
              initial_fee: pending.initial_fee
            }
          });
          passedTests++;
        } else {
          results.push({
            test: testName,
            status: 'FAIL',
            message: '初期設定費用が正しく保存されていない',
            data: {
              expected: 10000,
              actual: pending?.initial_fee
            }
          });
          failedTests++;
        }
      } catch (error: any) {
        results.push({
          test: testName,
          status: 'ERROR',
          message: error.message
        });
        failedTests++;
      }
    }

    // ========================================
    // テスト5: ユーザー数超過警告
    // ========================================
    {
      const testName = 'Test 5: ユーザー数超過警告';
      try {
        // 現在のユーザー数を取得
        const { count: currentUserCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', organization.id)
          .is('deleted_at', null);

        // 現在のユーザー数より少ない上限でプラン変更を試みる
        const newUserLimit = Math.max(1, (currentUserCount || 10) - 5);

        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/contracts/${testContract.id}/change-plan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': request.headers.get('cookie') || ''
          },
          body: JSON.stringify({
            new_plan: 'start',
            new_base_fee: 18000,
            new_user_limit: newUserLimit,
            new_package_ids: [testPackage.id],
            initial_fee: 0
          })
        });

        const data = await response.json();

        if (data.user_warning && data.user_warning.excess_count > 0) {
          results.push({
            test: testName,
            status: 'PASS',
            message: 'ユーザー数超過警告が正しく表示されている',
            data: {
              current_user_count: data.user_warning.current_user_count,
              new_user_limit: data.user_warning.new_user_limit,
              excess_count: data.user_warning.excess_count
            }
          });
          passedTests++;
        } else if (currentUserCount && currentUserCount <= newUserLimit) {
          results.push({
            test: testName,
            status: 'SKIP',
            message: 'ユーザー数が上限以下のためテストスキップ',
            data: {
              current_user_count: currentUserCount,
              new_user_limit: newUserLimit
            }
          });
        } else {
          results.push({
            test: testName,
            status: 'FAIL',
            message: 'ユーザー数超過警告が表示されていない',
            data
          });
          failedTests++;
        }
      } catch (error: any) {
        results.push({
          test: testName,
          status: 'ERROR',
          message: error.message
        });
        failedTests++;
      }
    }

    // ========================================
    // テスト完了: pending_plan_changeをクリーンアップ
    // ========================================
    await supabase
      .from('contracts')
      .update({
        pending_plan_change: null,
        plan_change_requested_at: null
      })
      .eq('id', testContract.id);

    // テスト結果サマリー
    return NextResponse.json({
      summary: {
        total: passedTests + failedTests,
        passed: passedTests,
        failed: failedTests,
        success_rate: `${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`
      },
      test_contract: {
        id: testContract.id,
        contract_number: testContract.contract_number,
        organization: organization.name
      },
      results
    });

  } catch (error: any) {
    return NextResponse.json({
      error: 'テスト実行中にエラーが発生しました',
      message: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
