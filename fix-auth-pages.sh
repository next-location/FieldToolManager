#!/bin/bash

# なりすましログイン対応: 全ページを requireAuth() に移行

# 対象ファイル一覧（上位30ページを優先的に修正）
pages=(
  "app/(authenticated)/attendance/settings/page.tsx"
  "app/(authenticated)/attendance/records/page.tsx"
  "app/(authenticated)/attendance/terminals/page.tsx"
  "app/(authenticated)/attendance/my-records/page.tsx"
  "app/(authenticated)/attendance/qr/leader/page.tsx"
  "app/(authenticated)/attendance/alerts/page.tsx"
  "app/(authenticated)/attendance/clock/page.tsx"
  "app/(authenticated)/attendance/reports/monthly/page.tsx"
  "app/(authenticated)/receivables/page.tsx"
  "app/(authenticated)/clients/new/page.tsx"
  "app/(authenticated)/clients/[id]/edit/page.tsx"
  "app/(authenticated)/settings/organization/page.tsx"
  "app/(authenticated)/settings/page.tsx"
  "app/(authenticated)/payments/[id]/page.tsx"
  "app/(authenticated)/tools/bulk-qr/page.tsx"
  "app/(authenticated)/tools/new/page.tsx"
  "app/(authenticated)/tools/[id]/edit/page.tsx"
  "app/(authenticated)/tools/[id]/page.tsx"
  "app/(authenticated)/purchase-orders/settings/page.tsx"
  "app/(authenticated)/purchase-orders/payment-schedule/page.tsx"
  "app/(authenticated)/purchase-orders/[id]/page.tsx"
  "app/(authenticated)/purchase-orders/page.tsx"
  "app/(authenticated)/purchase-orders/analytics/page.tsx"
  "app/(authenticated)/suppliers/page.tsx"
  "app/(authenticated)/invoices/receipt-schedule/page.tsx"
  "app/(authenticated)/invoices/[id]/page.tsx"
  "app/(authenticated)/invoices/page.tsx"
  "app/(authenticated)/tool-sets/movement/page.tsx"
  "app/(authenticated)/tool-sets/new/page.tsx"
  "app/(authenticated)/tool-sets/[id]/page.tsx"
  "app/(authenticated)/tool-sets/page.tsx"
  "app/(authenticated)/sites/page.tsx"
  "app/(authenticated)/sites/[id]/page.tsx"
  "app/(authenticated)/sites/[id]/edit/page.tsx"
  "app/(authenticated)/sites/new/page.tsx"
)

for page in "${pages[@]}"; do
  file="/Users/youichiakashi/FieldToolManager/$page"

  if [ ! -f "$file" ]; then
    echo "⏭️  スキップ (ファイルが存在しません): $page"
    continue
  fi

  # すでに requireAuth を使用している場合はスキップ
  if grep -q "requireAuth" "$file"; then
    echo "✅ 完了済み: $page"
    continue
  fi

  # createClient を使用していない場合はスキップ
  if ! grep -q "createClient()" "$file"; then
    echo "ℹ️  対象外: $page"
    continue
  fi

  echo "🔧 修正中: $page"

  # バックアップ作成
  cp "$file" "$file.backup"

  # 一時ファイルに変換結果を保存
  python3 - <<'PYTHON_SCRIPT' "$file"
import sys
import re

filepath = sys.argv[1]

with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# すでに requireAuth がインポートされている場合はスキップ
if 'requireAuth' in content:
    sys.exit(0)

# createClient のインポートを削除し、requireAuth を追加
content = re.sub(
    r"import { createClient } from '@/lib/supabase/server'\n",
    "",
    content
)

# redirect のインポートの後に requireAuth を追加
content = re.sub(
    r"(import { redirect } from 'next/navigation')",
    r"\1\nimport { requireAuth } from '@/lib/auth/page-auth'",
    content
)

# 認証パターンを検出して置換
# パターン1: const supabase = await createClient() + getUser() + userData取得
pattern1 = re.compile(
    r'const supabase = await createClient\(\)\s+'
    r'const {\s+data: { user },?\s+} = await supabase\.auth\.getUser\(\)\s+'
    r'if \(!user\) {\s+redirect\(\'/login\'\)\s+}\s+'
    r'(?:// .*\n)*'
    r'const { data: userData[^}]*} = await supabase\s+'
    r'\.from\(\'users\'\)\s+'
    r'\.select\([^\)]+\)\s+'
    r'\.eq\(\'id\', user\.id\)\s+'
    r'\.single\(\)',
    re.MULTILINE | re.DOTALL
)

replacement1 = "const { userId, organizationId, userRole, supabase } = await requireAuth()"

content = pattern1.sub(replacement1, content)

# userData?.organization_id を organizationId に置換
content = re.sub(r'userData\?\.organization_id', 'organizationId', content)

# userData.organization_id を organizationId に置換
content = re.sub(r'userData\.organization_id', 'organizationId', content)

# userData?.role を userRole に置換
content = re.sub(r'userData\?\.role', 'userRole', content)

# userData.role を userRole に置換
content = re.sub(r'userData\.role', 'userRole', content)

# user.id を userId に置換（ただし user.email は残す）
content = re.sub(r'\buser\.id\b', 'userId', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

PYTHON_SCRIPT

  if [ $? -eq 0 ]; then
    echo "✅ 完了: $page"
    rm "$file.backup"
  else
    echo "❌ エラー: $page"
    mv "$file.backup" "$file"
  fi
done

echo ""
echo "🎉 修正完了"
