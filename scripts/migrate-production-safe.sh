#!/bin/bash

# 本番環境安全マイグレーション適用スクリプト
set -e

echo "🚨 本番環境へのマイグレーション適用を開始します..."
echo "⚠️  この操作は本番データベースに影響します"
echo ""

# 環境変数読み込み確認
if [ ! -f ".env.production" ]; then
  echo "❌ エラー: .env.production ファイルが見つかりません"
  exit 1
fi

# 環境変数読み込み
source .env.production

# DATABASE_URL確認
if [ -z "$DATABASE_URL" ]; then
  echo "❌ エラー: DATABASE_URL が設定されていません"
  exit 1
fi

echo "📊 環境情報:"
echo "   環境: 本番環境 (zairoku-production)"
echo "   データベース: ${DATABASE_URL%%@*}@***"
echo ""

# バックアップ確認
echo "📦 バックアップの確認..."
read -p "Supabaseダッシュボードでバックアップを取得しましたか？ (yes/no): " BACKUP_CONFIRM
if [ "$BACKUP_CONFIRM" != "yes" ]; then
  echo ""
  echo "❌ まずバックアップを取得してください"
  echo ""
  echo "📋 バックアップ手順:"
  echo "   1. https://supabase.com/dashboard にアクセス"
  echo "   2. zairoku-production プロジェクトを選択"
  echo "   3. Database → Backups → Create backup"
  echo ""
  exit 1
fi

echo ""

# マイグレーションファイル数確認
MIGRATION_COUNT=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l)
echo "📊 適用予定のマイグレーション数: $MIGRATION_COUNT"
echo ""

# 最終確認
echo "⚠️  重要: この操作は取り消せません"
read -p "本番環境にマイグレーションを適用しますか？ (yes/no): " FINAL_CONFIRM
if [ "$FINAL_CONFIRM" != "yes" ]; then
  echo "❌ キャンセルしました"
  exit 0
fi

echo ""
echo "⏳ マイグレーションを適用中..."
echo "   この処理には数分かかる場合があります..."
echo ""

# Supabase CLI でマイグレーション適用
npx supabase db push --db-url "$DATABASE_URL"

echo ""
echo "✅ マイグレーション適用完了！"
echo ""
echo "📋 次のステップ:"
echo "   1. Supabaseダッシュボードでテーブル構造を確認"
echo "   2. 本番環境 (https://zairoku.com) で動作確認"
echo "   3. エラーログを確認"
echo ""
echo "🚨 問題が発生した場合:"
echo "   1. Supabaseダッシュボードからバックアップを復元"
echo "   2. エラー内容を記録"
echo "   3. ロールバック手順を実行"
echo ""
