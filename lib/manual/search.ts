import FlexSearch from 'flexsearch'
import type { ManualArticle, SearchResultItem } from './types'

/**
 * 検索インデックスを作成
 */
export function createSearchIndex(articles: ManualArticle[]) {
  const index = new FlexSearch.Document({
    document: {
      id: 'slug',
      index: ['title', 'description', 'content', 'tags'],
      store: ['title', 'description', 'category', 'permission', 'tags', 'slug'],
    },
    tokenize: 'full',
    context: true,
  })

  // 記事をインデックスに追加
  articles.forEach((article) => {
    index.add({
      slug: article.slug,
      title: article.frontmatter.title,
      description: article.frontmatter.description,
      content: article.content,
      category: article.frontmatter.category,
      permission: article.frontmatter.permission,
      tags: article.frontmatter.tags.join(' '),
    })
  })

  return index
}

/**
 * 検索を実行
 */
export async function searchArticles(
  index: FlexSearch.Document<any>,
  query: string,
  limit: number = 10
): Promise<SearchResultItem[]> {
  if (!query || query.trim().length === 0) {
    return []
  }

  const results = await index.search(query, {
    limit,
    enrich: true,
  })

  // 結果を統合してフラット化
  const items: SearchResultItem[] = []
  const seenSlugs = new Set<string>()

  for (const fieldResult of results) {
    for (const result of fieldResult.result) {
      const doc = result.doc as any
      if (!seenSlugs.has(doc.slug)) {
        seenSlugs.add(doc.slug)
        items.push({
          slug: doc.slug,
          title: doc.title,
          description: doc.description,
          category: doc.category,
          permission: doc.permission,
          tags: doc.tags.split(' ').filter(Boolean),
        })
      }
    }
  }

  return items.slice(0, limit)
}

/**
 * 検索インデックスをJSON形式でエクスポート
 */
export function exportSearchIndex(articles: ManualArticle[]) {
  return articles.map((article) => ({
    slug: article.slug,
    title: article.frontmatter.title,
    description: article.frontmatter.description,
    content: article.content.substring(0, 500), // 最初の500文字のみ
    category: article.frontmatter.category,
    permission: article.frontmatter.permission,
    tags: article.frontmatter.tags,
  }))
}
