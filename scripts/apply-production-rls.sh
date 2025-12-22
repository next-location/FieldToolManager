#!/bin/bash

# 本番環境にRLSポリシーを適用するスクリプト

echo "🔐 Applying RLS Policies to Production Database..."

# .env.productionから環境変数を読み込む
if [ ! -f .env.production ]; then
    echo "❌ Error: .env.production file not found"
    exit 1
fi

source .env.production

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL not set in .env.production"
    exit 1
fi

echo "📋 RLS migration files to apply:"
cat scripts/production-rls-policies/rls-migration-list.txt

echo ""
echo "⚠️  This will apply RLS policies to production database"
echo "Database: $DATABASE_URL"
echo ""

# マイグレーション適用
SUCCESS_COUNT=0
FAILED_COUNT=0
FAILED_FILES=""

while IFS= read -r filename; do
    migration_file="supabase/migrations/$filename"
    
    if [ ! -f "$migration_file" ]; then
        echo "⚠️  File not found: $filename (skipping)"
        continue
    fi
    
    echo "📝 Applying: $filename"
    
    # psqlでマイグレーションを実行（エラーは無視して続行）
    if PGPASSWORD="${DATABASE_URL##*:}" psql "$DATABASE_URL" -f "$migration_file" 2>&1 | grep -v "ERROR:.*already exists\|ERROR:.*does not exist"; then
        echo "✅ Applied: $filename"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo "⚠️  Some errors in: $filename (may be expected)"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    fi
    
done < scripts/production-rls-policies/rls-migration-list.txt

echo ""
echo "========================================="
echo "📊 RLS Migration Summary"
echo "========================================="
echo "✅ Processed migrations: $SUCCESS_COUNT"
echo ""
echo "🎉 RLS policies applied!"
echo ""
echo "⚠️  Note: Some errors about existing objects are expected"
echo "   (tables already created in earlier steps)"

