#!/bin/bash

echo "=== すべてのfetch呼び出しからCSRF関連コードを削除 ==="

# すべてのTSX/TSファイルを検索
files=$(find . -type f \( -name "*.tsx" -o -name "*.ts" \) -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*")

count=0
for file in $files; do
  if grep -q "csrfToken\|X-CSRF-Token" "$file" 2>/dev/null; then
    echo "修正中: $file"
    count=$((count + 1))

    # バックアップを作成
    cp "$file" "$file.csrf-bak"

    # 1. useCsrfTokenのインポートを削除
    sed -i '' "/import.*useCsrfToken/d" "$file"
    sed -i '' "/import.*csrf/d" "$file"

    # 2. CSRFトークンの取得を削除
    sed -i '' "/const.*{.*csrfToken.*}.*=.*useCsrfToken/d" "$file"
    sed -i '' "/const.*csrfToken.*=.*useCsrfToken/d" "$file"
    sed -i '' "/const.*csrfToken.*=.*await.*getCsrfToken/d" "$file"
    sed -i '' "/const.*{.*token.*}.*=.*await.*fetch.*csrf/d" "$file"

    # 3. CSRF検証のif文を複数行にわたって削除（改善版）
    perl -i -0pe 's/\s*if\s*\([^)]*csrfToken[^}]*\}//gs' "$file"

    # 4. fetchのheadersからX-CSRF-Tokenを削除
    sed -i '' "/'X-CSRF-Token'.*csrfToken/d" "$file"
    sed -i '' '/X-CSRF-Token/d' "$file"

    # 5. csrfToken変数への参照を削除（より積極的）
    sed -i '' 's/,\s*csrfToken//g' "$file"
    sed -i '' 's/csrfToken,\s*//g' "$file"

    # 6. 空のheadersブロックをクリーンアップ
    perl -i -0pe 's/headers:\s*{\s*},//gs' "$file"
    perl -i -0pe 's/headers:\s*{\s*\n\s*},//gs' "$file"

    # 最終チェック
    if grep -q "csrfToken\|X-CSRF-Token" "$file"; then
      echo "  ⚠️  まだCSRF参照が残っています: $file"
      echo "  手動で確認が必要です"
    else
      echo "  ✅ クリーン: $file"
      rm "$file.csrf-bak"  # バックアップを削除
    fi
  fi
done

echo ""
echo "=== 結果 ==="
echo "修正したファイル数: $count"

# 残っているCSRF参照を最終チェック
echo ""
echo "残っているCSRF参照:"
grep -r "csrfToken\|X-CSRF-Token" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=dist . 2>/dev/null | head -20

echo ""
echo "完了！"