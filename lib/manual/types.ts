/**
 * マニュアル記事のFrontmatterメタデータ型定義
 */
export interface ManualFrontmatter {
  title: string
  description: string
  permission: 0 | 1 | 2 | 3 | 4 // 0: public, 1: staff, 2: leader, 3: manager, 4: owner
  plans: ('basic' | 'asset_pack' | 'dx_pack')[]
  category: 'manual' | 'qa'
  tags: string[]
  lastUpdated: string
}

/**
 * マニュアル記事データ
 */
export interface ManualArticle {
  slug: string
  frontmatter: ManualFrontmatter
  content: string
}

/**
 * 検索結果アイテム
 */
export interface SearchResultItem {
  slug: string
  title: string
  description: string
  category: 'manual' | 'qa'
  permission: number
  tags: string[]
}
