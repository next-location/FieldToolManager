#!/bin/bash

echo "=== CSRFブロックの完全削除 ==="

# 対象ファイルを検索
files=$(find app/api -name "*.ts" -type f)

for file in $files; do
  if grep -q "// CSRF\|// 🔒 CSRF" "$file"; then
    echo "修正中: $file"

    # パターン1: 関数定義直後のCSRFブロック
    # ) {
    #   // CSRF検証（セキュリティ強化）
    #   }
    #
    #   try {
    # を
    # ) {
    #   try {
    # に変更
    sed -i '' '/^) {$/,/^  try {$/{
      /^) {$/b
      /^  try {$/b
      d
    }' "$file"

    # パターン2: 残っているCSRFコメント行を削除
    sed -i '' '/\/\/ CSRF/d' "$file"
    sed -i '' '/\/\/ 🔒 CSRF/d' "$file"

    # パターン3: 空の中括弧ブロックを削除
    sed -i '' '/^  }$/N;s/^  }\n$//' "$file"
  fi
done

echo "=== 修正完了 ==="