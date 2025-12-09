import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createInitialContract() {
  console.log('🔧 初期契約データ作成スクリプト開始...')

  // 組織一覧を取得
  const { data: organizations, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')

  if (orgError) {
    console.error('❌ 組織の取得に失敗:', orgError)
    return
  }

  console.log(`📋 ${organizations?.length || 0}件の組織が見つかりました`)

  for (const org of organizations || []) {
    console.log(`\n処理中: ${org.name} (${org.id})`)

    // 既存の契約を確認
    const { data: existingContract } = await supabase
      .from('contracts')
      .select('id')
      .eq('organization_id', org.id)
      .single()

    if (existingContract) {
      console.log('  ✓ 既に契約データが存在します')

      // パッケージフラグを追加（既存契約の場合）
      const { error: updateError } = await supabase
        .from('contracts')
        .update({
          has_asset_package: true,
          has_dx_efficiency_package: true,
          plan_type: 'standard',
          user_limit: 30,
          base_monthly_fee: 45000,
          package_monthly_fee: 32000,
          total_monthly_fee: 77000,
          billing_cycle: 'monthly',
        })
        .eq('id', existingContract.id)

      if (updateError) {
        console.error('  ❌ 契約の更新に失敗:', updateError)
      } else {
        console.log('  ✓ 契約データを更新しました（フル機能パック）')
      }
    } else {
      // 新規契約を作成
      const { error: insertError } = await supabase
        .from('contracts')
        .insert({
          organization_id: org.id,
          contract_number: `CON-${Date.now()}-${org.id.substring(0, 8)}`,
          contract_type: 'monthly',
          plan: 'premium',  // 既存のplanカラムのチェック制約に合わせる
          plan_type: 'standard',
          user_limit: 30,
          monthly_fee: 77000,
          base_monthly_fee: 45000,
          package_monthly_fee: 32000,
          total_monthly_fee: 77000,
          start_date: new Date().toISOString().split('T')[0],
          contract_start_date: new Date().toISOString().split('T')[0],
          billing_cycle: 'monthly',
          status: 'active',
          has_asset_package: true,
          has_dx_efficiency_package: true,
        })

      if (insertError) {
        console.error('  ❌ 契約の作成に失敗:', insertError)
      } else {
        console.log('  ✓ 新規契約を作成しました（フル機能パック）')
      }
    }
  }

  console.log('\n✅ 初期契約データ作成完了！')
}

createInitialContract()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ エラー:', error)
    process.exit(1)
  })
