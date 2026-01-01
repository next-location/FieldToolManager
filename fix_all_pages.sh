#!/bin/bash

# すべての認証ページを requireAuth() に統一する最終スクリプト

echo "🔍 修正対象のページを検索中..."

pages=$(find /Users/youichiakashi/FieldToolManager/app/\(authenticated\) -name "page.tsx" -type f)
total=$(echo "$pages" | wc -l | tr -d ' ')

echo "📊 対象: $total ファイル"

fixed=0
skipped=0

for file in $pages; do
  # すでに requireAuth() を正しく使用している場合はスキップ
  if grep -q "const { userId, organizationId, userRole, supabase } = await requireAuth()" "$file"; then
    # 古いコードが残っていないか確認
    if ! grep -q "createClient()\|user\.id\|userData\?\.organization_id" "$file"; then
      continue
    fi
  fi

  echo "🔧 修正: $(echo $file | sed 's|/Users/youichiakashi/FieldToolManager/||')"

  # バックアップ
  cp "$file" "$file.bak"

  # Python で完全修正
  python3 - <<'PYTHON_SCRIPT' "$file"
import sys
import re

filepath = sys.argv[1]

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# requireAuth のインポート追加
if 'requireAuth' not in content:
    if "import { redirect }" in content:
        content = content.replace(
            "import { redirect }",
            "import { redirect }\nimport { requireAuth } from '@/lib/auth/page-auth'"
        )
    elif "import { Suspense }" in content:
        content = content.replace(
            "import { Suspense }",
            "import { Suspense }\nimport { requireAuth } from '@/lib/auth/page-auth'"
        )
    else:
        # ファイルの先頭に追加
        content = "import { requireAuth } from '@/lib/auth/page-auth'\n" + content

# createClient のインポート削除
content = re.sub(r"import { createClient } from '@/lib/supabase/server'\n", "", content)

# パターン1: async function 内の認証コード
# const supabase = await createClient()
# const { data: { user } } = await supabase.auth.getUser()
# if (!user) redirect('/login')
# const { data: userData } = await supabase.from('users')...
pattern1 = re.compile(
    r'const supabase = await createClient\(\)\s*\n\s*'
    r'const {\s*data:\s*{\s*user\s*}[^}]*}\s*=\s*await\s+supabase\.auth\.getUser\(\)\s*\n\s*'
    r'if\s*\(\s*!user\s*\)\s*{\s*redirect\([^)]+\)\s*}\s*\n\s*'
    r'(?:const\s*{\s*data:\s*userData[^}]*}\s*=\s*await\s+supabase[^\n]+\n\s*)?'
    r'(?:if\s*\([^)]*userData[^)]*\)\s*{[^}]+}\s*\n\s*)?',
    re.MULTILINE
)

content = pattern1.sub('const { userId, organizationId, userRole, supabase } = await requireAuth()\n\n  ', content)

# パターン2: 関数の最初の行が const supabase = await createClient()
pattern2 = re.compile(
    r'(async function \w+\([^)]*\)\s*{\s*)\n\s*const supabase = await createClient\(\)',
    re.MULTILINE
)

content = pattern2.sub(r'\1\n  const { userId, organizationId, userRole, supabase } = await requireAuth()', content)

# user.id を userId に置換
content = re.sub(r'\buser\.id\b', 'userId', content)

# userData?.organization_id を organizationId に置換
content = re.sub(r'\buserData\?\.organization_id\b', 'organizationId', content)
content = re.sub(r'\buserData\.organization_id\b', 'organizationId', content)

# userData?.role を userRole に置換
content = re.sub(r'\buserData\?\.role\b', 'userRole', content)
content = re.sub(r'\buserData\.role\b', 'userRole', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

PYTHON_SCRIPT

  if [ $? -eq 0 ]; then
    rm "$file.bak"
    fixed=$((fixed + 1))
  else
    mv "$file.bak" "$file"
    echo "  ❌ エラー"
  fi
done

echo ""
echo "✅ 修正完了: $fixed ファイル"
