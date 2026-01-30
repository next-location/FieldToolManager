#!/bin/bash

echo "=== 関数定義後の空行を削除 ==="

# 対象ファイル
files=(
  "app/api/purchase-orders/bulk-approve/route.ts"
  "app/api/purchase-orders/route.ts"
  "app/api/purchase-orders/[id]/send/route.ts"
  "app/api/projects/route.ts"
  "app/api/projects/[id]/route.ts"
  "app/api/admin/organizations/[id]/impersonate/route.ts"
  "app/api/admin/password/request-change/route.ts"
  "app/api/admin/password/verify-and-change/route.ts"
  "app/api/admin/super-admins/[id]/reset-password/route.ts"
  "app/api/admin/contracts/route.ts"
  "app/api/admin/keys/rotate/route.ts"
  "app/api/work-reports/route.ts"
  "app/api/users/password/request-change/route.ts"
  "app/api/users/password/verify-and-change/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "修正中: $file"
    # ) { の後の空行を削除
    perl -i -0pe 's/\) \{\n\n/\) \{\n/g' "$file"
  fi
done

echo "=== 修正完了 ==="