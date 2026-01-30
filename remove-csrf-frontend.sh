#!/bin/bash

echo "=== フロントエンドからCSRFコードを削除 ==="

# 対象ファイル
files=(
  "components/admin/ImpersonateButton.tsx"
  "components/projects/ProjectForm.tsx"
  "components/invoices/ApproveInvoiceButton.tsx"
  "components/invoices/SendInvoiceButton.tsx"
  "components/invoices/ReturnInvoiceButton.tsx"
  "components/invoices/SubmitInvoiceButton.tsx"
  "components/purchase-orders/DeletePurchaseOrderButton.tsx"
  "app/(authenticated)/clients/ClientForm.tsx"
  "app/(authenticated)/invoices/[id]/edit/page.tsx"
  "app/(authenticated)/invoices/new/page.tsx"
  "app/(authenticated)/purchase-orders/new/page.tsx"
  "app/(authenticated)/work-reports/new/WorkReportForm.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "修正中: $file"

    # 1. useCsrfTokenのインポートを削除
    sed -i '' "/import.*useCsrfToken/d" "$file"

    # 2. const { csrfToken } = useCsrfToken() を削除
    sed -i '' "/const.*{.*csrfToken.*}.*=.*useCsrfToken/d" "$file"

    # 3. const csrfToken = useCsrfToken() を削除
    sed -i '' "/const.*csrfToken.*=.*useCsrfToken/d" "$file"

    # 4. CSRF検証のif文を削除（複数行）
    perl -i -0pe "s/\s*if\s*\(\s*!csrfToken[^}]*\}\n//gs" "$file"

    # 5. fetchのheadersからX-CSRF-Tokenを削除
    sed -i '' "/'X-CSRF-Token'.*csrfToken/d" "$file"

    # 6. 残っているcsrfToken参照があれば警告
    if grep -q "csrfToken" "$file"; then
      echo "  ⚠️  警告: $file にまだcsrfToken参照が残っています"
    fi
  fi
done

echo "=== 完了 ==="
echo ""
echo "残っているCSRF参照を確認中..."
grep -l "csrfToken\|X-CSRF-Token" components/**/*.tsx app/**/*.tsx 2>/dev/null | while read file; do
  echo "  ⚠️  $file"
done

echo ""
echo "修正完了！"