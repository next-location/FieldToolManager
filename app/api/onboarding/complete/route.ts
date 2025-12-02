import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { OnboardingFormData } from '@/types/organization'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized', details: authError?.message }, { status: 401 })
    }

    const body = await request.json()
    const { organizationId, formData } = body as {
      organizationId: string
      formData: OnboardingFormData
    }

    // ユーザーがこの組織の管理者であることを確認
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', user.id)
      .single()

    if (userError || !userData || userData.organization_id !== organizationId || userData.role !== 'admin') {
      console.error('User check error:', userError, userData)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // 1. 組織情報を更新（最初の業種IDのみ保存）
    const { error: orgError } = await supabase
      .from('organizations')
      .update({
        name: formData.organizationName,
        representative_name: formData.representativeName,
        phone: formData.phone,
        postal_code: formData.postalCode,
        address: formData.address,
        industry_category_id: formData.industryCategoryIds[0] || null,  // 最初の業種を代表として保存
        setup_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId)

    if (orgError) {
      console.error('Organization update error:', orgError)
      throw orgError
    }

    // 2. 組織設定を作成（業種情報を保存）
    const customSettings = {
      selected_industries: formData.industryCategoryIds,  // 全ての業種IDを保存
    }

    const { error: settingsError } = await supabase.from('organization_settings').upsert(
      {
        organization_id: organizationId,
        enable_low_stock_alert: formData.enableLowStockAlert,
        default_minimum_stock_level: 5,  // デフォルト値（実際は道具ごとに設定）
        require_checkout_approval: formData.requireCheckoutApproval,
        require_return_approval: formData.requireReturnApproval,
        enable_email_notifications: true,
        theme: 'light',
        custom_settings: customSettings,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'organization_id',  // 既存レコードがあれば更新
      }
    )

    if (settingsError) {
      console.error('Settings insert error:', settingsError)
      throw settingsError
    }

    // 3. カテゴリーを作成
    if (formData.selectedCategories.length > 0) {
      const categoryData = formData.selectedCategories.map((cat, index) => {
        // デフォルトカテゴリー
        const defaultCategoryMap: Record<string, { name: string; icon: string }> = {
          'electric-tools': { name: '電動工具', icon: '⚡' },
          measuring: { name: '測定機器', icon: '📏' },
          safety: { name: '安全装備', icon: '🦺' },
          painting: { name: '塗装用具', icon: '🎨' },
          'hand-tools': { name: '手工具', icon: '🔧' },
          consumables: { name: '消耗品', icon: '📦' },
        }

        if (cat.startsWith('custom-')) {
          // カスタムカテゴリー
          const name = cat.split(':')[1]
          return {
            organization_id: organizationId,
            name,
            icon: '📁',
            sort_order: index,
          }
        } else {
          // デフォルトカテゴリー
          const catInfo = defaultCategoryMap[cat]
          return {
            organization_id: organizationId,
            name: catInfo.name,
            icon: catInfo.icon,
            sort_order: index,
          }
        }
      })

      const { error: categoriesError } = await supabase.from('tool_categories').insert(categoryData)

      if (categoriesError) throw categoriesError
    }

    // 4. ユーザー招待（TODO: メール送信機能は後で実装）
    // 現時点ではユーザー招待情報を保存するだけ
    // 実際のメール送信はPhase 2で実装

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Onboarding error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message || 'Unknown error',
        hint: error?.hint
      },
      { status: 500 }
    )
  }
}
