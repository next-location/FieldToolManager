#!/bin/bash

# GitHub Projects タスク作成スクリプト
# Purpose: 開発タスクをIssueとして作成し、Projectに追加

REPO="next-location/FieldToolManager"

echo "================================================"
echo "GitHub Projects タスク作成"
echo "Repository: $REPO"
echo "================================================"
echo ""

# 作成するタスクを選択
echo "作成するタスクフェーズを選択してください:"
echo "1) Phase 1: MVP (基本機能)"
echo "2) Phase 2: Core Features (コア機能)"
echo "3) Phase 3: Contract Management (契約・請求管理)"
echo "4) Phase 4: Advanced Features (高度な機能)"
echo "5) Phase 5: Security & Optimization (セキュリティ・最適化)"
echo "6) すべてのフェーズ"
echo ""
read -p "選択 (1-6): " PHASE_CHOICE

create_phase1_tasks() {
    echo "Phase 1: MVP タスクを作成中..."

    gh issue create --repo $REPO --title "📦 Next.js初期セットアップ" \
        --body "## タスク内容
- Next.js 14 App Router の初期設定
- TypeScript設定
- Tailwind CSS設定
- ESLint/Prettier設定

## 完了条件
- [ ] Next.jsプロジェクトが正常に起動する
- [ ] TypeScriptのビルドが通る
- [ ] Tailwind CSSが適用される

## 参考資料
- docs/SPECIFICATION_SAAS_FINAL.md" \
        --label "setup,phase1" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "🗄️ Supabaseセットアップ" \
        --body "## タスク内容
- Supabaseプロジェクト作成
- 環境変数設定
- データベーススキーマ作成（契約管理テーブル含む）
- Row Level Security (RLS) 設定

## 完了条件
- [ ] Supabaseプロジェクトが作成される
- [ ] 環境変数が設定される
- [ ] スキーマが適用される
- [ ] RLSポリシーが有効化される

## 参考資料
- docs/SPECIFICATION_SAAS_FINAL.md のセクション5（データモデル）" \
        --label "backend,phase1" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "🔐 認証システム実装" \
        --body "## タスク内容
- Supabase Auth設定
- ログイン/ログアウト画面
- パスワードリセット機能
- セッション管理
- マルチテナント対応（organization_id）

## 完了条件
- [ ] ログイン機能が動作する
- [ ] セッション管理が実装される
- [ ] 組織ごとのデータ分離が確認される" \
        --label "auth,phase1" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "🏢 組織マスタ管理" \
        --body "## タスク内容
- Organizationテーブル実装
- サブドメイン管理
- プラン管理（basic/premium/enterprise）
- 支払い方法設定（invoice/bank_transfer）

## 完了条件
- [ ] 組織の作成・編集ができる
- [ ] サブドメインでアクセスできる
- [ ] プラン制限が適用される" \
        --label "admin,phase1" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "🔧 基本的な工具CRUD" \
        --body "## タスク内容
- Toolテーブル実装
- 工具登録・編集・削除
- UUID主キー実装
- tool_code（表示用ID）管理
- 論理削除（soft delete）

## 完了条件
- [ ] 工具の登録ができる
- [ ] UUIDが生成される
- [ ] tool_codeが表示される
- [ ] 削除してもデータが残る" \
        --label "core,phase1" || echo "スキップ: 既に存在"
}

create_phase2_tasks() {
    echo "Phase 2: Core Features タスクを作成中..."

    gh issue create --repo $REPO --title "📱 QRコード生成・スキャン" \
        --body "## タスク内容
- UUID ベースのQRコード生成
- QRコードスキャナー実装（html5-qrcode）
- 手動ID入力フォールバック
- セキュリティ対策（UUID使用）

## 完了条件
- [ ] QRコードが生成される
- [ ] スマホでスキャンできる
- [ ] UUIDで他社データにアクセスできない" \
        --label "core,phase2" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "📦 貸出/返却機能" \
        --body "## タスク内容
- ToolMovementテーブル実装
- 貸出処理（checkout）
- 返却処理（checkin）
- 移動履歴記録
- 在庫数自動更新

## 完了条件
- [ ] QRスキャンで貸出ができる
- [ ] 返却処理ができる
- [ ] 履歴が記録される
- [ ] 在庫数が正しく更新される" \
        --label "core,phase2" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "👥 ユーザー管理（権限制御）" \
        --body "## タスク内容
- ユーザー招待機能
- 権限管理（admin/leader/staff）
- 権限に応じた画面制御
- ユーザー一覧・編集

## 完了条件
- [ ] ユーザーを招待できる
- [ ] 権限が正しく設定される
- [ ] 権限に応じて機能が制限される" \
        --label "admin,phase2" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "🏗️ 拠点（倉庫・現場）管理" \
        --body "## タスク内容
- Locationテーブル実装
- 倉庫/現場の登録
- 所在地管理
- アクティブ/非アクティブ管理

## 完了条件
- [ ] 拠点を登録できる
- [ ] 工具の所在地を設定できる
- [ ] 拠点間の移動ができる" \
        --label "admin,phase2" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "🎨 カスタムフィールド実装" \
        --body "## タスク内容
- CustomFieldDefinitionsテーブル実装
- JSONBでのデータ保存
- 業種別フィールド対応
- UI動的生成

## 完了条件
- [ ] カスタムフィールドを定義できる
- [ ] 工具にカスタムデータを保存できる
- [ ] 業種ごとの要件に対応できる" \
        --label "core,phase2" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "📝 監査ログ基盤" \
        --body "## タスク内容
- AuditLogテーブル実装
- 重要操作のログ記録
- 変更前後の値記録
- IPアドレス/User-Agent記録

## 完了条件
- [ ] CRUDがログに記録される
- [ ] 変更履歴が追跡できる
- [ ] 管理者アクセスがログに残る" \
        --label "security,phase2" || echo "スキップ: 既に存在"
}

create_phase3_tasks() {
    echo "Phase 3: Contract Management タスクを作成中..."

    gh issue create --repo $REPO --title "📋 契約管理システム" \
        --body "## タスク内容
- Contractテーブル実装
- 契約書管理機能
- 契約期間管理
- 顧客情報管理
- 更新通知機能

## 完了条件
- [ ] 契約情報を登録できる
- [ ] 契約期限を管理できる
- [ ] 更新通知が送信される" \
        --label "billing,phase3" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "📄 請求書発行システム" \
        --body "## タスク内容
- Invoiceテーブル実装
- 請求書自動生成
- PDF出力機能
- メール送信機能
- 請求ステータス管理

## 完了条件
- [ ] 請求書が生成される
- [ ] PDFで出力できる
- [ ] メールで送信できる
- [ ] ステータスを管理できる" \
        --label "billing,phase3" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "💰 入金管理機能" \
        --body "## タスク内容
- PaymentRecordテーブル実装
- 入金記録機能
- 銀行振込照合
- アカウント有効化
- 入金履歴管理

## 完了条件
- [ ] 入金を記録できる
- [ ] 請求書と照合できる
- [ ] アカウントが有効化される
- [ ] 履歴を確認できる" \
        --label "billing,phase3" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "🔐 アカウント制御機能" \
        --body "## タスク内容
- 利用制限管理
- 契約期限チェック
- プラン制限適用
- アカウント停止/再開
- 支払い遅延時の処理

## 完了条件
- [ ] 未払い時にアカウント停止される
- [ ] プラン制限が適用される
- [ ] 入金後に再開される" \
        --label "admin,phase3" || echo "スキップ: 既に存在"
}

create_phase4_tasks() {
    echo "Phase 4: Advanced Features タスクを作成中..."

    gh issue create --repo $REPO --title "📊 顧客向けダッシュボード" \
        --body "## タスク内容
- 在庫サマリー表示
- 貸出状況表示
- アラート表示
- グラフ/チャート実装

## 完了条件
- [ ] リアルタイムで在庫が表示される
- [ ] グラフが表示される
- [ ] アラートが機能する" \
        --label "ui,phase4" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "📈 レポート機能" \
        --body "## タスク内容
- 売上管理レポート
- 契約状況レポート
- 入金状況一覧
- CSV/PDF出力

## 完了条件
- [ ] 各種レポートが生成される
- [ ] CSV/PDFで出力できる
- [ ] 期間指定ができる" \
        --label "admin,phase4" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "🔔 通知システム" \
        --body "## タスク内容
- メール通知実装
- アプリ内通知
- 返却期限アラート
- 在庫不足アラート
- 請求関連通知

## 完了条件
- [ ] 各種通知が送信される
- [ ] メールが届く
- [ ] アプリ内で確認できる" \
        --label "notification,phase4" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "📱 PWA対応" \
        --body "## タスク内容
- Service Worker実装
- オフライン対応
- インストール可能化
- プッシュ通知

## 完了条件
- [ ] オフラインで動作する
- [ ] ホーム画面に追加できる
- [ ] プッシュ通知が届く" \
        --label "frontend,phase4" || echo "スキップ: 既に存在"
}

create_phase5_tasks() {
    echo "Phase 5: Security & Optimization タスクを作成中..."

    gh issue create --repo $REPO --title "🚦 レート制限実装" \
        --body "## タスク内容
- Upstash Redis設定
- API レート制限
- スキャンレート制限
- ログインレート制限

## 完了条件
- [ ] レート制限が機能する
- [ ] 攻撃を防げる
- [ ] エラーメッセージが表示される" \
        --label "security,phase5" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "🔒 セキュリティテスト" \
        --body "## タスク内容
- ペネトレーションテスト
- SQLインジェクション対策確認
- XSS対策確認
- CSRF対策確認

## 完了条件
- [ ] セキュリティ脆弱性がない
- [ ] OWASPガイドラインに準拠" \
        --label "security,phase5" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "⚡ パフォーマンス最適化" \
        --body "## タスク内容
- データベースインデックス最適化
- クエリ最適化
- キャッシュ実装
- 画像最適化

## 完了条件
- [ ] Lighthouseスコア90以上
- [ ] 応答時間1秒以内
- [ ] スムーズなUX" \
        --label "optimization,phase5" || echo "スキップ: 既に存在"

    gh issue create --repo $REPO --title "🧪 E2Eテスト実装" \
        --body "## タスク内容
- Playwright設定
- 主要フローのテスト作成
- CI/CD統合
- テストカバレッジ80%以上

## 完了条件
- [ ] E2Eテストが実行される
- [ ] CIで自動実行される
- [ ] カバレッジ80%以上" \
        --label "testing,phase5" || echo "スキップ: 既に存在"
}

# フェーズに応じてタスクを作成
case $PHASE_CHOICE in
    1)
        create_phase1_tasks
        ;;
    2)
        create_phase2_tasks
        ;;
    3)
        create_phase3_tasks
        ;;
    4)
        create_phase4_tasks
        ;;
    5)
        create_phase5_tasks
        ;;
    6)
        echo "すべてのフェーズのタスクを作成中..."
        create_phase1_tasks
        echo ""
        create_phase2_tasks
        echo ""
        create_phase3_tasks
        echo ""
        create_phase4_tasks
        echo ""
        create_phase5_tasks
        ;;
    *)
        echo "無効な選択です"
        exit 1
        ;;
esac

echo ""
echo "================================================"
echo "タスク作成完了"
echo "================================================"
echo ""
echo "作成されたIssueを確認:"
echo "gh issue list --repo $REPO"
echo ""
echo "Projectに追加するには:"
echo "1. project権限のあるトークンが必要です"
echo "2. scripts/setup-github-auth.sh を実行してください"