import { Document } from 'flexsearch'
import type { ManualArticle, SearchResultItem } from './types'

/**
 * HTMLタグを除去
 */
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * カタカナをひらがなに変換
 */
function kanaToHiragana(str: string): string {
  return str.replace(/[\u30A1-\u30F6]/g, (match) => {
    const chr = match.charCodeAt(0) - 0x60
    return String.fromCharCode(chr)
  })
}

/**
 * テキストを正規化（ひらがな・カタカナ両対応、小文字化）
 */
function normalizeText(text: string): string {
  return kanaToHiragana(text.toLowerCase())
}

/**
 * テキストから主要キーワードを抽出
 */
function extractKeywords(text: string, existingTags: string[]): string[] {
  // 既存のタグ
  const keywords = new Set(existingTags)

  // ストップワード（除外する一般的な単語）
  const stopWords = new Set([
    'する', 'ある', 'こと', 'もの', 'ため', 'よう', 'から', 'まで', 'など',
    'また', 'ただし', 'について', 'における', 'として', 'により', 'によって',
    'これ', 'それ', 'あれ', 'この', 'その', 'あの', 'です', 'ます', 'ください',
    '場合', 'とき', 'すべて', 'できる', 'できない', '必要', '可能',
    'をタップ', 'ボタン', 'をクリック', '画面', '表示', '確認', '選択',
    '以下', '上記', 'なお', 'ただし', '注意', '組織設定で有効な場合',
    'サイドメニューから', '基本的な流れ', '概要', '方法', '手順',
  ])

  // テキストを単語に分割（2文字以上の日本語・英数字）
  const words = text.match(/[ぁ-んァ-ヶー一-龠a-zA-Z0-9]{2,}/g) || []

  // 頻出単語をカウント（ひらがな・カタカナ正規化）
  const wordCount = new Map<string, number>()
  words.forEach(word => {
    const normalized = normalizeText(word)
    if (!stopWords.has(normalized)) {
      wordCount.set(normalized, (wordCount.get(normalized) || 0) + 1)
    }
  })

  // 頻度が高い単語を追加（上位10個）
  Array.from(wordCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([word]) => keywords.add(word))

  return Array.from(keywords)
}

/**
 * 検索インデックスを作成
 */
export function createSearchIndex(articles: ManualArticle[]) {
  const index = new Document({
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
  index: Document<any>,
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
  return articles.map((article) => {
    // HTMLタグを除去してテキスト化
    const plainText = stripHtml(article.content)
    const searchText = `${article.frontmatter.title} ${article.frontmatter.description} ${plainText.substring(0, 1000)}`

    // 既存のタグ + 自動抽出キーワード（ひらがな正規化版も追加）
    const enhancedTags = extractKeywords(searchText, article.frontmatter.tags)

    // ひらがな・カタカナ両対応のため、各タグのひらがな版も追加
    const hiraganaVariants = enhancedTags.map(tag => normalizeText(tag))
    const allTags = [...new Set([...enhancedTags, ...hiraganaVariants])]

    return {
      slug: article.slug,
      title: article.frontmatter.title,
      description: article.frontmatter.description,
      content: plainText.substring(0, 500), // 最初の500文字のみ
      category: article.frontmatter.category,
      permission: article.frontmatter.permission,
      tags: allTags,
    }
  })
}
