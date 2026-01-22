import fs from 'fs'
import { glob } from 'glob'
import matter from 'gray-matter'

async function unifyQATitles() {
  console.log('🔄 Unifying QA titles to "○○に関するQ&A" format...\n')

  const qaFiles = await glob('docs/qa/**/*.md')

  const titleMappings: Record<string, string> = {
    // Pattern 1: Q&A: ○○ → ○○に関するQ&A
    'Q&A: 作業報告書PDF出力': '作業報告書のPDF出力に関するQ&A',
    'Q&A: 作業報告書承認': '作業報告書の承認に関するQ&A',
    'Q&A: 勤怠設定': '勤怠設定に関するQ&A',
    'Q&A: 消耗品登録・在庫調整': '消耗品の登録と在庫調整に関するQ&A',
    'Q&A: 重機メンテナンス記録': '重機のメンテナンス記録に関するQ&A',

    // Pattern 2: ○○ Q&A → ○○に関するQ&A
    'スタッフ追加（権限の違い） Q&A': 'スタッフの追加と権限に関するQ&A',
    '入金記録 Q&A': '入金記録に関するQ&A',
    '出退勤設定 Q&A': '出退勤設定に関するQ&A',
    '契約について Q&A': '契約に関するQ&A',
    '月次報告業務 Q&A': '月次報告業務に関するQ&A',
    '発注から支払いまでの流れ Q&A': '発注から支払いまでの流れに関するQ&A',
    '発注書作成 Q&A': '発注書の作成に関するQ&A',
    '発注書承認フロー（金額別） Q&A': '発注書の承認フロー（金額別）に関するQ&A',
    '組織情報設定 Q&A': '組織情報設定に関するQ&A',
    '見積→契約→請求の一連の流れ Q&A': '見積から契約・請求までの流れに関するQ&A',
    '請求書作成 Q&A': '請求書の作成に関するQ&A',
    '請求書提出・承認 Q&A': '請求書の提出と承認に関するQ&A',
    '道具カテゴリ管理 Q&A': '道具カテゴリの管理に関するQ&A',

    // Pattern 3: ○○のトラブルシューティング → ○○に関するQ&A
    'QRスキャンのトラブルシューティング': 'QRスキャンに関するQ&A',
    'リーダー用QR発行のトラブルシューティング': 'リーダー用QR発行に関するQ&A',
    '作業報告書のトラブルシューティング': '作業報告書に関するQ&A',
    '作業報告書作成のトラブルシューティング': '作業報告書の作成に関するQ&A',
    '倉庫位置管理のトラブルシューティング': '倉庫位置の管理に関するQ&A',
    '勤怠管理のトラブルシューティング': '勤怠管理に関するQ&A',
    '取引先管理のトラブルシューティング': '取引先の管理に関するQ&A',
    '新規現場立ち上げのトラブルシューティング': '新規現場の立ち上げに関するQ&A',
    '消耗品発注管理のトラブルシューティング': '消耗品の発注管理に関するQ&A',
    '消耗品管理のトラブルシューティング': '消耗品の管理に関するQ&A',
    '現場完了・片付けのトラブルシューティング': '現場の完了と片付けに関するQ&A',
    '現場管理のトラブルシューティング': '現場の管理に関するQ&A',
    '発注書のトラブルシューティング': '発注書に関するQ&A',
    '見積書のトラブルシューティング': '見積書に関するQ&A',
    '見積書作成のトラブルシューティング': '見積書の作成に関するQ&A',
    '見積書提出・承認のトラブルシューティング': '見積書の提出と承認に関するQ&A',
    '請求書のトラブルシューティング': '請求書に関するQ&A',
    '道具セット管理のトラブルシューティング': '道具セットの管理に関するQ&A',
    '道具管理のトラブルシューティング': '道具の管理に関するQ&A',
    '重機管理のトラブルシューティング': '重機の管理に関するQ&A',

    // Pattern 4: ○○のよくある質問のトラブルシューティング → ○○に関するQ&A
    '出退勤打刻のよくある質問のトラブルシューティング': '出退勤の打刻に関するQ&A',
    '工事管理のよくある質問のトラブルシューティング': '工事の管理に関するQ&A',
    '設定のよくある質問のトラブルシューティング': '設定に関するQ&A',
    '道具登録のよくある質問のトラブルシューティング': '道具の登録に関するQ&A',
    '現場スタッフの1日の流れのトラブルシューティング': '現場スタッフの1日の流れに関するQ&A',

    // Pattern 5: No suffix → add に関するQ&A
    'スマートフォン・タブレット利用': 'スマートフォンとタブレットの利用に関するQ&A',
    'ログイン・パスワード関連': 'ログインとパスワードに関するQ&A',
    'データエクスポートに関するQ&A': 'データのエクスポートに関するQ&A',
    '従業員管理に関するQ&A': '従業員の管理に関するQ&A',
    '組織設定に関するQ&A': '組織の設定に関するQ&A',
  }

  let updatedCount = 0

  for (const filePath of qaFiles) {
    const content = fs.readFileSync(filePath, 'utf-8')
    const { data, content: markdownContent } = matter(content)

    const oldTitle = data.title
    const newTitle = titleMappings[oldTitle]

    if (newTitle && newTitle !== oldTitle) {
      data.title = newTitle

      // Regenerate description based on new title
      const baseTitle = newTitle.replace(/に関するQ&A$/, '')
      data.description = `${baseTitle}に関するよくある質問と回答`
      data.lastUpdated = '2026-01-22'

      const newContent = matter.stringify(markdownContent, data)
      fs.writeFileSync(filePath, newContent, 'utf-8')

      console.log(`✓ ${oldTitle}`)
      console.log(`  → ${newTitle}`)
      updatedCount++
    }
  }

  console.log(`\n✅ Updated ${updatedCount} QA files!`)
}

unifyQATitles().catch(console.error)
