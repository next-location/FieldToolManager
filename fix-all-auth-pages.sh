#!/bin/bash

# なりすましログイン対応: すべてのページを requireAuth() に移行

echo "🔍 修正対象ページを検索中..."

# createClient() を使用しているすべてのページファイルを検索
pages=$(find /Users/youichiakashi/FieldToolManager/app/\(authenticated\) -name "page.tsx" -type f -exec grep -l "createClient()" {} \;)

total=$(echo "$pages" | wc -l | tr -d ' ')
echo "📊 対象ページ数: $total"

count=0
success=0
skip=0
error_count=0

for file in $pages; do
  count=$((count + 1))
  relative_path=$(echo "$file" | sed 's|/Users/youichiakashi/FieldToolManager/||')

  echo ""
  echo "[$count/$total] 処理中: $relative_path"

  # すでに requireAuth を使用している場合はスキップ
  if grep -q "requireAuth" "$file"; then
    echo "  ✅ 完了済み (requireAuth使用中)"
    skip=$((skip + 1))
    continue
  fi

  # バックアップ作成
  cp "$file" "$file.backup"

  # Python スクリプトで変換
  python3 - <<'PYTHON_SCRIPT' "$file"
import sys
import re

filepath = sys.argv[1]

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

original_content = content

# createClient のインポート削除
content = re.sub(
    r"import { createClient } from '@/lib/supabase/server'\n",
    "",
    content
)

# redirect インポートの後に requireAuth 追加
if "requireAuth" not in content and "redirect" in content:
    content = re.sub(
        r"(import { redirect } from 'next/navigation')",
        r"\1\nimport { requireAuth } from '@/lib/auth/page-auth'",
        content
    )

# 認証パターンを検出して置換
# パターン: const supabase = await createClient() で始まる認証ロジック
pattern = re.compile(
    r'const supabase = await createClient\(\)\s+'
    r'(?:const|let)\s+{\s*data:\s*{\s*user\s*}[^}]*}\s*=\s*await\s+supabase\.auth\.getUser\(\)\s+'
    r'if\s*\(\s*!user\s*\)\s*{\s*redirect\([^)]+\)\s*}',
    re.MULTILINE | re.DOTALL
)

if pattern.search(content):
    # 関数の開始を見つける
    func_pattern = re.compile(r'export default async function \w+\([^)]*\)\s*{')
    func_match = func_pattern.search(content)

    if func_match:
        # 関数本体の開始位置
        func_start = func_match.end()

        # 最初の有効なコードまで（params の await など）
        params_pattern = re.compile(r'const\s+\w+\s+=\s+await\s+\w+')
        params_match = params_pattern.search(content, func_start)

        insert_pos = params_match.end() if params_match else func_start

        # requireAuth の挿入位置を見つける
        auth_pattern = pattern.search(content, insert_pos)

        if auth_pattern:
            # 認証ブロック全体を requireAuth に置換
            before_auth = content[:auth_pattern.start()]
            after_auth = content[auth_pattern.end():]

            # userData 取得部分も削除
            userdata_pattern = re.compile(
                r'\s*(?://[^\n]*)?\s*const\s+{\s*data:\s*userData[^}]*}\s*=\s*await\s+supabase\s*'
                r'\.from\([\'"]users[\'"]\)\s*'
                r'\.select\([^)]+\)\s*'
                r'\.eq\([^)]+\)\s*'
                r'\.single\(\)',
                re.MULTILINE | re.DOTALL
            )

            userdata_match = userdata_pattern.match(after_auth)
            if userdata_match:
                after_auth = after_auth[userdata_match.end():]

            # requireAuth を挿入
            content = before_auth + "\n  const { userId, organizationId, userRole, supabase } = await requireAuth()\n" + after_auth

# 変数名の置換
content = re.sub(r'\buserData\?\.organization_id\b', 'organizationId', content)
content = re.sub(r'\buserData\.organization_id\b', 'organizationId', content)
content = re.sub(r'\buserData\?\.role\b', 'userRole', content)
content = re.sub(r'\buserData\.role\b', 'userRole', content)
content = re.sub(r'\buser\.id\b', 'userId', content)

# 変更があった場合のみ保存
if content != original_content:
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    sys.exit(0)
else:
    sys.exit(1)

PYTHON_SCRIPT

  if [ $? -eq 0 ]; then
    echo "  ✅ 変換成功"
    rm "$file.backup"
    success=$((success + 1))
  else
    echo "  ⚠️  変換スキップ (パターンマッチなし)"
    mv "$file.backup" "$file"
    skip=$((skip + 1))
  fi
done

echo ""
echo "========================================="
echo "🎉 処理完了"
echo "  成功: $success"
echo "  スキップ: $skip"
echo "  エラー: $error_count"
echo "  合計: $total"
echo "========================================="
