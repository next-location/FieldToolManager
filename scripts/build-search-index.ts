#!/usr/bin/env tsx
/**
 * 検索インデックス生成スクリプト
 * ビルド時に全MDXファイルをスキャンして検索インデックスを生成
 */

import fs from 'fs'
import path from 'path'
import { getAllManualArticles } from '../lib/manual/metadata'
import { exportSearchIndex } from '../lib/manual/search'

async function buildSearchIndex() {
  console.log('🔍 Building search index...')

  try {
    // 全記事を取得
    const articles = await getAllManualArticles()
    console.log(`✓ Found ${articles.length} articles`)

    // 検索インデックスをエクスポート
    const searchData = exportSearchIndex(articles)

    // public/search-index.json に出力
    const outputDir = path.join(process.cwd(), 'public')
    const outputPath = path.join(outputDir, 'search-index.json')

    // publicディレクトリがなければ作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    fs.writeFileSync(outputPath, JSON.stringify(searchData, null, 2), 'utf8')
    console.log(`✓ Search index saved to ${outputPath}`)

    // 統計情報を表示
    const stats = {
      total: articles.length,
      manual: articles.filter((a) => a.frontmatter.category === 'manual').length,
      qa: articles.filter((a) => a.frontmatter.category === 'qa').length,
      byPermission: {
        public: articles.filter((a) => a.frontmatter.permission === 0).length,
        staff: articles.filter((a) => a.frontmatter.permission === 1).length,
        leader: articles.filter((a) => a.frontmatter.permission === 2).length,
        manager: articles.filter((a) => a.frontmatter.permission === 3).length,
        owner: articles.filter((a) => a.frontmatter.permission === 4).length,
      },
    }

    console.log('\n📊 Statistics:')
    console.log(`  Total articles: ${stats.total}`)
    console.log(`  Manual: ${stats.manual}`)
    console.log(`  Q&A: ${stats.qa}`)
    console.log('\n  By permission:')
    console.log(`    Public: ${stats.byPermission.public}`)
    console.log(`    Staff: ${stats.byPermission.staff}`)
    console.log(`    Leader: ${stats.byPermission.leader}`)
    console.log(`    Manager: ${stats.byPermission.manager}`)
    console.log(`    Owner: ${stats.byPermission.owner}`)

    console.log('\n✅ Search index build completed!')
  } catch (error) {
    console.error('❌ Error building search index:', error)
    process.exit(1)
  }
}

// 実行
buildSearchIndex()
