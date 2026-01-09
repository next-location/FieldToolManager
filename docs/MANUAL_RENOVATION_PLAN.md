# マニュアルページ改修計画書

## 📋 概要

既存の `app/(authenticated)/manual/` を全面的に改修し、Markdown管理・検索機能・権限制御を備えた本格的なヘルプセンターに刷新します。

**重要**: これは新規プロジェクトではなく、既存FieldToolManagerプロジェクト内の機能改善です。

---

## 🎯 要件定義

### 1. 技術スタック

- **形式**: Markdown (MDX) ベース
- **画像**: `<img width="...">` で記述（スマホ画像の巨大化防止）
- **検索機能（最重要）**:
  - マニュアルとQ&Aを横断検索
  - 検索結果で「マニュアル」か「Q&A」かを区別
  - ローカル検索（flexsearch）で実装

### 2. ディレクトリ構成

既存の `app/(authenticated)/` 配下に統合します。

```
app/(authenticated)/
├── manual/                         # マニュアル
│   ├── page.tsx                    # トップページ（検索UI含む）
│   ├── layout.tsx                  # マニュアル専用レイアウト
│   ├── 00_public/                  # Lv0: 未ログイン
│   │   ├── login/page.mdx
│   │   └── password-reset/page.mdx
│   ├── 01_staff/                   # Lv1: 現場スタッフ
│   │   ├── qr-scan/page.mdx
│   │   ├── bulk-move/page.mdx
│   │   └── consumables/page.mdx
│   ├── 02_leader/                  # Lv2: 現場リーダー
│   ├── 03_manager/                 # Lv3: マネージャー
│   └── 04_owner/                   # Lv4: オーナー
└── qa/                             # Q&A（新規追加）
    ├── page.tsx                    # トップページ
    ├── layout.tsx
    ├── public/                     # Lv0
    ├── staff/                      # Lv1
    └── admin/                      # Lv3-4
```

### 3. Frontmatter設計

各MDXファイルのメタデータ:

```yaml
---
title: "QRコードスキャン"
description: "QRコードを使った道具の移動登録方法"
permission: 1                        # 0-4の権限レベル
plans: ["basic"]                     # 必要なプラン
category: "manual"                   # manual or qa
tags: ["QRコード", "スマホ"]
lastUpdated: "2025-01-09"
---
```

### 4. 表示制御ロジック

#### A. 権限によるフィルタ（積み上げ式）

- Lv0 (public): `00_public/`, `qa/public/`
- Lv1 (staff): Lv0 + `01_staff/`, `qa/staff/`
- Lv2 (leader): Lv1 + `02_leader/`
- Lv3 (manager): Lv2 + `03_manager/`, `qa/admin/`
- Lv4 (owner): All

#### B. プランによるフィルタ

Frontmatterの `plans` に基づいてフィルタ:
- `["basic"]` - 全員表示
- `["basic", "asset_pack"]` - 基本 or 資産パック契約者
- `["dx_pack"]` - DXパック契約者のみ

---

## 🏗️ 技術実装

### Step 1: パッケージ追加

```bash
npm install @next/mdx @mdx-js/loader @mdx-js/react gray-matter remark-gfm rehype-slug rehype-autolink-headings flexsearch
```

### Step 2: next.config.ts修正

MDXサポートを有効化:

```typescript
import createMDX from '@next/mdx'

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
  },
})

export default withMDX(nextConfig)
```

### Step 3: lib/manual/ ユーティリティ作成

**lib/manual/permissions.ts** - 権限チェック
**lib/manual/filter.ts** - 記事フィルタリング
**lib/manual/search.ts** - 検索インデックス生成
**lib/manual/metadata.ts** - Frontmatter解析

### Step 4: 検索機能実装

#### ビルド時処理（`scripts/build-search-index.ts`）

1. 全MDXファイルをスキャン
2. Frontmatter + 本文を抽出
3. flexsearchインデックスを生成
4. `public/search-index.json` に出力

#### クライアントコンポーネント（`components/ManualSearch.tsx`）

- 検索ボックスUI
- インクリメンタルサーチ
- 結果表示（マニュアル/Q&Aのバッジ付き）

### Step 5: マニュアルトップページ刷新

**app/(authenticated)/manual/page.tsx**

- 検索UI
- 権限別記事一覧
- 人気の記事
- Q&Aへのリンク

### Step 6: MDXレイアウト作成

**app/(authenticated)/manual/layout.tsx**

- サイドバー（目次）
- パンくずリスト
- 関連記事
- 権限・プランバッジ

---

## 📅 実装スケジュール

### Phase 1: 技術基盤（Week 1）

- [x] パッケージ追加とnext.config.ts修正
- [x] lib/manual/ ユーティリティ作成
- [x] 検索インデックス生成スクリプト作成
- [x] 動作確認用のテストMDXファイル作成

### Phase 2: UI/UX実装（Week 2）

- [x] マニュアルトップページ刷新
- [x] MDXレイアウト作成
- [x] 検索UIコンポーネント作成
- [x] Q&Aページ作成

### Phase 3: コンテンツ作成（Week 3以降）

**共同作業フロー**:

1. **Claude**: 次に作成する記事を提案
2. **ユーザー**: 承認 or 修正指示
3. **Claude**: MDXファイル作成（Frontmatter + 構成）
4. **ユーザー**: レビュー・修正指示
5. **Claude**: 反映 → 次の記事へ

**想定ペース**:
- 1日2-3記事
- 週10-15記事
- 全50記事 → 約4-5週間

---

## 📝 コンテンツ作成ガイドライン

### マニュアル記事の書き方

```mdx
---
title: "QRコードスキャン"
description: "QRコードを使った道具の移動登録方法"
permission: 1
plans: ["basic"]
category: "manual"
tags: ["QRコード", "スマホ"]
---

# QRコードスキャン

QRコードを使って道具の情報を確認する方法を説明します。

## 使用シーン

- 道具の現在位置を確認したい
- 道具のステータスを確認したい

## 操作手順

### 1. QRスキャン画面を開く

画面下部の「**QR**」ボタンをタップします。

<img src="/images/manual/qr-button.png" width="300" alt="QRボタン" />

### 2. QRコードをスキャン

...
```

### Q&A記事の書き方

```mdx
---
title: "QRコードが読み取れない"
description: "QRコードスキャン時のトラブルシューティング"
permission: 1
plans: ["basic"]
category: "qa"
tags: ["QRコード", "トラブルシューティング"]
---

# QRコードが読み取れない

## 症状

カメラでQRコードをスキャンしても反応しない

## 原因と対処法

### 1. カメラ権限がない

**対処法**:
...
```

---

## 🚀 デプロイフロー

### 開発環境

```bash
npm run dev
```

- http://localhost:3000/manual で確認

### 本番デプロイ

```bash
git add .
git commit -m "feat: renovate manual pages with MDX and search"
git push origin main
```

Vercelが自動デプロイ

---

## ✅ 成功指標（KPI）

- [ ] 全マニュアルページ数: 50ページ以上
- [ ] Q&Aページ数: 30ページ以上
- [ ] 検索機能: レスポンス時間 < 100ms
- [ ] モバイル対応: レスポンシブ100%
- [ ] 権限・プランフィルタ: 正常動作

---

## 📚 参考資料

### 既存マニュアル（参考のみ、内容は却下）

- `docs/MANUAL.md` - 長すぎる、構造が悪い
- `docs/USER_MANUAL_STAFF.md` - スタッフ向け
- `docs/USER_MANUAL_ADMIN.md` - 管理者向け

→ これらは参考にしつつ、構造を一から作り直す

---

**ドキュメントバージョン**: 2.0
**最終更新日**: 2025-01-09
**作成者**: Claude (AI Assistant)
