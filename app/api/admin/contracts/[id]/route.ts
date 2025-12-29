import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminSession } from '@/lib/auth/super-admin'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_LIMITS: Record<string, number> = {
  start: 10,
  standard: 30,
  business: 50,
  pro: 100,
}

// PATCH /api/admin/contracts/[id] - 契約情報の更新
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // スーパーアドミン認証チェック
    const session = await getSuperAdminSession()
    if (!session) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    }

    // Super Admin の権限を確認
    const { data: adminData, error: adminError } = await supabase
      .from('super_admins')
      .select('role')
      .eq('id', session.id)
      .single()

    if (adminError || !adminData) {
      return NextResponse.json({ error: '管理者が見つかりません' }, { status: 404 })
    }

    // Owner権限チェック
    if (adminData.role !== 'owner') {
      return NextResponse.json(
        { error: '契約の更新はオーナーのみ実行できます' },
        { status: 403 }
      )
    }

    const { id: contractId } = await params
    const body = await request.json()

    // 契約情報を取得
    const { data: contract, error: contractError } = await supabase
      .from('contracts')
      .select('organization_id, plan, user_limit, status, contract_type, total_monthly_fee, base_monthly_fee, package_monthly_fee')
      .eq('id', contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json({ error: '契約が見つかりません' }, { status: 404 })
    }

    // プラン変更がある場合、検証を実行
    if (body.plan && body.user_limit) {
      const newUserLimit = body.user_limit
      const currentUserLimit = contract.user_limit

      // グレードダウンの場合、ユーザー数をチェック
      if (newUserLimit < currentUserLimit) {
        const { count: activeUserCount, error: countError } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', contract.organization_id)
          .is('deleted_at', null)
          .eq('is_active', true)

        if (countError) {
          console.error('Failed to count users:', countError)
          return NextResponse.json(
            { error: 'ユーザー数の取得に失敗しました' },
            { status: 500 }
          )
        }

        const currentUsers = activeUserCount || 0

        if (currentUsers > newUserLimit) {
          const excessUsers = currentUsers - newUserLimit

          return NextResponse.json(
            {
              error: 'グレードダウンできません',
              details: {
                message: `現在${currentUsers}人のアクティブユーザーがいますが、新プラン「${body.plan}」の上限は${newUserLimit}人です。\n\nプラン変更前に${excessUsers}人のユーザーを無効化する必要があります。`,
                current_users: currentUsers,
                new_limit: newUserLimit,
                excess_users: excessUsers,
              },
            },
            { status: 400 }
          )
        }
      }
    }

    // 更新可能なフィールドを抽出
    const updateData: any = {}
    const allowedFields = [
      'plan',
      'user_limit',
      'base_monthly_fee',
      'package_monthly_fee',
      'total_monthly_fee',
      'start_date',
      'end_date',
      'auto_renew',
      'billing_cycle',
      'notes',
    ]

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    })

    // プラン変更時の日割り差額計算
    if (body.total_monthly_fee !== undefined && contract.total_monthly_fee !== undefined) {
      const oldMonthlyFee = contract.total_monthly_fee
      const newMonthlyFee = body.total_monthly_fee
      const isUpgrade = newMonthlyFee > oldMonthlyFee
      const isDowngrade = newMonthlyFee < oldMonthlyFee

      if (contract.contract_type === 'monthly') {
        if (isUpgrade) {
          // 月払いグレードアップ: 日割り差額を計算して翌月請求に加算
          const today = new Date()
          const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
          const remainingDays = lastDay.getDate() - today.getDate() + 1
          const daysInMonth = lastDay.getDate()

          const proratedCharge = Math.round((newMonthlyFee - oldMonthlyFee) * remainingDays / daysInMonth)

          updateData.pending_prorated_charge = proratedCharge
          updateData.pending_prorated_description = `プラン変更差額（${today.getMonth() + 1}月${today.getDate() + 1}日〜末日、${remainingDays}日分）`
          updateData.plan_change_date = new Date().toISOString()
          updateData.plan_change_type = 'upgrade'

          console.log('[Contract Update] Monthly upgrade - prorated charge calculated:', {
            contractId,
            oldMonthlyFee,
            newMonthlyFee,
            remainingDays,
            proratedCharge,
          })

        } else if (isDowngrade) {
          // 月払いグレードダウン: 次回請求から適用（日割り差額なし）
          updateData.plan_change_date = new Date().toISOString()
          updateData.plan_change_type = 'downgrade'

          console.log('[Contract Update] Monthly downgrade - no prorated charge:', {
            contractId,
            oldMonthlyFee,
            newMonthlyFee,
          })
        }

      } else if (contract.contract_type === 'annual') {
        if (isUpgrade) {
          // 年払いグレードアップ: 残り期間の差額を即時請求
          // TODO: 年払いグレードアップ時の即時請求書発行処理
          // 現在は手動で請求書発行する想定
          updateData.plan_change_date = new Date().toISOString()
          updateData.plan_change_type = 'upgrade'

          console.log('[Contract Update] Annual upgrade - manual invoice required:', {
            contractId,
            oldMonthlyFee,
            newMonthlyFee,
          })

        } else if (isDowngrade) {
          // 年払いグレードダウン: 次回請求から適用
          updateData.plan_change_date = new Date().toISOString()
          updateData.plan_change_type = 'downgrade'

          console.log('[Contract Update] Annual downgrade:', {
            contractId,
            oldMonthlyFee,
            newMonthlyFee,
          })
        }
      }
    }

    // 契約を更新
    const { data: updatedContract, error: updateError } = await supabase
      .from('contracts')
      .update(updateData)
      .eq('id', contractId)
      .select()
      .single()

    if (updateError) {
      console.error('Contract update failed:', updateError)
      return NextResponse.json(
        { error: '契約の更新に失敗しました', details: updateError.message },
        { status: 500 }
      )
    }

    // 組織のプラン情報も更新（プラン変更があった場合）
    if (body.plan && body.user_limit) {
      await supabase
        .from('organizations')
        .update({
          plan: body.plan,
          max_users: body.user_limit,
        })
        .eq('id', contract.organization_id)
    }

    // ログを記録
    await supabase.from('super_admin_logs').insert({
      super_admin_id: session.id,
      action: 'update_contract',
      details: {
        contract_id: contractId,
        organization_id: contract.organization_id,
        updated_fields: Object.keys(updateData),
        old_values: {
          plan: contract.plan,
          user_limit: contract.user_limit,
        },
        new_values: {
          plan: body.plan,
          user_limit: body.user_limit,
        },
      },
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent'),
    })

    return NextResponse.json({
      success: true,
      message: '契約を更新しました',
      contract: updatedContract,
    })
  } catch (error: any) {
    console.error('[API /api/admin/contracts/[id]] Error:', error)
    return NextResponse.json(
      {
        error: 'サーバーエラーが発生しました',
        details: error.message,
      },
      { status: 500 }
    )
  }
}
