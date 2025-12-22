#!/bin/bash

# RLSポリシーのみを抽出するスクリプト

OUTPUT_FILE="scripts/production-rls-policies/all-rls-policies.sql"

echo "-- =========================================" > "$OUTPUT_FILE"
echo "-- RLS Policies for Production Environment" >> "$OUTPUT_FILE"
echo "-- Generated: $(date)" >> "$OUTPUT_FILE"
echo "-- =========================================" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# マイグレーションファイルを順番に処理
for migration_file in $(ls supabase/migrations/*.sql | sort); do
    filename=$(basename "$migration_file")
    
    # .bakファイルはスキップ
    if [[ $filename == *.bak ]]; then
        continue
    fi
    
    # RLSポリシーが含まれているか確認
    if grep -q "CREATE POLICY\|DROP POLICY\|ALTER POLICY" "$migration_file"; then
        echo "-- =========================================" >> "$OUTPUT_FILE"
        echo "-- From: $filename" >> "$OUTPUT_FILE"
        echo "-- =========================================" >> "$OUTPUT_FILE"
        
        # CREATE POLICY, DROP POLICY, ALTER POLICY文のみを抽出
        grep -A 10 "CREATE POLICY\|DROP POLICY\|ALTER POLICY" "$migration_file" >> "$OUTPUT_FILE"
        
        echo "" >> "$OUTPUT_FILE"
    fi
done

echo "✅ RLS policies extracted to: $OUTPUT_FILE"
