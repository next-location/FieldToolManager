#!/bin/bash

# 在庫トラッカープロジェクト用 - 優先順位付きIssue作成スクリプト
# SPECIFICATION_SAAS_FINAL.mdに基づいた開発タスク

REPO="next-location/FieldToolManager"

echo "📝 在庫トラッカープロジェクト用のIssueを作成中..."
echo "================================================"

# ===============================
# Phase 1: MVP（最優先・2-3週間）
# ===============================
echo ""
echo "🎯 Phase 1: MVP Issues (最優先タスク)..."

gh issue create --repo $REPO \
  --title "【P1-1】📦 Next.js + TypeScript + Tailwind CSS初期セットアップ" \
  --body "## 概要
プロジェクトの基盤となる開発環境をセットアップします。

## タスク詳細
- [x] Next.js 14 App Router プロジェクト作成
- [ ] TypeScript設定（strict mode有効化）
- [ ] Tailwind CSS設定
- [ ] ESLint/Prettier設定
- [ ] 環境変数設定ファイル作成（.env.local.example）
- [ ] 基本的なディレクトリ構造作成

## 完了条件
- \`npm run dev\` でエラーなく起動
- TypeScriptのstrictモードでエラーなし
- Tailwindクラスが適用される

## 参考資料
- docs/SPECIFICATION_SAAS_FINAL.md" \
  --label "Phase 1: MVP,frontend,⚡ high"

gh issue create --repo $REPO \
  --title "【P1-2】🗄️ Supabaseプロジェクト作成と接続設定" \
  --body "## 概要
バックエンドとなるSupabaseプロジェクトを作成し、Next.jsと接続します。

## タスク詳細
- [ ] Supabaseプロジェクト作成
- [ ] 環境変数設定（NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY）
- [ ] @supabase/supabase-js インストール
- [ ] Supabaseクライアントの初期化（lib/supabase.ts）
- [ ] 型定義生成設定（supabase gen types）

## 完了条件
- Supabaseクライアントが正常に初期化される
- TypeScriptの型定義が生成される" \
  --label "Phase 1: MVP,backend,⚡ high"

gh issue create --repo $REPO \
  --title "【P1-3】🏗️ マルチテナントデータベーススキーマ構築" \
  --body "## 概要
SaaS型マルチテナントアーキテクチャに対応したデータベーススキーマを構築します。

## 実装テーブル
### コアテーブル
- [ ] organizations（組織）
- [ ] users（ユーザー）- organization_id含む
- [ ] locations（拠点：倉庫・現場）
- [ ] categories（工具カテゴリ）

### 工具管理テーブル
- [ ] tools（工具）
  - UUID主キー（QRコード用）
  - tool_code（表示用ID）
  - management_type（individual/quantity）
  - custom_fields（JSONB）
  - deleted_at（ソフトデリート）
- [ ] checkouts（貸出記録）
- [ ] checkout_histories（貸出履歴）

### セキュリティテーブル
- [ ] audit_logs（監査ログ）
- [ ] rate_limit_logs（レート制限ログ）

## 重要ポイント
- **UUID**を主キーとして使用（セキュリティ向上）
- **organization_id**による完全なデータ分離
- **deleted_at**によるソフトデリート実装
- **custom_fields**による拡張性確保

## 参考
docs/SPECIFICATION_SAAS_FINAL.md のデータモデルセクション" \
  --label "Phase 1: MVP,database,🔥 urgent"

gh issue create --repo $REPO \
  --title "【P1-4】🔐 Row Level Security (RLS) 設定" \
  --body "## 概要
マルチテナントSaaSのセキュリティの要となるRLSポリシーを実装します。

## 実装内容
### 基本ポリシー
- [ ] organization_idベースのデータ分離
- [ ] deleted_atを考慮したポリシー（削除済みデータ非表示）
- [ ] ユーザー権限レベル（admin, manager, staff）の実装

### テーブル別ポリシー
- [ ] organizations: 自組織のみアクセス可
- [ ] users: 同一組織内のユーザーのみ閲覧可
- [ ] tools: 自組織の工具のみアクセス可
- [ ] checkouts: 自組織の貸出記録のみアクセス可

## テスト項目
- [ ] 他組織のデータにアクセスできないことを確認
- [ ] 削除済みデータが表示されないことを確認
- [ ] 権限レベルごとのアクセス制御が機能することを確認

## セキュリティ要件
- 完全なテナント間データ分離
- SQLインジェクション対策
- 適切なインデックス設定" \
  --label "Phase 1: MVP,security,🔥 urgent"

gh issue create --repo $REPO \
  --title "【P1-5】🔑 認証システム実装（Supabase Auth）" \
  --body "## 概要
Supabase Authを使用した認証システムを実装します。

## 実装画面
- [ ] ログイン画面（/login）
- [ ] サインアップ画面（/signup）- 組織作成フロー含む
- [ ] パスワードリセット画面（/reset-password）
- [ ] プロフィール編集画面（/profile）

## 機能要件
- [ ] メール/パスワード認証
- [ ] セッション管理
- [ ] 認証ミドルウェア（middleware.ts）
- [ ] 保護されたルートの設定
- [ ] ログアウト機能

## UI要件
- [ ] レスポンシブデザイン（モバイルファースト）
- [ ] ローディング状態の表示
- [ ] エラーハンドリング（日本語エラーメッセージ）
- [ ] 成功時のフィードバック

## 組織作成フロー
1. ユーザー登録
2. 組織情報入力
3. 初期設定（拠点登録など）
4. ダッシュボードへリダイレクト" \
  --label "Phase 1: MVP,auth,⚡ high"

# ===============================
# Phase 2: コア機能（3-4週間）
# ===============================
echo ""
echo "🔧 Phase 2: Core Features Issues..."

gh issue create --repo $REPO \
  --title "【P2-1】🛠️ 工具管理CRUD実装" \
  --body "## 概要
工具の登録・編集・削除・一覧表示機能を実装します。

## 実装内容
### 画面
- [ ] 工具一覧画面（/tools）
  - テーブル表示/カード表示切り替え
  - ページネーション
  - 検索・フィルタリング
- [ ] 工具登録画面（/tools/new）
- [ ] 工具編集画面（/tools/[id]/edit）
- [ ] 工具詳細画面（/tools/[id]）

### API Routes
- [ ] GET /api/tools - 一覧取得
- [ ] POST /api/tools - 新規登録
- [ ] PUT /api/tools/[id] - 更新
- [ ] DELETE /api/tools/[id] - ソフトデリート

### 特殊機能
- [ ] management_type対応（個別管理/数量管理）
- [ ] カスタムフィールド対応
- [ ] 画像アップロード（Supabase Storage）

## データ構造
- 個別管理: QRコード付き工具
- 数量管理: 消耗品・資材" \
  --label "Phase 2: Core,core,⚡ high"

gh issue create --repo $REPO \
  --title "【P2-2】📱 QRコード生成・印刷機能" \
  --body "## 概要
工具登録時にセキュアなQRコードを生成し、印刷可能にします。

## 実装内容
- [ ] UUID埋め込みQRコード生成（セキュリティ重視）
- [ ] QRコードプレビュー表示
- [ ] 一括QRコード生成（複数工具）
- [ ] 印刷用レイアウト（A4用紙）
- [ ] PDF出力機能
- [ ] QRコードダウンロード（PNG/SVG）

## 技術要件
- qrcodeライブラリ使用
- UUID v4使用（推測不可能なID）
- tool_codeも併記（人間が読める形式）

## QRコード仕様
- サイズ: 3cm x 3cm（印刷時）
- エラー訂正レベル: M（15%）
- 内容: https://[subdomain].tool-manager.com/scan?id=[UUID]" \
  --label "Phase 2: Core,qr,📍 medium"

gh issue create --repo $REPO \
  --title "【P2-3】📷 QRスキャナー実装（PWA対応）" \
  --body "## 概要
スマートフォンでQRコードをスキャンして工具の貸出・返却を行う機能を実装します。

## 実装内容
### スキャナー機能
- [ ] カメラアクセス許可リクエスト
- [ ] QRコードスキャン（html5-qrcode）
- [ ] 手動入力フォールバック（tool_code入力）
- [ ] スキャン履歴表示

### 貸出・返却フロー
- [ ] スキャン → 工具情報表示
- [ ] 貸出/返却ボタン
- [ ] 確認ダイアログ
- [ ] 完了通知

### PWA対応
- [ ] Service Worker実装
- [ ] オフライン対応
- [ ] インストール可能
- [ ] プッシュ通知対応（将来）

## モバイルUX
- 大きなボタン（指で押しやすい）
- 振動フィードバック
- 音声フィードバック（オプション）" \
  --label "Phase 2: Core,qr,⚡ high"

gh issue create --repo $REPO \
  --title "【P2-4】↔️ 貸出・返却処理システム" \
  --body "## 概要
工具の貸出・返却を管理するコアビジネスロジックを実装します。

## 実装内容
### 貸出処理
- [ ] 貸出可能チェック（重複防止）
- [ ] 貸出記録作成
- [ ] 在庫数更新（数量管理の場合）
- [ ] 返却予定日設定

### 返却処理
- [ ] 返却記録作成
- [ ] 遅延チェック
- [ ] 在庫数更新
- [ ] 次の貸出可能状態へ

### ビジネスルール
- [ ] 高額工具の承認フロー（10万円以上）
- [ ] 返却期限超過アラート
- [ ] 異常検知（異常な時間帯、頻度）

### 履歴管理
- [ ] 貸出履歴表示
- [ ] 統計情報（利用頻度など）
- [ ] 監査ログ記録" \
  --label "Phase 2: Core,core,🔥 urgent"

gh issue create --repo $REPO \
  --title "【P2-5】👥 組織・ユーザー管理システム" \
  --body "## 概要
組織の設定とユーザー管理機能を実装します。

## 実装内容
### 組織管理
- [ ] 組織設定画面（/settings/organization）
- [ ] 組織情報編集
- [ ] サブドメイン設定
- [ ] カスタマイズ設定

### ユーザー管理
- [ ] ユーザー一覧（/settings/users）
- [ ] ユーザー招待機能（メール送信）
- [ ] 権限設定（admin/manager/staff）
- [ ] ユーザー無効化/削除

### 権限管理
- admin: すべての機能
- manager: 管理機能（ユーザー招待除く）
- staff: 基本機能のみ

## セキュリティ
- 招待トークンの有効期限
- 権限変更の監査ログ" \
  --label "Phase 2: Core,auth,📍 medium"

# ===============================
# Phase 3: 高度な機能（3-4週間）
# ===============================
echo ""
echo "🚀 Phase 3: Advanced Features Issues..."

gh issue create --repo $REPO \
  --title "【P3-1】📊 ダッシュボード実装" \
  --body "## 概要
管理者向けの統合ダッシュボードを実装します。

## 表示内容
### サマリーカード
- [ ] 総工具数
- [ ] 貸出中の工具数
- [ ] 本日の貸出/返却数
- [ ] アラート件数

### グラフ・チャート
- [ ] 貸出トレンド（折れ線グラフ）
- [ ] カテゴリ別在庫（円グラフ）
- [ ] 拠点別利用状況（棒グラフ）

### リスト
- [ ] 返却期限切れ工具
- [ ] 在庫不足アラート
- [ ] 最近の活動ログ

## 技術要件
- Chart.js or Recharts
- リアルタイム更新（Supabase Realtime）
- レスポンシブデザイン" \
  --label "Phase 3: Advanced,ui,📍 medium"

gh issue create --repo $REPO \
  --title "【P3-2】💳 Stripe課金システム実装" \
  --body "## 概要
SaaS型サブスクリプション課金をStripeで実装します。

## 実装内容
### Stripe設定
- [ ] Stripe Customer作成
- [ ] Product/Price設定
- [ ] Webhook エンドポイント

### 料金プラン
- Starter: 10ユーザーまで（月額9,800円）
- Business: 50ユーザーまで（月額29,800円）
- Enterprise: 無制限（要見積）

### 機能
- [ ] プラン選択画面
- [ ] 支払い方法登録
- [ ] サブスクリプション管理
- [ ] 請求履歴表示
- [ ] プラン変更/解約

### Webhook処理
- [ ] payment_intent.succeeded
- [ ] customer.subscription.updated
- [ ] customer.subscription.deleted" \
  --label "Phase 3: Advanced,billing,📍 medium"

gh issue create --repo $REPO \
  --title "【P3-3】🔔 通知システム実装" \
  --body "## 概要
各種アラートと通知機能を実装します。

## 通知種類
- [ ] 返却期限リマインダー（1日前、当日、超過）
- [ ] 在庫不足アラート
- [ ] 高額工具貸出承認リクエスト
- [ ] 異常検知アラート

## 実装方法
### メール通知
- [ ] SendGrid/Resend連携
- [ ] テンプレート作成
- [ ] 配信設定

### アプリ内通知
- [ ] 通知テーブル作成
- [ ] 未読管理
- [ ] 通知一覧画面

### 通知設定
- [ ] ユーザーごとの通知ON/OFF
- [ ] 通知タイミング設定" \
  --label "Phase 3: Advanced,enhancement,🔽 low"

# ===============================
# Phase 4: 最適化とリリース準備（2週間）
# ===============================
echo ""
echo "✨ Phase 4: Polish & Deployment Issues..."

gh issue create --repo $REPO \
  --title "【P4-1】🚦 セキュリティ強化（レート制限・監査ログ）" \
  --body "## 概要
本番環境に向けたセキュリティ強化を実施します。

## レート制限
- [ ] Upstash Redis設定
- [ ] API レート制限（100req/分）
- [ ] QRスキャン制限（10req/分）
- [ ] ログイン試行制限（5回/10分）

## 監査ログ
- [ ] すべてのCRUD操作記録
- [ ] ログイン/ログアウト記録
- [ ] 権限変更記録
- [ ] 異常アクセス記録

## その他
- [ ] SQLインジェクション対策確認
- [ ] XSS対策確認
- [ ] CSRF対策確認" \
  --label "Phase 4: Polish,security,⚡ high"

gh issue create --repo $REPO \
  --title "【P4-2】🚀 本番環境デプロイ" \
  --body "## 概要
Vercelへのデプロイと本番環境設定を行います。

## タスク
### インフラ設定
- [ ] Vercelプロジェクト作成
- [ ] 環境変数設定
- [ ] カスタムドメイン設定（*.tool-manager.com）
- [ ] SSL証明書設定

### 外部サービス
- [ ] Supabase本番プロジェクト
- [ ] Stripe本番環境
- [ ] SendGrid/Resend設定
- [ ] Sentry設定

### モニタリング
- [ ] エラー監視（Sentry）
- [ ] パフォーマンス監視
- [ ] アップタイム監視

## チェックリスト
- [ ] 環境変数すべて設定済み
- [ ] RLS有効化確認
- [ ] バックアップ設定
- [ ] ロールバック手順確認" \
  --label "Phase 4: Polish,🔥 urgent"

echo ""
echo "✅ 優先順位付きIssueの作成が完了しました！"
echo ""
echo "📊 作成されたIssue:"
echo "  Phase 1 (MVP): 5個"
echo "  Phase 2 (Core): 5個"
echo "  Phase 3 (Advanced): 3個"
echo "  Phase 4 (Polish): 2個"
echo ""
echo "👉 https://github.com/$REPO/issues で確認してください"
echo ""
echo "💡 次のステップ:"
echo "1. GitHubで「在庫トラッカー」プロジェクトを開く"
echo "2. 作成されたIssueをプロジェクトに追加"
echo "3. カラムに振り分け（Backlog → Ready → In Progress → Done）"