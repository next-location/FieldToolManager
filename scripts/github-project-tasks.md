# GitHub Projects タスク管理

## プロジェクト作成後のCLI操作

### 1. Issueの作成と追加

```bash
# Issueを作成してProjectに追加
gh issue create --title "タスク名" --body "詳細" --project "PROJECT_NUMBER"

# 例：初期設定タスク
gh issue create --title "Next.js初期セットアップ" \
  --body "Next.js 14 App Routerでプロジェクトを初期化" \
  --label "setup,frontend"

gh issue create --title "Supabaseセットアップ" \
  --body "Supabaseプロジェクト作成とRLS設定" \
  --label "setup,backend"
```

### 2. タスクの一括作成スクリプト

```bash
#!/bin/bash
# create-initial-tasks.sh

REPO="next-location/FieldToolManager"

# フェーズ1: 初期セットアップ
gh issue create --repo $REPO --title "📦 Next.js初期セットアップ" \
  --body "- Next.js 14 App Router
- TypeScript設定
- Tailwind CSS設定
- ESLint/Prettier設定" \
  --label "setup,phase1"

gh issue create --repo $REPO --title "🗄️ Supabaseセットアップ" \
  --body "- Supabaseプロジェクト作成
- 環境変数設定
- 型定義生成" \
  --label "backend,phase1"

gh issue create --repo $REPO --title "🔐 認証システム実装" \
  --body "- Supabase Auth設定
- ログイン/ログアウト画面
- パスワードリセット機能
- セッション管理" \
  --label "auth,phase1"

# フェーズ2: コア機能
gh issue create --repo $REPO --title "🛠️ 工具管理機能" \
  --body "- 工具一覧画面
- 工具登録/編集/削除
- カテゴリ管理
- カスタムフィールド" \
  --label "core,phase2"

gh issue create --repo $REPO --title "📱 QRコード機能" \
  --body "- QRコード生成
- QRスキャナー実装
- 貸出/返却処理" \
  --label "core,phase2"

gh issue create --repo $REPO --title "👥 組織管理" \
  --body "- 組織作成/編集
- ユーザー招待
- 権限管理
- 拠点管理" \
  --label "admin,phase2"

# フェーズ3: 契約管理・請求機能
gh issue create --repo $REPO --title "📋 契約管理システム" \
  --body "- 契約書管理機能
- 契約期間管理
- 顧客情報管理
- 更新通知機能" \
  --label "billing,phase3"

gh issue create --repo $REPO --title "📄 請求書発行システム" \
  --body "- 請求書自動生成
- PDF出力機能
- メール送信機能
- 請求ステータス管理" \
  --label "billing,phase3"

gh issue create --repo $REPO --title "💰 入金管理機能" \
  --body "- 入金記録機能
- 銀行振込照合
- アカウント有効化
- 入金履歴管理" \
  --label "billing,phase3"

gh issue create --repo $REPO --title "🔐 アカウント制御機能" \
  --body "- 利用制限管理
- 契約期限チェック
- プラン制限適用
- アカウント停止/再開" \
  --label "admin,phase3"

# フェーズ4: 高度な機能
gh issue create --repo $REPO --title "📊 ダッシュボード" \
  --body "- 在庫サマリー
- 貸出状況
- アラート表示
- グラフ/チャート" \
  --label "ui,phase4"

gh issue create --repo $REPO --title "📈 レポート機能" \
  --body "- 売上管理レポート
- 契約状況レポート
- 入金状況一覧
- CSV/PDF出力" \
  --label "admin,phase4"

gh issue create --repo $REPO --title "🔔 通知システム" \
  --body "- メール通知
- アプリ内通知
- 返却期限アラート
- 在庫不足アラート
- 請求関連通知" \
  --label "notification,phase4"
```

### 3. プロジェクトビューの操作

```bash
# プロジェクトリストを表示
gh project list --owner next-location

# プロジェクトの詳細を表示
gh project view PROJECT_NUMBER --owner next-location

# Issueをプロジェクトに追加
gh project item-add PROJECT_NUMBER --owner next-location --url ISSUE_URL

# Issueのステータスを更新
gh project item-edit --id ITEM_ID --field-id STATUS_FIELD_ID --project-id PROJECT_NUMBER
```

### 4. 進捗確認

```bash
# オープンなIssueを表示
gh issue list --repo next-location/FieldToolManager

# 特定のラベルのIssueを表示
gh issue list --label "phase1"

# 自分にアサインされたIssueを表示
gh issue list --assignee @me

# プロジェクトの進捗状況を確認
gh project view PROJECT_NUMBER --owner next-location --format json | jq '.items[] | {title: .content.title, status: .fieldValues.status}'
```

### 5. マイルストーンの設定

```bash
# マイルストーンを作成
gh api repos/next-location/FieldToolManager/milestones \
  --method POST \
  -f title="Phase 1: MVP" \
  -f description="基本的な工具管理機能の実装" \
  -f due_on="2025-02-28T23:59:59Z"

gh api repos/next-location/FieldToolManager/milestones \
  --method POST \
  -f title="Phase 2: Core Features" \
  -f description="QRコード、組織管理などのコア機能" \
  -f due_on="2025-04-30T23:59:59Z"

gh api repos/next-location/FieldToolManager/milestones \
  --method POST \
  -f title="Phase 3: Contract Management" \
  -f description="契約管理、請求書発行、入金管理機能" \
  -f due_on="2025-05-31T23:59:59Z"

gh api repos/next-location/FieldToolManager/milestones \
  --method POST \
  -f title="Phase 4: Advanced" \
  -f description="ダッシュボード、通知、レポート機能" \
  -f due_on="2025-06-30T23:59:59Z"

gh api repos/next-location/FieldToolManager/milestones \
  --method POST \
  -f title="Phase 5: Security & Optimization" \
  -f description="セキュリティ強化とパフォーマンス最適化" \
  -f due_on="2025-07-15T23:59:59Z"
```

## 開発タスクリスト（SPECIFICATION_SAAS_FINAL.mdベース）

### Phase 1: MVP（2-3週間）
- [ ] Next.js初期セットアップ
- [ ] Supabaseプロジェクト作成
- [ ] データベーススキーマ作成（契約管理テーブル含む）
- [ ] RLS（Row Level Security）設定
- [ ] 認証システム実装
- [ ] 基本的な工具CRUD
- [ ] 組織マスタ管理

### Phase 2: コア機能（3-4週間）
- [ ] QRコード生成・スキャン（UUID使用）
- [ ] 貸出/返却機能
- [ ] ユーザー管理（権限制御）
- [ ] 拠点（倉庫・現場）管理
- [ ] カスタムフィールド実装
- [ ] 検索・フィルタリング
- [ ] 監査ログ基盤

### Phase 3: 契約・請求管理（3-4週間）
- [ ] 契約管理システム
- [ ] 請求書発行機能
- [ ] 入金管理機能
- [ ] アカウント制御（利用制限）
- [ ] 請求関連レポート
- [ ] 管理者向けダッシュボード

### Phase 4: 高度な機能（3-4週間）
- [ ] 顧客向けダッシュボード
- [ ] 通知システム（請求・在庫）
- [ ] レポート機能（売上・契約）
- [ ] PWA対応
- [ ] CSV/PDF出力機能

### Phase 5: セキュリティ・最適化（2週間）
- [ ] レート制限実装（Upstash Redis）
- [ ] セキュリティテスト
- [ ] パフォーマンス最適化
- [ ] E2Eテスト
- [ ] ドキュメント作成

### 将来の追加開発（顧客30社到達後）
- [ ] Stripe決済統合
- [ ] セルフサービス課金
- [ ] 自動課金・サブスクリプション
- [ ] 決済リトライ機能
※ 詳細は docs/ADDITIONAL_FEATURES_SPEC.md 参照

## GitHubラベルの設定

```bash
# ラベルを作成
gh label create "phase1" --color "0E8A16" --description "Phase 1: MVP"
gh label create "phase2" --color "1D76DB" --description "Phase 2: Core Features"
gh label create "phase3" --color "5319E7" --description "Phase 3: Contract Management"
gh label create "phase4" --color "B60205" --description "Phase 4: Advanced Features"
gh label create "phase5" --color "FFA500" --description "Phase 5: Security & Optimization"
gh label create "setup" --color "F9D0C4" --description "Initial Setup"
gh label create "frontend" --color "C2E0C6" --description "Frontend Development"
gh label create "backend" --color "FEF2C0" --description "Backend Development"
gh label create "auth" --color "FBCA04" --description "Authentication"
gh label create "core" --color "0052CC" --description "Core Feature"
gh label create "ui" --color "7057FF" --description "UI/UX"
gh label create "billing" --color "008672" --description "Billing/Payment/Contract"
gh label create "admin" --color "FF69B4" --description "Admin Function"
gh label create "security" --color "D93F0B" --description "Security"
gh label create "notification" --color "9ACD32" --description "Notification System"
gh label create "bug" --color "B60205" --description "Bug Fix"
gh label create "enhancement" --color "84B6EB" --description "Enhancement"
```

## 使用例

```bash
# 今日のタスクを確認
gh issue list --assignee @me --label "phase1"

# タスクを開始
gh issue comment ISSUE_NUMBER --body "作業開始します 🚀"

# 進捗を更新
gh issue comment ISSUE_NUMBER --body "- ✅ データベース設計完了\n- 🔧 API実装中（50%）"

# PRを作成してIssueと紐付け
gh pr create --title "feat: 工具管理CRUD実装" \
  --body "Closes #ISSUE_NUMBER\n\n## 変更内容\n- 工具一覧API\n- 工具登録/編集/削除API"

# タスクを完了
gh issue close ISSUE_NUMBER --comment "実装完了しました ✅"
```

## 自動化（GitHub Actions）

`.github/workflows/project-automation.yml`:

```yaml
name: Project Automation

on:
  issues:
    types: [opened, closed]
  pull_request:
    types: [opened, closed]

jobs:
  project-automation:
    runs-on: ubuntu-latest
    steps:
      - name: Move new issues to Backlog
        if: github.event_name == 'issues' && github.event.action == 'opened'
        uses: actions/add-to-project@v0.5.0
        with:
          project-url: https://github.com/orgs/next-location/projects/YOUR_PROJECT_NUMBER
          github-token: ${{ secrets.GITHUB_TOKEN }}

      - name: Move closed issues to Done
        if: github.event_name == 'issues' && github.event.action == 'closed'
        uses: actions/github-script@v7
        with:
          script: |
            // Move to Done column
```

## 日次進捗レポート

```bash
#!/bin/bash
# daily-report.sh

echo "📊 本日の進捗レポート（$(date +%Y-%m-%d)）"
echo "================================"

echo "\n✅ 完了したタスク:"
gh issue list --state closed --search "closed:>$(date -d yesterday +%Y-%m-%d)" --json title,number --jq '.[] | "- #\(.number) \(.title)"'

echo "\n🔧 進行中のタスク:"
gh issue list --assignee @me --json title,number,labels --jq '.[] | "- #\(.number) \(.title) [\(.labels[].name)]"'

echo "\n📝 次のタスク:"
gh issue list --label "ready" --limit 5 --json title,number --jq '.[] | "- #\(.number) \(.title)"'

echo "\n📈 全体の進捗:"
TOTAL=$(gh issue list --json number | jq '. | length')
CLOSED=$(gh issue list --state closed --json number | jq '. | length')
PROGRESS=$((CLOSED * 100 / TOTAL))
echo "完了: $CLOSED / $TOTAL ($PROGRESS%)"
```