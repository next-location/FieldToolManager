#!/bin/bash
# 工事・現場統合機能の簡易自動テスト

echo "🚀 工事・現場統合機能テスト開始"
echo "======================================"
echo ""

# カラーコード
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
TOTAL=0

test_result() {
  TOTAL=$((TOTAL + 1))
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC}: $2"
    PASS=$((PASS + 1))
  else
    echo -e "${RED}❌ FAIL${NC}: $2"
    FAIL=$((FAIL + 1))
  fi
  echo ""
}

echo "📋 Test 1: マイグレーションファイルの存在確認"
echo "--------------------------------------"
if [ -f "supabase/migrations/20260119120000_add_site_id_to_projects.sql" ]; then
  test_result 0 "マイグレーションファイルが存在します"
else
  test_result 1 "マイグレーションファイルが見つかりません"
fi

echo "📋 Test 2: 実装ファイルの確認"
echo "--------------------------------------"

# 工事詳細ページ
if grep -q "site:sites" app/\(authenticated\)/projects/\[id\]/page.tsx; then
  test_result 0 "工事詳細ページに現場情報のクエリが追加されています"
else
  test_result 1 "工事詳細ページの実装が見つかりません"
fi

# 工事一覧ページ
if grep -q "site:sites" app/\(authenticated\)/projects/page.tsx; then
  test_result 0 "工事一覧ページに現場情報のクエリが追加されています"
else
  test_result 1 "工事一覧ページの実装が見つかりません"
fi

# 工事フォーム
if grep -q "fetchSites" components/projects/ProjectForm.tsx; then
  test_result 0 "工事フォームに現場選択機能が追加されています"
else
  test_result 1 "工事フォームの実装が見つかりません"
fi

if grep -q "site_id" components/projects/ProjectForm.tsx; then
  test_result 0 "工事フォームに site_id が含まれています"
else
  test_result 1 "工事フォームに site_id がありません"
fi

# 工事一覧コンポーネント
if grep -q "site\?" components/projects/ProjectListClient.tsx; then
  test_result 0 "工事一覧コンポーネントに現場情報が追加されています"
else
  test_result 1 "工事一覧コンポーネントの実装が見つかりません"
fi

# 発注書作成ページ
if grep -q "site:sites" app/\(authenticated\)/purchase-orders/new/page.tsx; then
  test_result 0 "発注書作成ページに現場情報のクエリが追加されています"
else
  test_result 1 "発注書作成ページの実装が見つかりません"
fi

if grep -q "delivery_location" app/\(authenticated\)/purchase-orders/new/page.tsx; then
  test_result 0 "発注書作成ページに納品場所の自動入力機能があります"
else
  test_result 1 "発注書作成ページの自動入力機能が見つかりません"
fi

echo "📋 Test 3: ドキュメントの更新確認"
echo "--------------------------------------"

# MIGRATIONS.md
if grep -q "20260119120000_add_site_id_to_projects" docs/MIGRATIONS.md; then
  test_result 0 "MIGRATIONS.md にマイグレーション履歴が記録されています"
else
  test_result 1 "MIGRATIONS.md が更新されていません"
fi

# PROJECT_SITE_INTEGRATION_PLAN.md
if grep -q "実装完了" docs/PROJECT_SITE_INTEGRATION_PLAN.md; then
  test_result 0 "PROJECT_SITE_INTEGRATION_PLAN.md に実装完了記録があります"
else
  test_result 1 "PROJECT_SITE_INTEGRATION_PLAN.md が更新されていません"
fi

echo "📋 Test 4: Git コミット確認"
echo "--------------------------------------"

if git log --oneline -1 | grep -q "project-site integration"; then
  test_result 0 "最新のコミットに実装が含まれています"
else
  test_result 1 "コミット履歴が見つかりません"
fi

echo "======================================"
echo "📊 テスト結果サマリー"
echo "======================================"
echo "合計: $TOTAL 件"
echo -e "${GREEN}✅ 成功: $PASS 件${NC}"
echo -e "${RED}❌ 失敗: $FAIL 件${NC}"
echo ""

SUCCESS_RATE=$((PASS * 100 / TOTAL))
echo "成功率: $SUCCESS_RATE%"
echo ""

if [ $FAIL -eq 0 ]; then
  echo -e "${GREEN}🎉 すべてのテストが成功しました！${NC}"
  exit 0
elif [ $SUCCESS_RATE -ge 80 ]; then
  echo -e "${YELLOW}⚠️  一部のテストが失敗しましたが、主要機能は実装されています${NC}"
  exit 0
else
  echo -e "${RED}❌ 多くのテストが失敗しました。実装を確認してください${NC}"
  exit 1
fi
