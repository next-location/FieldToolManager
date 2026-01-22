#!/usr/bin/env tsx
/**
 * Q&AファイルのfrontmatterをファイルのH1タイトルに基づいて日本語化
 */

import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

interface FrontmatterData {
  title: string
  description: string
  permission: number
  plans: string[]
  category: string
  tags: string[]
  lastUpdated: string
}

function extractH1Title(content: string): string | null {
  const h1Match = content.match(/^#\s+(.+)$/m)
  return h1Match ? h1Match[1].trim() : null
}

function generateDescription(h1Title: string): string {
  // Q&A、トラブルシューティング等の文言を含む場合
  if (h1Title.includes('Q&A') || h1Title.includes('トラブル')) {
    return `${h1Title.replace(/（Q&A）|（トラブル.*）/, '')}に関するよくある質問とトラブル解決方法`
  }
  return `${h1Title}に関するよくある質問`
}

async function translateQAFiles() {
  console.log('🔍 Translating QA frontmatter to Japanese...\n')

  const qaDir = path.join(process.cwd(), 'docs', 'qa')
  const files: string[] = []

  // 再帰的にmdファイルを検索
  function findMdFiles(dir: string) {
    const items = fs.readdirSync(dir)
    items.forEach(item => {
      const fullPath = path.join(dir, item)
      const stat = fs.statSync(fullPath)
      if (stat.isDirectory()) {
        findMdFiles(fullPath)
      } else if (item.endsWith('.md')) {
        files.push(fullPath)
      }
    })
  }

  findMdFiles(qaDir)
  console.log(`✓ Found ${files.length} QA files\n`)

  let translatedCount = 0

  for (const filePath of files) {
    const fileContents = fs.readFileSync(filePath, 'utf8')
    const { data, content } = matter(fileContents)

    // H1タイトルを抽出
    const h1Title = extractH1Title(content)
    if (!h1Title) {
      console.log(`⚠ No H1 found in ${path.basename(filePath)}, skipping...`)
      continue
    }

    // タイトルが英語っぽい場合のみ更新（全て大文字orスペース区切り）
    const needsTranslation = /^[A-Z][a-zA-Z\s]+$/.test(data.title)

    if (needsTranslation) {
      const oldTitle = data.title
      const newTitle = h1Title.replace(/（Q&A）$/, 'のトラブルシューティング')
      const newDescription = generateDescription(h1Title)

      // frontmatterを更新
      const updatedData: FrontmatterData = {
        ...data as FrontmatterData,
        title: newTitle,
        description: newDescription,
        lastUpdated: '2026-01-22',
      }

      // ファイルを再生成
      const updatedFile = matter.stringify(content, updatedData)
      fs.writeFileSync(filePath, updatedFile, 'utf8')

      console.log(`✓ ${path.basename(filePath)}`)
      console.log(`  ${oldTitle} → ${newTitle}`)
      translatedCount++
    }
  }

  console.log(`\n✅ Translated ${translatedCount} files!`)
}

translateQAFiles()
