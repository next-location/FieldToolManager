#!/bin/bash

# 画像最適化スクリプト
# 使い方: ./scripts/optimize-images.sh

echo "=========================================="
echo "📸 画像最適化スクリプト開始"
echo "=========================================="

IMAGE_DIR="/Users/youichiakashi/FieldToolManager/public/images/manual"

# ImageMagickがインストールされているか確認
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagickがインストールされていません。"
    echo "   以下のコマンドでインストールしてください："
    echo "   brew install imagemagick"
    exit 1
fi

# 全PNG画像を処理
echo ""
echo "🔍 画像を検索中..."
TOTAL_BEFORE=0
TOTAL_AFTER=0
COUNT=0

# 各サブディレクトリを処理
for dir in login qr tools print attendance documents settings mobile; do
    DIR_PATH="$IMAGE_DIR/$dir"

    if [ ! -d "$DIR_PATH" ]; then
        echo "⚠️  ディレクトリが存在しません: $DIR_PATH"
        continue
    fi

    echo ""
    echo "📁 処理中: $dir/"

    for file in "$DIR_PATH"/*.png "$DIR_PATH"/*.jpg "$DIR_PATH"/*.jpeg; do
        if [ -f "$file" ]; then
            # 元のファイルサイズを取得
            BEFORE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
            BEFORE_KB=$((BEFORE / 1024))

            # 画像を最適化（品質85%、最大幅1200px）
            convert "$file" -resize '1200x>' -quality 85 "$file"

            # 最適化後のファイルサイズを取得
            AFTER=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file")
            AFTER_KB=$((AFTER / 1024))

            # 削減率を計算
            if [ $BEFORE -gt 0 ]; then
                REDUCTION=$(( (BEFORE - AFTER) * 100 / BEFORE ))
            else
                REDUCTION=0
            fi

            FILENAME=$(basename "$file")
            echo "  ✅ $FILENAME: ${BEFORE_KB}KB → ${AFTER_KB}KB (-${REDUCTION}%)"

            TOTAL_BEFORE=$((TOTAL_BEFORE + BEFORE))
            TOTAL_AFTER=$((TOTAL_AFTER + AFTER))
            COUNT=$((COUNT + 1))
        fi
    done
done

# 合計結果を表示
if [ $COUNT -gt 0 ]; then
    TOTAL_BEFORE_MB=$((TOTAL_BEFORE / 1024 / 1024))
    TOTAL_AFTER_MB=$((TOTAL_AFTER / 1024 / 1024))
    TOTAL_REDUCTION=$(( (TOTAL_BEFORE - TOTAL_AFTER) * 100 / TOTAL_BEFORE ))

    echo ""
    echo "=========================================="
    echo "🎉 最適化完了！"
    echo "   処理ファイル数: ${COUNT}枚"
    echo "   合計サイズ削減: ${TOTAL_BEFORE_MB}MB → ${TOTAL_AFTER_MB}MB (-${TOTAL_REDUCTION}%)"
    echo "=========================================="
else
    echo ""
    echo "⚠️  処理する画像が見つかりませんでした。"
fi
