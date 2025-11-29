#!/bin/bash

# Field Tool Manager - Initial Issues Creation Script
# Based on SPECIFICATION_SAAS_FINAL.md

REPO="next-location/FieldToolManager"

echo "📝 Creating issues for Field Tool Manager development..."

# Phase 1: MVP（基本機能）
echo "Creating Phase 1 issues..."

gh issue create --repo $REPO --title "📦 Next.js初期セットアップ" \
  --body "## タスク
- Next.js 14 App Routerでプロジェクト初期化
- TypeScript設定
- Tailwind CSS設定
- ESLint/Prettier設定
- 環境変数設定（.env.local.example）

## 完了条件
- npm run dev で起動確認
- TypeScriptエラーなし
- Lintエラーなし" \
  --label "setup,phase1"

gh issue create --repo $REPO --title "🗄️ Supabaseプロジェクトセットアップ" \
  --body "## タスク
- Supabaseプロジェクト作成
- 環境変数設定（NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY）
- @supabase/supabase-jsインストール
- Supabaseクライアント初期化
- 型定義生成設定

## 完了条件
- Supabaseクライアントが正常に初期化される
- 型定義が生成される" \
  --label "backend,phase1"

gh issue create --repo $REPO --title "🏗️ データベーススキーマ作成" \
  --body "## テーブル作成
- organizations（組織）
- users（ユーザー）
- locations（拠点）
- tools（工具）- UUID主キー、tool_code、custom_fields等
- categories（カテゴリ）
- checkouts（貸出記録）
- audit_logs（監査ログ）

## 重要
- UUIDをプライマリキーとして使用
- deleted_atによるソフトデリート実装
- organization_idによるマルチテナント対応

## 参照
docs/SPECIFICATION_SAAS_FINAL.md のデータモデル" \
  --label "backend,phase1"

gh issue create --repo $REPO --title "🔐 Row Level Security（RLS）設定" \
  --body "## タスク
- 各テーブルにRLSポリシー設定
- organization_idベースのデータ分離
- deleted_atを考慮したポリシー
- 権限レベル（admin, manager, staff）の実装

## セキュリティ要件
- 他組織のデータにアクセスできないことを確認
- 削除済みデータが表示されないことを確認" \
  --label "security,phase1"

gh issue create --repo $REPO --title "🔑 認証システム実装" \
  --body "## 実装内容
- Supabase Auth設定
- ログイン画面（メール/パスワード）
- サインアップ画面（組織作成フロー）
- パスワードリセット機能
- ログアウト機能
- 認証ミドルウェア

## UI要件
- レスポンシブデザイン
- エラーハンドリング
- ローディング状態" \
  --label "auth,phase1"

# Phase 2: コア機能
echo "Creating Phase 2 issues..."

gh issue create --repo $REPO --title "🛠️ 工具管理CRUD実装" \
  --body "## 実装内容
- 工具一覧画面（テーブル/カード表示切替）
- 工具登録フォーム
- 工具編集フォーム
- 工具削除（ソフトデリート）
- カスタムフィールド対応

## API
- GET /api/tools
- POST /api/tools
- PUT /api/tools/[id]
- DELETE /api/tools/[id]

## 重要機能
- management_type（individual/quantity）対応
- 消耗品の数量管理" \
  --label "core,phase2"

gh issue create --repo $REPO --title "📱 QRコード生成機能" \
  --body "## 実装内容
- 工具登録時にQRコード自動生成
- QRコードにはUUID（セキュア）を埋め込む
- QRコード一括印刷機能
- QRコードダウンロード機能

## 技術
- qrcodeライブラリ使用
- SVG/PNG出力対応" \
  --label "core,phase2"

gh issue create --repo $REPO --title "📷 QRスキャナー実装" \
  --body "## 実装内容
- カメラアクセス許可
- QRコードスキャン（html5-qrcode）
- 手動入力フォールバック（tool_code）
- スキャン後の貸出/返却処理

## モバイル対応
- PWA対応
- オフライン対応検討" \
  --label "core,phase2"

gh issue create --repo $REPO --title "↔️ 貸出/返却機能" \
  --body "## 実装内容
- 貸出処理（checkout）
- 返却処理（return）
- 貸出履歴表示
- 返却期限管理
- 異常検知（GPSなし版）

## ビジネスロジック
- 重複貸出防止
- 返却期限超過アラート
- 貸出承認フロー（高額工具）" \
  --label "core,phase2"

gh issue create --repo $REPO --title "👥 組織・ユーザー管理" \
  --body "## 実装内容
- 組織設定画面
- ユーザー招待機能
- 権限管理（admin, manager, staff）
- ユーザー一覧/編集/削除
- 組織のカスタム設定

## セキュリティ
- 招待メール送信
- 権限に基づくアクセス制御" \
  --label "admin,phase2"

gh issue create --repo $REPO --title "🏢 拠点管理" \
  --body "## 実装内容
- 拠点（倉庫/現場）登録
- 拠点一覧/編集/削除
- 工具の所在地管理
- 拠点間の工具移動

## タイプ
- warehouse（倉庫）
- site（現場）
- office（事務所）" \
  --label "core,phase2"

# Phase 3: 高度な機能
echo "Creating Phase 3 issues..."

gh issue create --repo $REPO --title "📊 ダッシュボード実装" \
  --body "## 表示内容
- 在庫サマリー（総数、貸出中、倉庫在庫）
- 貸出状況グラフ
- 返却期限アラート
- 最近の活動
- 在庫不足アラート

## 技術
- Chart.js or Recharts
- リアルタイム更新（Supabase Realtime）" \
  --label "ui,phase3"

gh issue create --repo $REPO --title "💳 Stripe課金システム" \
  --body "## 実装内容
- Stripe Customer作成
- サブスクリプション管理
- Webhook処理
- 支払い履歴
- プラン変更/キャンセル

## プラン
- Starter: 10ユーザーまで
- Business: 50ユーザーまで
- Enterprise: 無制限" \
  --label "billing,phase3"

gh issue create --repo $REPO --title "🔔 通知システム" \
  --body "## 通知種類
- 返却期限リマインダー
- 在庫不足アラート
- 異常検知アラート
- 承認リクエスト

## 実装
- メール通知（SendGrid/Resend）
- アプリ内通知
- 通知設定画面" \
  --label "notification,phase3"

gh issue create --repo $REPO --title "📝 監査ログ実装" \
  --body "## 記録内容
- データ変更履歴
- ログイン履歴
- 管理操作履歴
- 異常アクセス

## 機能
- 監査ログ閲覧画面
- フィルタリング/検索
- CSV出力" \
  --label "security,phase3"

gh issue create --repo $REPO --title "🚦 レート制限実装" \
  --body "## 実装内容
- API レート制限（Upstash Redis）
- スキャンレート制限
- ログインレート制限

## 設定
- 100リクエスト/分（通常API）
- 10リクエスト/分（スキャン）
- 5回/10分（ログイン失敗）" \
  --label "security,phase3"

# Phase 4: 最適化・テスト
echo "Creating Phase 4 issues..."

gh issue create --repo $REPO --title "⚡ パフォーマンス最適化" \
  --body "## 最適化項目
- データベースインデックス
- API レスポンスキャッシュ
- 画像最適化
- バンドルサイズ削減
- 遅延ローディング

## 目標
- Lighthouse スコア 90以上
- FCP < 2秒
- TTI < 3.5秒" \
  --label "optimization,phase4"

gh issue create --repo $REPO --title "🧪 E2Eテスト実装" \
  --body "## テストシナリオ
- ユーザー登録〜組織作成
- 工具登録〜QR生成
- 貸出〜返却フロー
- 権限によるアクセス制御
- 課金フロー

## 技術
- Playwright or Cypress
- CI/CD統合" \
  --label "testing,phase4"

gh issue create --repo $REPO --title "📚 ドキュメント作成" \
  --body "## ドキュメント
- README.md（セットアップ手順）
- API仕様書
- デプロイメントガイド
- ユーザーマニュアル
- 管理者マニュアル

## 形式
- Markdown
- 画面キャプチャ付き" \
  --label "documentation,phase4"

gh issue create --repo $REPO --title "🚀 本番環境デプロイ" \
  --body "## タスク
- Vercel プロジェクト設定
- 環境変数設定
- カスタムドメイン設定
- SSL証明書
- モニタリング設定

## チェックリスト
- [ ] 本番用Supabaseプロジェクト
- [ ] Stripe本番環境
- [ ] Sendgrid/Resend設定
- [ ] Sentry設定" \
  --label "deployment,phase4"

echo "✅ All issues created successfully!"
echo "Visit https://github.com/$REPO/issues to view them"