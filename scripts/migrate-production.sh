#!/bin/bash

# 本番環境データベースマイグレーションスクリプト

echo "🚀 Starting production database migration..."

# 環境変数を読み込む
source .env.production

# マイグレーションディレクトリ
MIGRATION_DIR="supabase/migrations"

# 成功/失敗カウンタ
SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_FILES=""

# マイグレーションファイルを順番に実行
for migration_file in $(ls $MIGRATION_DIR/*.sql | sort); do
    filename=$(basename $migration_file)

    # .bakファイルはスキップ
    if [[ $filename == *.bak ]]; then
        echo "⏭️  Skipping backup file: $filename"
        continue
    fi

    echo "📝 Applying migration: $filename"

    # psqlでマイグレーションを実行
    if psql "$DATABASE_URL" -f "$migration_file" > /dev/null 2>&1; then
        echo "✅ Success: $filename"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "❌ Failed: $filename"
        FAILED_COUNT=$((FAILED_COUNT + 1))
        FAILED_FILES="$FAILED_FILES\n  - $filename"
    fi
done

echo ""
echo "========================================="
echo "📊 Migration Summary"
echo "========================================="
echo "✅ Successful migrations: $SUCCESS_COUNT"
echo "❌ Failed migrations: $FAILED_COUNT"

if [ $FAILED_COUNT -gt 0 ]; then
    echo -e "\n⚠️ Failed files:$FAILED_FILES"
    exit 1
else
    echo ""
    echo "🎉 All migrations completed successfully!"
fi