import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import type { ManualFrontmatter, ManualArticle } from './types'

/**
 * MDXファイルからFrontmatterとコンテンツを抽出
 */
export function parseMDXFile(filePath: string): ManualArticle | null {
  try {
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(fileContents)

    // Frontmatterのバリデーション
    if (!data.title || !data.description || typeof data.permission !== 'number') {
      console.warn(`Invalid frontmatter in ${filePath}`)
      return null
    }

    // ファイルパスからslugを生成
    const slug = filePath
      .replace(process.cwd(), '')
      .replace(/^\/app\/\(authenticated\)\//, '')
      .replace(/\/page\.mdx?$/, '')
      .replace(/\.mdx?$/, '')

    return {
      slug,
      frontmatter: data as ManualFrontmatter,
      content,
    }
  } catch (error) {
    console.error(`Error parsing MDX file ${filePath}:`, error)
    return null
  }
}

/**
 * ディレクトリ内の全MDXファイルを再帰的に取得
 */
export function getAllMDXFiles(dir: string): string[] {
  const files: string[] = []

  try {
    const items = fs.readdirSync(dir)

    for (const item of items) {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)

      if (stat.isDirectory()) {
        files.push(...getAllMDXFiles(fullPath))
      } else if (item.endsWith('.mdx') || item.endsWith('.md')) {
        files.push(fullPath)
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error)
  }

  return files
}

/**
 * マニュアルディレクトリから全記事を取得
 */
export function getAllManualArticles(): ManualArticle[] {
  const manualDir = path.join(process.cwd(), 'app', '(authenticated)', 'manual')
  const qaDir = path.join(process.cwd(), 'app', '(authenticated)', 'qa')

  const manualFiles = getAllMDXFiles(manualDir)
  const qaFiles = getAllMDXFiles(qaDir)

  const allFiles = [...manualFiles, ...qaFiles]
  const articles: ManualArticle[] = []

  for (const file of allFiles) {
    const article = parseMDXFile(file)
    if (article) {
      articles.push(article)
    }
  }

  return articles
}

/**
 * 権限レベル別に記事を分類
 */
export function groupArticlesByPermission(articles: ManualArticle[]) {
  return {
    public: articles.filter((a) => a.frontmatter.permission === 0),
    staff: articles.filter((a) => a.frontmatter.permission === 1),
    leader: articles.filter((a) => a.frontmatter.permission === 2),
    manager: articles.filter((a) => a.frontmatter.permission === 3),
    owner: articles.filter((a) => a.frontmatter.permission === 4),
  }
}

/**
 * カテゴリ別に記事を分類
 */
export function groupArticlesByCategory(articles: ManualArticle[]) {
  return {
    manual: articles.filter((a) => a.frontmatter.category === 'manual'),
    qa: articles.filter((a) => a.frontmatter.category === 'qa'),
  }
}
