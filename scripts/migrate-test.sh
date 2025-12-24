#!/bin/bash

# テスト環境マイグレーション適用スクリプト
set -e

echo "🚀 テスト環境へのマイグレーション適用を開始します..."
echo ""

# 環境変数読み込み確認
if [ ! -f ".env.test" ]; then
  echo "❌ エラー: .env.test ファイルが見つかりません"
  echo "   先に .env.test ファイルを作成してください"
  exit 1
fi

# 環境変数読み込み
source .env.test

# DATABASE_URL確認
if [ -z "$DATABASE_URL" ]; then
  echo "❌ エラー: DATABASE_URL が設定されていません"
  exit 1
fi

echo "📊 環境情報:"
echo "   環境: テスト環境 (zairoku-test)"
echo "   データベース: ${DATABASE_URL%%@*}@***"
echo ""

# マイグレーションファイル数確認
MIGRATION_COUNT=$(ls supabase/migrations/*.sql 2>/dev/null | wc -l)
echo "📊 適用予定のマイグレーション数: $MIGRATION_COUNT"
echo ""

# 確認プロンプト
read -p "テスト環境にマイグレーションを適用しますか？ (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "❌ キャンセルしました"
  exit 0
fi

echo ""
echo "⏳ マイグレーションを適用中..."
echo ""

# Supabase CLI でマイグレーション適用
npx supabase db push --db-url "$DATABASE_URL"

echo ""
echo "✅ マイグレーション適用完了！"
echo ""
echo "📋 次のステップ:"
echo "   1. Supabaseダッシュボードでテーブル構造を確認"
echo "   2. テストデータを投入"
echo "   3. 動作確認"
echo ""
