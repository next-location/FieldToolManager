// 拠点（現場・自社拠点）の型定義

export type SiteType = 'customer_site' | 'own_warehouse' | 'branch' | 'storage_yard' | 'equipment_yard' | 'parking' | 'other'

export interface Site {
  id: string
  name: string
  type?: SiteType
  is_own_location?: boolean
  address?: string | null
}

// 拠点タイプのラベル
export const SITE_TYPE_LABELS: Record<SiteType, string> = {
  customer_site: '顧客現場',
  own_warehouse: '自社倉庫',
  branch: '支店',
  storage_yard: '資材置き場',
  equipment_yard: '重機置き場',
  parking: '駐車場',
  other: 'その他',
}

// 拠点タイプの選択肢（自社拠点のみ）
export const OWN_LOCATION_TYPES: SiteType[] = [
  'own_warehouse',
  'branch',
  'storage_yard',
  'equipment_yard',
  'parking',
  'other',
]
