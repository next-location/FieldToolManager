#!/bin/bash

# メニュー表示テスト用パッケージ切り替えスクリプト

PGPASSWORD=postgres
DB_HOST=localhost
DB_PORT=54322
DB_USER=postgres
DB_NAME=postgres
ORG_NAME="テスト建設株式会社"

echo "🎯 機能パック別メニュー表示テスト"
echo "=================================="
echo ""
echo "どのパッケージ構成でテストしますか？"
echo ""
echo "1) パッケージなし（ベースプランのみ）"
echo "2) 現場資産パックのみ"
echo "3) 現場DX業務効率化パックのみ"
echo "4) フル機能統合パック（両方）"
echo ""
read -p "選択してください (1-4): " choice

case $choice in
  1)
    echo "📦 パッケージなし に設定中..."
    ASSET=false
    DX=false
    ;;
  2)
    echo "📦 現場資産パック に設定中..."
    ASSET=true
    DX=false
    ;;
  3)
    echo "📦 現場DX業務効率化パック に設定中..."
    ASSET=false
    DX=true
    ;;
  4)
    echo "📦 フル機能統合パック に設定中..."
    ASSET=true
    DX=true
    ;;
  *)
    echo "❌ 無効な選択です"
    exit 1
    ;;
esac

PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
UPDATE contracts
SET has_asset_package = $ASSET, has_dx_efficiency_package = $DX
WHERE organization_id = (SELECT id FROM organizations WHERE name = '$ORG_NAME');
"

echo ""
echo "✅ パッケージ設定を更新しました"
echo ""
echo "📋 現在の設定:"
PGPASSWORD=$PGPASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
SELECT
  o.name,
  c.has_asset_package as 資産パック,
  c.has_dx_efficiency_package as DXパック
FROM organizations o
LEFT JOIN contracts c ON o.id = c.organization_id
WHERE o.name = '$ORG_NAME';
"

echo ""
echo "🔄 ブラウザでリロードしてメニューを確認してください"
echo ""
