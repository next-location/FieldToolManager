const fs = require('fs')
const path = require('path')

/**
 * ファイル名からメタデータを推測する関数
 */
function inferMetadataFromFilename(filename, category, subcategory = null) {
  const baseName = path.basename(filename, '.md')

  // README.mdはスキップ
  if (baseName === 'README') {
    return null
  }

  // タイトルを推測（アンダースコアをスペースに、各単語を大文字化）
  let title = baseName
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

  // カテゴリとファイル名に基づいて権限レベルを推測
  let permission = 1 // デフォルトはStaff

  if (category === 'manual') {
    if (baseName.includes('login') || baseName.includes('getting_started') || baseName.includes('support')) {
      permission = 0 // Public
    } else if (baseName.includes('admin') || baseName.includes('settings_organization') || baseName.includes('settings_contract')) {
      permission = 4 // Admin
    } else if (baseName.includes('manager') || baseName.includes('approval')) {
      permission = 3 // Manager
    } else if (baseName.includes('leader') || baseName.includes('staff_add') || baseName.includes('staff_management')) {
      permission = 2 // Leader
    }

    // Scenarioの場合は、サブカテゴリから判断
    if (subcategory === 'admin_operations') {
      permission = 4
    } else if (subcategory === 'role_guides') {
      if (baseName.includes('admin')) permission = 4
      else if (baseName.includes('manager')) permission = 3
      else if (baseName.includes('leader')) permission = 2
      else permission = 1
    }
  } else if (category === 'qa') {
    // Q&Aの場合、サブカテゴリから判断
    if (subcategory === 'admin') {
      permission = 2 // Leaderが見られる
    } else {
      permission = 1 // Staff
    }
  }

  // タグを推測
  const tags = []
  if (baseName.includes('qr')) tags.push('QRコード')
  if (baseName.includes('attendance')) tags.push('勤怠管理')
  if (baseName.includes('tool')) tags.push('備品管理')
  if (baseName.includes('equipment')) tags.push('重機管理')
  if (baseName.includes('consumable')) tags.push('消耗品管理')
  if (baseName.includes('estimate')) tags.push('見積書')
  if (baseName.includes('invoice')) tags.push('請求書')
  if (baseName.includes('purchase')) tags.push('発注書')
  if (baseName.includes('work_report')) tags.push('作業報告')
  if (baseName.includes('staff')) tags.push('従業員管理')
  if (baseName.includes('settings')) tags.push('設定')
  if (baseName.includes('approval')) tags.push('承認')
  if (baseName.includes('mobile')) tags.push('モバイル')
  if (baseName.includes('issues') || baseName.includes('troubleshooting')) tags.push('トラブルシューティング')

  // タグが空の場合はデフォルトを追加
  if (tags.length === 0) {
    tags.push('基本操作')
  }

  // 日本語タイトルマッピング（主要ファイル）
  const titleMap = {
    'login': 'ログイン方法',
    'qr_scan': 'QRコードスキャン',
    'attendance': '勤怠管理',
    'attendance_clock': '勤怠打刻',
    'attendance_leader_qr': 'リーダー用QR勤怠管理',
    'attendance_settings': '勤怠設定',
    'tool_management': '備品管理',
    'tool_categories': '備品カテゴリ管理',
    'tool_sets': '備品セット管理',
    'equipment_management': '重機管理',
    'equipment_maintenance': '重機メンテナンス記録',
    'consumable_management': '消耗品管理',
    'consumable_orders': '消耗品発注',
    'consumable_order_approval_flow': '消耗品発注承認フロー',
    'warehouse_locations': '保管場所管理',
    'estimates': '見積書管理',
    'estimates_create': '見積書作成',
    'estimates_approval': '見積書承認',
    'estimates_send': '見積書送付',
    'invoices': '請求書管理',
    'invoices_create': '請求書作成',
    'invoices_approval': '請求書承認',
    'invoices_payment': '請求書支払い管理',
    'purchase_orders': '発注書管理',
    'purchase_orders_create': '発注書作成',
    'purchase_orders_approval': '発注書承認',
    'purchase_orders_send': '発注書送付',
    'work_reports': '作業報告書管理',
    'work_reports_create': '作業報告書作成',
    'work_reports_approval': '作業報告書承認',
    'work_reports_pdf': '作業報告書PDF出力',
    'work_reports_settings': '作業報告設定',
    'staff_add': '従業員追加',
    'staff_management': '従業員管理',
    'clients': '取引先管理',
    'projects': '案件管理',
    'sites': '現場管理',
    'company_sites': '自社拠点管理',
    'settings': '設定',
    'settings_organization': '組織情報設定',
    'settings_attendance': '勤怠設定',
    'settings_contract': '契約設定',
    'data_export': 'データエクスポート',
    'getting_started': 'はじめに',
    'support': 'サポート・お問い合わせ',
  }

  if (titleMap[baseName]) {
    title = titleMap[baseName]
  }

  return {
    title,
    description: `${title}に関するガイド`,
    permission,
    tags,
  }
}

/**
 * Frontmatterを追加する関数
 */
function addFrontmatter(filePath, category, subcategory = null) {
  // ファイルが存在しない場合はスキップ
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  ファイルが存在しません: ${filePath}`)
    return false
  }

  const content = fs.readFileSync(filePath, 'utf8')

  // すでにFrontmatterがある場合はスキップ
  if (content.startsWith('---')) {
    console.log(`⏭️  スキップ（既にFrontmatterあり）: ${path.relative(process.cwd(), filePath)}`)
    return false
  }

  // メタデータを推測
  const metadata = inferMetadataFromFilename(path.basename(filePath), category, subcategory)

  if (!metadata) {
    console.log(`⏭️  スキップ（README.md）: ${path.relative(process.cwd(), filePath)}`)
    return false
  }

  const frontmatter = `---
title: "${metadata.title}"
description: "${metadata.description}"
permission: ${metadata.permission}
plans: ["basic"]
category: "${category}"
tags: ${JSON.stringify(metadata.tags)}
lastUpdated: "${new Date().toISOString().split('T')[0]}"
---

`

  const newContent = frontmatter + content
  fs.writeFileSync(filePath, newContent, 'utf8')
  console.log(`✅ Frontmatter追加完了: ${path.relative(process.cwd(), filePath)}`)
  return true
}

/**
 * ディレクトリ内の全MDファイルを処理
 */
function processDirectory(dirPath, category, subcategory = null) {
  let count = 0

  if (!fs.existsSync(dirPath)) {
    console.log(`⚠️  ディレクトリが存在しません: ${dirPath}`)
    return count
  }

  const items = fs.readdirSync(dirPath)

  for (const item of items) {
    const fullPath = path.join(dirPath, item)
    const stat = fs.statSync(fullPath)

    if (stat.isDirectory()) {
      // サブディレクトリを再帰的に処理
      const subCategory = subcategory || item
      count += processDirectory(fullPath, category, subCategory)
    } else if (item.endsWith('.md')) {
      if (addFrontmatter(fullPath, category, subcategory)) {
        count++
      }
    }
  }

  return count
}

/**
 * メイン処理
 */
function main() {
  const manualDir = path.join(process.cwd(), 'docs', 'manual')
  const qaDir = path.join(process.cwd(), 'docs', 'qa')

  console.log('========================================')
  console.log('📝 Frontmatter追加スクリプト開始')
  console.log('========================================\n')

  // 1. マニュアルファイルの処理
  console.log('📚 マニュアルファイルの処理開始...\n')
  const manualCount = processDirectory(manualDir, 'manual')
  console.log(`\n✅ マニュアル: ${manualCount}ファイル処理完了\n`)

  // 2. Q&Aファイルの処理
  console.log('❓ Q&Aファイルの処理開始...\n')
  const qaCount = processDirectory(qaDir, 'qa')
  console.log(`\n✅ Q&A: ${qaCount}ファイル処理完了\n`)

  console.log('========================================')
  console.log('🎉 全処理完了！')
  console.log(`   マニュアル: ${manualCount}ファイル`)
  console.log(`   Q&A: ${qaCount}ファイル`)
  console.log(`   合計: ${manualCount + qaCount}ファイル`)
  console.log('========================================')
}

// スクリプト実行
main()
