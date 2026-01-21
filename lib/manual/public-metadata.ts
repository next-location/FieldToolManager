import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'
import type { ManualFrontmatter, ManualArticle } from './types'

/**
 * 日本語テキストをURLフレンドリーなIDに変換
 */
function slugify(text: string): string {
  return encodeURIComponent(
    text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]+/g, '')
  )
}

/**
 * HTMLの見出しタグにIDを追加
 */
function addHeadingIds(html: string): string {
  return html.replace(/<h([2-4])>(.*?)<\/h\1>/g, (match, level, content) => {
    const textContent = content.replace(/<[^>]+>/g, '') // HTMLタグを除去
    const id = slugify(textContent)
    return `<h${level} id="${id}">${content}</h${level}>`
  })
}

/**
 * MarkdownをHTMLに変換
 */
async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(markdown)

  // 見出しにIDを追加
  return addHeadingIds(result.toString())
}

/**
 * 公開マニュアル記事を取得（permission: 0のみ）
 */
export async function getPublicManualArticle(slug: string): Promise<ManualArticle | null> {
  try {
    const filePath = path.join(process.cwd(), 'docs', 'manual', `${slug}.md`)

    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`)
      return null
    }

    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(fileContents)

    // Frontmatterのバリデーション
    if (!data.title || !data.description || typeof data.permission !== 'number') {
      console.warn(`Invalid frontmatter in ${filePath}`)
      return null
    }

    // 公開記事（permission: 0）のみ許可
    if (data.permission !== 0) {
      console.warn(`Article ${slug} is not public (permission: ${data.permission})`)
      return null
    }

    // MarkdownをHTMLに変換
    const htmlContent = await markdownToHtml(content)

    return {
      slug: `manual/${slug}`,
      frontmatter: data as ManualFrontmatter,
      content: htmlContent,
    }
  } catch (error) {
    console.error(`Error loading public manual article ${slug}:`, error)
    return null
  }
}

/**
 * 全公開マニュアル記事を取得
 */
export async function getAllPublicManualArticles(): Promise<ManualArticle[]> {
  const manualDir = path.join(process.cwd(), 'docs', 'manual')
  const articles: ManualArticle[] = []

  try {
    const files = fs.readdirSync(manualDir)

    for (const file of files) {
      if (file.endsWith('.md') && file !== 'README.md') {
        const slug = file.replace('.md', '')
        const article = await getPublicManualArticle(slug)
        if (article) {
          articles.push(article)
        }
      }
    }
  } catch (error) {
    console.error('Error loading public manual articles:', error)
  }

  return articles
}
