import { createClient } from '@/lib/supabase/server'

export async function insertSampleData(userId: string, companyId: string) {
  const supabase = createClient()

  try {
    // 1. 拠点データ
    const locations = [
      { name: '本社倉庫', address: '東京都千代田区丸の内1-1-1', company_id: companyId },
      { name: '現場A', address: '神奈川県横浜市中区1-1', company_id: companyId },
      { name: '現場B', address: '埼玉県さいたま市大宮区1-1', company_id: companyId },
    ]
    const { data: insertedLocations } = await supabase
      .from('locations')
      .insert(locations)
      .select()

    if (!insertedLocations || insertedLocations.length === 0) {
      throw new Error('Failed to insert locations')
    }

    // 2. カテゴリデータ
    const categories = [
      { name: '電動工具', company_id: companyId },
      { name: '手動工具', company_id: companyId },
      { name: '測定機器', company_id: companyId },
      { name: '安全用品', company_id: companyId },
    ]
    const { data: insertedCategories } = await supabase
      .from('categories')
      .insert(categories)
      .select()

    if (!insertedCategories || insertedCategories.length === 0) {
      throw new Error('Failed to insert categories')
    }

    // 3. 工具データ（20個）
    const tools = [
      {
        name: 'インパクトドライバー',
        item_code: 'DEMO-001',
        status: 'available',
        category_id: insertedCategories[0].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 1,
        unit: '台'
      },
      {
        name: '丸ノコ',
        item_code: 'DEMO-002',
        status: 'in_use',
        category_id: insertedCategories[0].id,
        location_id: insertedLocations[1].id,
        company_id: companyId,
        quantity: 1,
        unit: '台'
      },
      {
        name: '発電機',
        item_code: 'DEMO-003',
        status: 'maintenance',
        category_id: insertedCategories[0].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 1,
        unit: '台'
      },
      {
        name: 'ハンマー',
        item_code: 'DEMO-004',
        status: 'available',
        category_id: insertedCategories[1].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 5,
        unit: '個'
      },
      {
        name: 'ドライバーセット',
        item_code: 'DEMO-005',
        status: 'available',
        category_id: insertedCategories[1].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 3,
        unit: 'セット'
      },
      {
        name: 'レーザー距離計',
        item_code: 'DEMO-006',
        status: 'in_use',
        category_id: insertedCategories[2].id,
        location_id: insertedLocations[1].id,
        company_id: companyId,
        quantity: 1,
        unit: '台'
      },
      {
        name: '水平器',
        item_code: 'DEMO-007',
        status: 'available',
        category_id: insertedCategories[2].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 2,
        unit: '個'
      },
      {
        name: 'ヘルメット',
        item_code: 'DEMO-008',
        status: 'available',
        category_id: insertedCategories[3].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 20,
        unit: '個'
      },
      {
        name: '安全帯',
        item_code: 'DEMO-009',
        status: 'available',
        category_id: insertedCategories[3].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 10,
        unit: '個'
      },
      {
        name: '電動ドリル',
        item_code: 'DEMO-010',
        status: 'available',
        category_id: insertedCategories[0].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 2,
        unit: '台'
      },
      {
        name: 'グラインダー',
        item_code: 'DEMO-011',
        status: 'in_use',
        category_id: insertedCategories[0].id,
        location_id: insertedLocations[2].id,
        company_id: companyId,
        quantity: 1,
        unit: '台'
      },
      {
        name: 'チェーンソー',
        item_code: 'DEMO-012',
        status: 'available',
        category_id: insertedCategories[0].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 1,
        unit: '台'
      },
      {
        name: 'スコップ',
        item_code: 'DEMO-013',
        status: 'available',
        category_id: insertedCategories[1].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 10,
        unit: '本'
      },
      {
        name: 'バール',
        item_code: 'DEMO-014',
        status: 'available',
        category_id: insertedCategories[1].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 5,
        unit: '本'
      },
      {
        name: 'メジャー',
        item_code: 'DEMO-015',
        status: 'available',
        category_id: insertedCategories[2].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 10,
        unit: '個'
      },
      {
        name: '脚立',
        item_code: 'DEMO-016',
        status: 'in_use',
        category_id: insertedCategories[1].id,
        location_id: insertedLocations[1].id,
        company_id: companyId,
        quantity: 1,
        unit: '台'
      },
      {
        name: '作業灯',
        item_code: 'DEMO-017',
        status: 'available',
        category_id: insertedCategories[0].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 3,
        unit: '台'
      },
      {
        name: '安全靴',
        item_code: 'DEMO-018',
        status: 'available',
        category_id: insertedCategories[3].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 15,
        unit: '足'
      },
      {
        name: '作業手袋',
        item_code: 'DEMO-019',
        status: 'available',
        category_id: insertedCategories[3].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 50,
        unit: '双'
      },
      {
        name: '高圧洗浄機',
        item_code: 'DEMO-020',
        status: 'available',
        category_id: insertedCategories[0].id,
        location_id: insertedLocations[0].id,
        company_id: companyId,
        quantity: 1,
        unit: '台'
      },
    ]

    await supabase.from('items').insert(tools)

    console.log('Sample data inserted successfully')
    return { success: true }
  } catch (error) {
    console.error('Failed to insert sample data:', error)
    throw error
  }
}

// ランダムな日時を生成（過去30日以内）
function getRandomDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo))
  date.setHours(Math.floor(Math.random() * 24))
  date.setMinutes(Math.floor(Math.random() * 60))
  return date.toISOString()
}
