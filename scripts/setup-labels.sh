#!/bin/bash

# GitHub Labels Setup Script
# 在庫トラッカープロジェクト用のラベル作成

REPO="next-location/FieldToolManager"

echo "🏷️ Creating labels for 在庫トラッカー project..."

# フェーズラベル
gh label create "Phase 1: MVP" --repo $REPO --color "0E8A16" --description "基本機能の実装" 2>/dev/null || echo "Label 'Phase 1: MVP' already exists"
gh label create "Phase 2: Core" --repo $REPO --color "1D76DB" --description "コア機能の実装" 2>/dev/null || echo "Label 'Phase 2: Core' already exists"
gh label create "Phase 3: Advanced" --repo $REPO --color "5319E7" --description "高度な機能" 2>/dev/null || echo "Label 'Phase 3: Advanced' already exists"
gh label create "Phase 4: Polish" --repo $REPO --color "B60205" --description "最適化とテスト" 2>/dev/null || echo "Label 'Phase 4: Polish' already exists"

# 機能カテゴリラベル
gh label create "frontend" --repo $REPO --color "C2E0C6" --description "フロントエンド開発" 2>/dev/null || echo "Label 'frontend' already exists"
gh label create "backend" --repo $REPO --color "FEF2C0" --description "バックエンド開発" 2>/dev/null || echo "Label 'backend' already exists"
gh label create "auth" --repo $REPO --color "FBCA04" --description "認証機能" 2>/dev/null || echo "Label 'auth' already exists"
gh label create "core" --repo $REPO --color "0052CC" --description "コア機能" 2>/dev/null || echo "Label 'core' already exists"
gh label create "ui" --repo $REPO --color "7057FF" --description "UI/UX" 2>/dev/null || echo "Label 'ui' already exists"
gh label create "billing" --repo $REPO --color "008672" --description "課金・決済" 2>/dev/null || echo "Label 'billing' already exists"
gh label create "security" --repo $REPO --color "D93F0B" --description "セキュリティ" 2>/dev/null || echo "Label 'security' already exists"
gh label create "database" --repo $REPO --color "5319E7" --description "データベース" 2>/dev/null || echo "Label 'database' already exists"
gh label create "qr" --repo $REPO --color "FF6B6B" --description "QRコード機能" 2>/dev/null || echo "Label 'qr' already exists"

# ステータスラベル
gh label create "bug" --repo $REPO --color "B60205" --description "バグ修正" 2>/dev/null || echo "Label 'bug' already exists"
gh label create "enhancement" --repo $REPO --color "84B6EB" --description "機能改善" 2>/dev/null || echo "Label 'enhancement' already exists"
gh label create "help wanted" --repo $REPO --color "159818" --description "ヘルプ募集" 2>/dev/null || echo "Label 'help wanted' already exists"
gh label create "question" --repo $REPO --color "CC317C" --description "質問" 2>/dev/null || echo "Label 'question' already exists"

# 優先度ラベル
gh label create "🔥 urgent" --repo $REPO --color "FF0000" --description "緊急" 2>/dev/null || echo "Label '🔥 urgent' already exists"
gh label create "⚡ high" --repo $REPO --color "FF6600" --description "優先度高" 2>/dev/null || echo "Label '⚡ high' already exists"
gh label create "📍 medium" --repo $REPO --color "FFCC00" --description "優先度中" 2>/dev/null || echo "Label '📍 medium' already exists"
gh label create "🔽 low" --repo $REPO --color "66CC00" --description "優先度低" 2>/dev/null || echo "Label '🔽 low' already exists"

echo "✅ All labels created successfully!"