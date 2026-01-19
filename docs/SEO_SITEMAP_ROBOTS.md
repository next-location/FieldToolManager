# SEO設定ガイド: サイトマップ & robots.txt

## 📋 概要

このドキュメントでは、ザイロク (Zairoku) の検索エンジン最適化 (SEO) に必要な以下の設定について説明します:

- **サイトマップ (sitemap.xml)**: 検索エンジンにインデックスしてほしいページのリスト
- **robots.txt**: 検索エンジンのクロール制御ルール

---

## 🗺️ サイトマップ (sitemap.xml)

### サイトマップとは？

サイトマップは、検索エンジン (Google, Bing など) に「このサイトにはこんなページがあるよ」と教えるXMLファイルです。

### インデックス対象ページ (公開ページのみ)

以下のページのみをサイトマップに含めます:

| ページ | パス | 優先度 | 更新頻度 |
|--------|------|--------|----------|
| トップページ | `/` | 1.0 (最高) | monthly |
| 問い合わせフォーム | `/contact` | 0.8 | monthly |
| プライバシーポリシー | `/privacy` | 0.5 | yearly |
| 利用規約 | `/terms` | 0.5 | yearly |
| 特定商取引法に基づく表記 | `/commercial-transactions` | 0.5 | yearly |

### インデックス除外ページ

以下のページはサイトマップに**含めません**:

- ログインが必要なページ (`/dashboard/*`, `/admin/*`)
- 認証ページ (`/login`, `/signup`)
- APIエンドポイント (`/api/*`)
- 内部管理ページ

---

## 🛠️ 実装方法

### ファイル構成

```
app/
├── sitemap.ts          # サイトマップ生成ロジック
public/
├── robots.txt          # クロール制御ルール
```

### サイトマップの実装 (`app/sitemap.ts`)

Next.js の App Router 機能を使用して、サイトマップを自動生成します。

```typescript
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zairoku.com'

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/commercial-transactions`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]
}
```

### 優先度 (priority) の基準

| 優先度 | 用途 |
|--------|------|
| 1.0 | トップページ (最重要) |
| 0.8 | 主要なコンバージョンページ (問い合わせ、資料請求) |
| 0.5-0.7 | 一般的なコンテンツページ |
| 0.3-0.4 | 補足的なページ (利用規約、プライバシーポリシー) |

### 更新頻度 (changeFrequency) の基準

| 頻度 | 用途 |
|------|------|
| `always` | 毎回変わるページ (ほぼ使わない) |
| `hourly` | 1時間ごと (ニュースサイトなど) |
| `daily` | 毎日 (ブログなど) |
| `weekly` | 毎週 (頻繁に更新するコンテンツ) |
| `monthly` | 毎月 (トップページ、サービス紹介) |
| `yearly` | 年1回 (利用規約、プライバシーポリシー) |
| `never` | 変更しない (アーカイブページなど) |

---

## 🤖 robots.txt

### robots.txt とは？

検索エンジンのクローラー (Googlebot など) に「このページはクロールしてOK/NG」を指示するファイルです。

### 実装 (`public/robots.txt`)

```txt
# すべての検索エンジンに対するルール
User-agent: *

# ログインが必要なページはクロール禁止
Disallow: /dashboard/
Disallow: /admin/
Disallow: /login
Disallow: /signup
Disallow: /api/

# 公開ページは明示的に許可
Allow: /
Allow: /contact
Allow: /privacy
Allow: /terms
Allow: /commercial-transactions

# サイトマップの場所を教える
Sitemap: https://zairoku.com/sitemap.xml
```

### ルール説明

| ディレクティブ | 意味 | 例 |
|----------------|------|-----|
| `User-agent: *` | すべての検索エンジンに適用 | Google, Bing, Yahoo など |
| `Disallow: /path/` | このパスをクロール禁止 | `/dashboard/` 以下すべて禁止 |
| `Allow: /path` | このパスをクロール許可 (明示的) | `/contact` を許可 |
| `Sitemap: URL` | サイトマップの場所 | `https://zairoku.com/sitemap.xml` |

---

## 🔄 今後の運用方法

### ケース1: 新しい公開ページを追加する場合

**例**: ブログ機能、サービス紹介ページを追加

#### ステップ

1. **`app/sitemap.ts` を編集**

```typescript
{
  url: `${baseUrl}/blog`,
  lastModified: new Date(),
  changeFrequency: 'weekly',
  priority: 0.7,
},
```

2. **デプロイ**

```bash
git add app/sitemap.ts
git commit -m "feat: add blog to sitemap"
git push origin main
```

3. **Google Search Console でサイトマップを再送信** (任意)
   - https://search.google.com/search-console
   - 「サイトマップ」→「sitemap.xml」→「再送信」

4. **確認**
   - https://zairoku.com/sitemap.xml にアクセスして新しいページが含まれているか確認

---

### ケース2: 新しいログイン必須ページを追加する場合

**例**: 新しい管理画面セクションを追加

#### ステップ

1. **`public/robots.txt` を編集**

```txt
Disallow: /new-admin-section/
```

2. **サイトマップには追加しない** (重要!)

3. **デプロイ**

```bash
git add public/robots.txt
git commit -m "feat: add new admin section to robots.txt disallow list"
git push origin main
```

4. **確認**
   - https://zairoku.com/robots.txt にアクセスして新しいルールが含まれているか確認

---

### ケース3: 動的ページ (ブログ記事など) を追加する場合

**例**: ブログ記事が `/blog/[slug]` で動的に生成される

#### ステップ

1. **`app/sitemap.ts` を動的生成に対応させる**

```typescript
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://zairoku.com'

  // 静的ページ
  const staticPages = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 1,
    },
    // ... 他の静的ページ
  ]

  // 動的ページ (例: ブログ記事)
  const blogPosts = await fetchBlogPosts() // DB or CMS から取得
  const blogPages = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(post.updatedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...blogPages]
}
```

2. **デプロイ**
   - 新しい記事を追加するたびに、サイトマップが自動更新される

---

## ✅ 確認方法

### ローカル環境で確認

```bash
npm run dev
```

- **サイトマップ**: http://localhost:3000/sitemap.xml
- **robots.txt**: http://localhost:3000/robots.txt

### 本番環境で確認

- **サイトマップ**: https://zairoku.com/sitemap.xml
- **robots.txt**: https://zairoku.com/robots.txt

### Google Search Console で確認

1. https://search.google.com/search-console にログイン
2. 「サイトマップ」→ステータスが「成功しました」になっているか確認
3. 「カバレッジ」→「有効」タブで、インデックスされたページ数を確認

---

## 🚨 注意事項

### セキュリティ

- **絶対にログインが必要なページをサイトマップに含めない**
  - ダッシュボード、管理画面、個人情報を含むページは除外
- **robots.txt だけでは不十分**
  - robots.txt はあくまで「お願い」であり、強制力はない
  - 認証が必要なページは必ず認証ミドルウェアで保護する

### パフォーマンス

- **サイトマップは50,000 URL以下に抑える**
  - それを超える場合は、サイトマップインデックスファイルを使用
- **動的生成の場合、キャッシュを活用**
  - 毎回DBクエリを実行しないよう、適切にキャッシュする

---

## 📚 関連ドキュメント

- **Google Search Console**: https://search.google.com/search-console
- **Bing Webmaster Tools**: https://www.bing.com/webmasters
- **Next.js Sitemap Documentation**: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
- **robots.txt Specification**: https://developers.google.com/search/docs/crawling-indexing/robots/intro

---

## 🔄 更新履歴

| 日付 | 変更内容 | 担当者 |
|------|----------|--------|
| 2026-01-19 | 初版作成 | - |
| 2026-01-19 | 実装完了（app/sitemap.ts, public/robots.txt を作成） | - |

---

## 📝 実装完了内容（2026-01-19）

### 実装したファイル

#### 1. **app/sitemap.ts**

実際の公開ページ7ページを含むサイトマップを作成しました:

| # | ページ | パス | 優先度 | 更新頻度 |
|---|--------|------|--------|----------|
| 1 | トップページ | `/` | 1.0 | monthly |
| 2 | 問い合わせフォーム | `/contact` | 0.8 | monthly |
| 3 | 資料請求フォーム | `/request-demo` | 0.8 | monthly |
| 4 | 資料請求完了 | `/request-demo/success` | 0.5 | yearly |
| 5 | プライバシーポリシー | `/privacy-policy` | 0.5 | yearly |
| 6 | 特定商取引法表記 | `/commercial-law` | 0.5 | yearly |
| 7 | ログインヘルプ | `/help/login` | 0.6 | monthly |

**特徴:**
- 環境変数 `NEXT_PUBLIC_APP_URL` を使用（ローカル: `http://localhost:3000`, 本番: `https://zairoku.com`）
- 将来のブログ・お知らせ追加に対応できるよう、動的生成のコメント例を含む
- `async function` で実装し、将来の拡張に備える

**実装コード（抜粋）:**
```typescript
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://zairoku.com'

  // 7つの公開ページを定義
  // + 将来のブログ/お知らせ追加のためのコメント例
}
```

#### 2. **public/robots.txt**

認証が必要なページをすべて除外し、公開ページのみを許可する設定を作成しました。

**除外対象（Disallow）:**
- 認証ページ: `/login`, `/auth/`, `/reset-password`
- 管理画面: `/admin/`, `/dashboard`
- 機能ページ: `/tools/`, `/equipment/`, `/consumables/`, `/projects/` など約30パス
- API: `/api/`
- その他: `/maintenance`, `/error/`

**許可対象（Allow）:**
- `/`, `/contact`, `/request-demo`, `/privacy-policy`, `/commercial-law`, `/help/`

**サイトマップURL:**
- `https://zairoku.com/sitemap.xml`

### 変更点・追加点

#### 初期計画からの変更

1. **環境変数の名称**
   - 計画: `NEXT_PUBLIC_BASE_URL`
   - 実装: `NEXT_PUBLIC_APP_URL` （既存の環境変数を使用）

2. **公開ページ数**
   - 計画段階で想定したページと実際のページを照合
   - 実際の `app/(public)/` ディレクトリ構造を確認し、7ページを特定

3. **サイトマップ関数の型**
   - `async function` で実装（将来の動的生成に備える）
   - 戻り値の型: `Promise<MetadataRoute.Sitemap>`

4. **robots.txt の詳細化**
   - 実際のルーティング構造を調査し、すべての認証必須パスを列挙
   - 約30種類の機能パスを `Disallow` に追加

### 動作確認結果

#### ローカル環境 (`http://localhost:3000`)

✅ **sitemap.xml**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>http://localhost:3000</loc>
    <lastmod>2026-01-19T07:05:13.828Z</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1</priority>
  </url>
  <!-- ... 残り6ページ -->
</urlset>
```

✅ **robots.txt**
- 全ルールが正しく表示されることを確認
- サイトマップURLが `https://zairoku.com/sitemap.xml` として記載

#### ビルド確認

```bash
npm run build
```
- ✅ ビルド成功
- ✅ 280ページの静的生成完了
- ⚠️ `metadataBase` の警告あり（SEO対策として今後設定推奨）

### 今後の対応が必要な項目

#### 1. Vercel本番環境の環境変数設定

**Vercelダッシュボードで以下を設定:**
```
NEXT_PUBLIC_APP_URL=https://zairoku.com
```

または、既存の環境変数名を確認して統一する。

#### 2. Google Search Console 登録

[docs/SEO_SITEMAP_ROBOTS.md](docs/SEO_SITEMAP_ROBOTS.md) の「検索エンジンへの登録方法」セクションを参照して、以下を実施:
1. Google Search Console にサイトを登録
2. 所有権を確認
3. サイトマップ（`https://zairoku.com/sitemap.xml`）を送信

#### 3. Bing Webmaster Tools 登録

同様に Bing にもサイトを登録。

#### 4. metadataBase の設定（推奨）

`app/layout.tsx` に以下を追加すると、OGP画像などのSEO対策が強化されます:

```typescript
export const metadata: Metadata = {
  metadataBase: new URL('https://zairoku.com'),
  // ... 既存のmetadata
}
```

---

## 💡 よくある質問 (FAQ)

### Q1: サイトマップを更新したら、いつインデックスされますか？

**A**: 通常、数日〜2週間かかります。Google Search Console で「インデックス登録をリクエスト」すると早まる場合があります。

### Q2: robots.txt で Disallow したページが検索結果に出てきます

**A**: robots.txt はクロールを禁止するだけで、既にインデックスされたページは削除されません。Google Search Console で「削除リクエスト」を送る必要があります。

### Q3: サイトマップに載っていないページもインデックスされますか？

**A**: はい。Googleは外部リンクや内部リンクを辿ってページを発見します。サイトマップは「優先的に見てほしいページ」を教えるものです。

---

## 📞 サポート

質問や問題がある場合は、開発チームに連絡してください。
