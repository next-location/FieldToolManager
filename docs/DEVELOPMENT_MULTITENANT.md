# 開発環境でのマルチテナント機能テスト手順

## 概要

本番環境と同じマルチテナント機能（サブドメインベースの組織識別）を開発環境でテストするための手順です。

## なぜ開発環境でもマルチテナント機能をテストすべきか？

### 問題点
- 本番環境: `a-kensetsu.tool-manager.com` のようなサブドメインで組織を識別
- 開発環境: `localhost:3000` ではサブドメインが使えない
- → 本番と開発で動作が異なると、デプロイ後にバグが発生する可能性が高い

### 解決策
`/etc/hosts` ファイルを編集して、開発環境でもサブドメインをシミュレートする

---

## セットアップ手順

### 1. `/etc/hosts` ファイルを編集

**macOS / Linux の場合:**

```bash
sudo nano /etc/hosts
```

**Windows の場合:**

管理者権限でメモ帳を開き、以下のファイルを編集:
```
C:\Windows\System32\drivers\etc\hosts
```

### 2. 以下の行を追加

```
# Field Tool Manager - 開発環境マルチテナント
127.0.0.1 a-kensetsu.localhost
127.0.0.1 b-tosou.localhost
127.0.0.1 c-denki.localhost
```

### 3. ファイルを保存して閉じる

**macOS / Linux:**
- `Ctrl + O` → Enter（保存）
- `Ctrl + X`（終了）

**Windows:**
- 保存して閉じる

### 4. DNS キャッシュをクリア（推奨）

**macOS:**
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

**Windows:**
```bash
ipconfig /flushdns
```

**Linux:**
```bash
sudo systemd-resolve --flush-caches
```

---

## 使用方法

### 開発サーバーを起動

```bash
npm run dev
```

### 各組織のサブドメインでアクセス

- **A建設**: http://a-kensetsu.localhost:3000
- **B塗装**: http://b-tosou.localhost:3000
- **C電気**: http://c-denki.localhost:3000

### 動作確認

1. それぞれのサブドメインでログイン
2. 異なる組織のデータが**完全に分離**されていることを確認
3. 間違った組織のサブドメインでアクセスした場合、エラーページにリダイレクトされることを確認

---

## テストデータ作成

### 1. 複数の組織を作成

```sql
-- supabase/seed.sql に追加

-- A建設株式会社
INSERT INTO organizations (id, name, subdomain, is_active)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  'A建設株式会社',
  'a-kensetsu',
  true
);

-- B塗装工業
INSERT INTO organizations (id, name, subdomain, is_active)
VALUES (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'B塗装工業',
  'b-tosou',
  true
);

-- C電気工事
INSERT INTO organizations (id, name, subdomain, is_active)
VALUES (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'C電気工事',
  'c-denki',
  true
);
```

### 2. 各組織のユーザーを作成

Supabase Auth で以下のユーザーを作成:

| 組織 | メール | パスワード | 組織ID |
|-----|--------|----------|--------|
| A建設 | admin@a-kensetsu.com | password123 | aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa |
| B塗装 | admin@b-tosou.com | password123 | bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb |
| C電気 | admin@c-denki.com | password123 | cccccccc-cccc-cccc-cccc-cccccccccccc |

### 3. データベースをリセット

```bash
npx supabase db reset
```

---

## セキュリティテストシナリオ

### ✅ 正常系テスト

1. `http://a-kensetsu.localhost:3000` にアクセス
2. `admin@a-kensetsu.com` でログイン
3. A建設のデータだけが見える → ✅

### ❌ 異常系テスト（重要）

#### シナリオ1: 間違った組織のサブドメインでアクセス

1. `http://a-kensetsu.localhost:3000` にアクセス
2. `admin@b-tosou.com` でログイン（B塗装のユーザー）
3. → middleware が検知してエラーページにリダイレクト → ✅

#### シナリオ2: 存在しない組織のサブドメイン

1. `http://invalid-org.localhost:3000` にアクセス
2. → `organizations` テーブルに存在しないため、エラーページにリダイレクト → ✅

#### シナリオ3: RLS（Row Level Security）の動作確認

1. `http://a-kensetsu.localhost:3000` にログイン
2. ブラウザの開発者ツールを開く
3. Supabase クエリを直接実行:
   ```javascript
   // B塗装のデータを取得しようとする
   const { data } = await supabase
     .from('tools')
     .select('*')
     .eq('organization_id', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')

   console.log(data) // → 空配列（RLSで弾かれる）✅
   ```

---

## トラブルシューティング

### 1. サブドメインでアクセスできない

**症状:**
- `http://a-kensetsu.localhost:3000` にアクセスしても「このサイトにアクセスできません」

**原因:**
- `/etc/hosts` の設定が反映されていない
- DNSキャッシュが残っている

**解決策:**
```bash
# DNSキャッシュをクリア（上記参照）

# /etc/hosts の設定を確認
cat /etc/hosts | grep localhost
```

### 2. middleware でエラーが発生する

**症状:**
- 「Invalid organization」エラーが常に表示される

**原因:**
- `organizations` テーブルに該当サブドメインが存在しない
- `subdomain` カラムが一致していない

**解決策:**
```sql
-- サブドメインを確認
SELECT subdomain FROM organizations;

-- データが無い場合は seed.sql を実行
npx supabase db reset
```

### 3. RLSで他組織のデータが見える

**症状:**
- 異なる組織のデータが取得できてしまう

**原因:**
- RLS ポリシーが正しく設定されていない
- `get_organization_id()` 関数が動作していない

**解決策:**
```sql
-- RLS が有効か確認
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- get_organization_id() 関数をテスト
SELECT get_organization_id();
```

---

## 本番環境との違い

| 項目 | 開発環境 | 本番環境 |
|-----|---------|---------|
| **ドメイン** | `*.localhost:3000` | `*.tool-manager.com` |
| **SSL/TLS** | なし（HTTP） | あり（HTTPS） |
| **DNS** | `/etc/hosts` で手動設定 | 実際のDNS設定 |
| **セキュリティ** | middleware + RLS | middleware + RLS + Cloudflare |
| **セッション** | ローカルストレージ | Secure Cookie |

### 本番環境移行時の注意点

1. **DNS設定**: ワイルドカードDNS（`*.tool-manager.com`）を設定
2. **SSL証明書**: ワイルドカード証明書を取得
3. **環境変数**: `NEXT_PUBLIC_APP_URL` を本番ドメインに変更
4. **Supabase**: 本番プロジェクトのURL・APIキーに変更
5. **Cloudflare**: DDoS対策、CDN、SSL設定

---

## まとめ

- `/etc/hosts` を使えば開発環境でも本番と同じマルチテナント機能をテストできる
- middleware と RLS の二重保護が正しく動作することを確認
- 本番デプロイ前に必ず異常系テストを実施すること

## 参考リンク

- [マルチテナントアーキテクチャ設計](./DATABASE_SCHEMA.md#マルチテナント)
- [本番環境移行チェックリスト](./SPECIFICATION_SAAS_FINAL.md#phase-5-本番リリース)
