# テスト環境構築実装タスク

**作成日**: 2025-12-22
**ステータス**: 実装準備中
**優先度**: 🔴 最高優先

---

## 📋 概要

本番環境（zairoku.com）とローカル環境の間にテスト環境を構築し、安全なデプロイフローを確立します。

### 主要な課題

1. **ローカル環境**: 115個のマイグレーション適用済み
2. **本番環境**: 基本テーブル（3ステップ）のみ
3. **差分**: 約112個のマイグレーション未適用
4. **問題**: ローカルで開発した機能が本番で動作しない

---

## 🏗️ テスト環境の設計

### ドメイン構成

| 環境 | ドメイン | サブドメイン方式 |
|------|---------|----------------|
| **本番** | `zairoku.com` | `{org-subdomain}.zairoku.com` |
| **テスト** | `test-zairoku.com` | `{org-subdomain}.test-zairoku.com` |
| **ローカル** | `localhost:3000` | `{org-subdomain}.localhost:3000` |

### なぜ `test.zairoku.com` ではダメなのか？

**問題点**:
```
test.zairoku.com の場合：
↓
middleware.tsがサブドメイン "test" として解釈
↓
organizations テーブルで subdomain='test' の組織を検索
↓
存在しない → エラー画面
```

**正しい設計**:
```
test-zairoku.com の場合：
↓
ルートドメイン（メインドメイン）として扱われる
↓
サブドメイン: {org-subdomain}.test-zairoku.com
例: a7k3m9x2.test-zairoku.com
```

---

## 📝 実装タスクリスト

### Phase 1: ドメイン取得とDNS設定

#### Task 1.1: test-zairoku.com ドメイン取得

**実施者**: 手動（お名前.com）

**手順**:
1. お名前.com にログイン
2. ドメイン検索: `test-zairoku.com`
3. カートに追加
4. **不要なオプションを外す**:
   - ❌ Whois情報公開代行メール転送オプション（不要）
   - ❌ ドメインプロテクション（不要）
   - ❌ SSL証明書（Vercelが無料提供）
5. 購入完了（約¥1,500/年）

**完了条件**:
- [ ] `test-zairoku.com` ドメイン取得完了
- [ ] お名前.com管理画面でドメイン確認

---

#### Task 1.2: DNS設定（ワイルドカード対応）

**実施者**: 手動（お名前.com）

**設定内容**:
```
# ルートドメイン（Vercel）
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: 3600

# ワイルドカードサブドメイン（全組織用）
Type: CNAME
Name: *
Value: cname.vercel-dns.com
TTL: 3600
```

**手順**:
1. お名前.com Navi にログイン
2. ドメイン設定 → DNS設定
3. `test-zairoku.com` を選択
4. 上記2つのCNAMEレコードを追加
5. 保存

**完了条件**:
- [ ] ルートドメインのCNAME設定完了
- [ ] ワイルドカードのCNAME設定完了
- [ ] DNS反映確認（`dig test-zairoku.com`）

**注意**:
- DNS反映には最大48時間かかる場合があるが、通常は数分〜数時間

---

### Phase 2: Supabase テスト環境構築

#### Task 2.1: Supabase プロジェクト作成

**実施者**: 手動（Supabaseダッシュボード）

**手順**:
1. Supabase Dashboard にログイン
2. Organization: `zairoku` を選択
3. **New project** をクリック
4. 設定:
   - **Name**: `zairoku-test`
   - **Database Password**: 強固なパスワード生成（記録必須）
   - **Region**: Northeast Asia (Tokyo)
   - **Pricing Plan**: Free
5. **Create new project** をクリック
6. プロジェクト作成完了を待つ（約2分）

**完了条件**:
- [x] プロジェクト作成完了（既に完了）
- [x] Project URL取得: `https://vtbyuxnaukaomptklotp.supabase.co`
- [x] API Keys取得:
  - Anon key: `sb_publishable_PpWYxBUkM259UhJi2m8wew_ST6CTrto`
  - Service role key: `sb_secret_EslnJoKByGZaLqAIiRiudw_Ea6UwD0Y`

---

#### Task 2.2: .env.test ファイル作成

**実施者**: ローカル環境

**ファイル**: `.env.test`

**内容**:
```bash
# Supabase Test Environment
NEXT_PUBLIC_SUPABASE_URL=https://vtbyuxnaukaomptklotp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_PpWYxBUkM259UhJi2m8wew_ST6CTrto
SUPABASE_SERVICE_ROLE_KEY=sb_secret_EslnJoKByGZaLqAIiRiudw_Ea6UwD0Y
DATABASE_URL=postgresql://postgres:vXGeUZc61wMri8fuj1OL2EBP0@db.vtbyuxnaukaomptklotp.supabase.co:5432/postgres

# NextAuth
NEXTAUTH_URL=https://test-zairoku.com
NEXTAUTH_SECRET=p/gdvGpaj3ad00XIvEfkEfSRfM08pDGuKuZZVq3Lnp0=

# Super Admin
SUPER_ADMIN_JWT_SECRET=rUZmmLqnu9HLaSLmgmS5g7lCuYRIwWQQs3y+sJEyJEI=

# Stripe (Test Keys)
STRIPE_SECRET_KEY=<Vercelダッシュボードで設定>
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<Vercelダッシュボードで設定>

# Cron
CRON_SECRET=rUZmmLqnu9HLaSLmgmS5g7lCuYRIwWQQs3y+sJEyJEI=

# Environment
NODE_ENV=test
```

**完了条件**:
- [x] `.env.test` ファイル作成完了
- [x] `.gitignore` に `.env.test` 追加完了

---

### Phase 3: Vercel テスト環境設定

#### Task 3.1: Vercel ドメイン設定

**実施者**: 手動（Vercelダッシュボード）

**手順**:
1. Vercel Dashboard にログイン
2. **field-tool-manager** プロジェクトを選択
3. **Settings** → **Domains** に移動
4. **Add Domain** をクリック
5. ドメイン入力: `test-zairoku.com`
6. **Add** をクリック
7. Git Branch: **test** を選択
8. SSL証明書の自動発行を待つ（約5分）

**ワイルドカードドメイン設定**:
9. 再度 **Add Domain** をクリック
10. ドメイン入力: `*.test-zairoku.com`
11. **Add** をクリック
12. Git Branch: **test** を選択

**完了条件**:
- [ ] `test-zairoku.com` ドメイン追加完了
- [ ] `*.test-zairoku.com` ワイルドカード設定完了
- [ ] SSL証明書発行完了（Vercel画面で確認）
- [ ] DNS検証成功

---

#### Task 3.2: Vercel 環境変数設定（Preview環境）

**実施者**: 手動（Vercelダッシュボード）

**手順**:
1. Vercel Dashboard → **field-tool-manager** → **Settings** → **Environment Variables**
2. 以下の11個の環境変数を追加（**すべてSensitiveにチェック**）

**重要**: 各変数で **Preview** のみチェック（Production、Developmentはチェックしない）

| 変数名 | 値 | Sensitive |
|--------|---|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://vtbyuxnaukaomptklotp.supabase.co` | ✅ ON |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_PpWYxBUkM259UhJi2m8wew_ST6CTrto` | ✅ ON |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_EslnJoKByGZaLqAIiRiudw_Ea6UwD0Y` | ✅ ON |
| `DATABASE_URL` | `postgresql://postgres:vXGeUZc61wMri8fuj1OL2EBP0@db.vtbyuxnaukaomptklotp.supabase.co:5432/postgres` | ✅ ON |
| `NEXTAUTH_URL` | `https://test-zairoku.com` | ✅ ON |
| `NEXTAUTH_SECRET` | `p/gdvGpaj3ad00XIvEfkEfSRfM08pDGuKuZZVq3Lnp0=` | ✅ ON |
| `SUPER_ADMIN_JWT_SECRET` | `rUZmmLqnu9HLaSLmgmS5g7lCuYRIwWQQs3y+sJEyJEI=` | ✅ ON |
| `STRIPE_SECRET_KEY` | `<Vercelダッシュボードで設定>` | ✅ ON |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `<Vercelダッシュボードで設定>` | ✅ ON |
| `CRON_SECRET` | `rUZmmLqnu9HLaSLmgmS5g7lCuYRIwWQQs3y+sJEyJEI=` | ✅ ON |
| `NODE_ENV` | `test` | ✅ ON |

**完了条件**:
- [ ] 11個の環境変数すべて追加完了
- [ ] すべてSensitiveにチェック済み
- [ ] Preview環境のみに適用確認

---

#### Task 3.3: Vercel パスワード保護設定

**実施者**: 手動（Vercelダッシュボード）

**手順**:
1. Vercel Dashboard → **field-tool-manager** → **Settings**
2. **Deployment Protection** に移動
3. **Vercel Authentication** または **Password Protection** を選択
4. **Password Protection** を推奨:
   - パスワード設定: 強固なパスワード（記録必須）
5. 環境選択: **Preview** のみチェック
6. **Save** をクリック

**完了条件**:
- [ ] Password Protection有効化完了
- [ ] Preview環境のみに適用確認
- [ ] パスワードを安全に記録

**テスト方法**:
```
1. testブランチをプッシュ
2. https://test-zairoku.com にアクセス
3. パスワード入力画面が表示されることを確認
4. 正しいパスワードでログイン成功を確認
```

---

### Phase 4: Git ブランチ戦略

#### Task 4.1: test ブランチ作成とプッシュ

**実施者**: ローカル環境

**コマンド**:
```bash
# testブランチ作成（mainから派生）
git checkout main
git pull origin main
git checkout -b test

# .gitignoreの確認（.env.testが含まれているか）
cat .gitignore | grep .env.test

# testブランチをリモートにプッシュ
git push -u origin test
```

**完了条件**:
- [x] testブランチ作成完了
- [x] GitHubにプッシュ完了
- [ ] Vercel自動デプロイ開始確認

---

#### Task 4.2: GitHub ブランチ保護設定

**実施者**: 手動（GitHub）

**手順**:
1. GitHub → **FieldToolManager** リポジトリ → **Settings**
2. **Branches** → **Branch protection rules**
3. **Add rule** をクリック
4. Branch name pattern: `test`
5. 設定:
   - ✅ Require a pull request before merging
   - ✅ Require approvals (1)
   - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
   - ✅ Require branches to be up to date before merging
6. **Create** をクリック

**完了条件**:
- [ ] testブランチ保護ルール作成完了
- [ ] 直接プッシュ禁止確認
- [ ] PR必須確認

---

### Phase 5: マイグレーション適用スクリプト作成

#### Task 5.1: migrate-test.sh スクリプト作成

**実施者**: コード実装

**ファイル**: `scripts/migrate-test.sh`

**内容**:
```bash
#!/bin/bash

# テスト環境マイグレーション適用スクリプト
set -e

echo "🚀 テスト環境へのマイグレーション適用を開始します..."

# 環境変数読み込み
source .env.test

# マイグレーションファイル数確認
MIGRATION_COUNT=$(ls supabase/migrations/*.sql | wc -l)
echo "📊 適用予定のマイグレーション数: $MIGRATION_COUNT"

# 確認プロンプト
read -p "テスト環境にマイグレーションを適用しますか？ (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "❌ キャンセルしました"
  exit 0
fi

# Supabase CLI でマイグレーション適用
echo "⏳ マイグレーションを適用中..."
npx supabase db push --db-url "$DATABASE_URL"

echo "✅ マイグレーション適用完了！"
```

**完了条件**:
- [ ] `scripts/migrate-test.sh` 作成完了
- [ ] 実行権限付与: `chmod +x scripts/migrate-test.sh`
- [ ] エラーハンドリング確認

---

#### Task 5.2: migrate-production-safe.sh スクリプト作成

**実施者**: コード実装

**ファイル**: `scripts/migrate-production-safe.sh`

**内容**:
```bash
#!/bin/bash

# 本番環境安全マイグレーション適用スクリプト
set -e

echo "🚨 本番環境へのマイグレーション適用を開始します..."
echo "⚠️  この操作は本番データベースに影響します"

# 環境変数読み込み
source .env.production

# バックアップ確認
echo "📦 バックアップの確認..."
read -p "Supabaseダッシュボードでバックアップを取得しましたか？ (yes/no): " BACKUP_CONFIRM
if [ "$BACKUP_CONFIRM" != "yes" ]; then
  echo "❌ まずバックアップを取得してください"
  exit 1
fi

# マイグレーションファイル数確認
MIGRATION_COUNT=$(ls supabase/migrations/*.sql | wc -l)
echo "📊 適用予定のマイグレーション数: $MIGRATION_COUNT"

# 最終確認
read -p "本番環境にマイグレーションを適用しますか？ (yes/no): " FINAL_CONFIRM
if [ "$FINAL_CONFIRM" != "yes" ]; then
  echo "❌ キャンセルしました"
  exit 0
fi

# Supabase CLI でマイグレーション適用
echo "⏳ マイグレーションを適用中..."
npx supabase db push --db-url "$DATABASE_URL"

echo "✅ マイグレーション適用完了！"
echo "🔍 本番環境で動作確認を行ってください"
```

**完了条件**:
- [ ] `scripts/migrate-production-safe.sh` 作成完了
- [ ] 実行権限付与: `chmod +x scripts/migrate-production-safe.sh`
- [ ] バックアップ確認プロンプト確認

---

### Phase 6: テスト環境でのマイグレーション適用

#### Task 6.1: テスト環境マイグレーション実行

**実施者**: ローカル環境

**手順**:
```bash
# 1. スクリプト実行
./scripts/migrate-test.sh

# 2. エラーがないか確認
# - エラーが出た場合は内容を記録
# - ロールバックが必要か判断

# 3. Supabaseダッシュボードで確認
# - Table Editorでテーブル構造確認
# - SQL Editorでクエリ実行テスト
```

**完了条件**:
- [ ] 115個のマイグレーションすべて適用完了
- [ ] エラーなし
- [ ] テーブル構造確認完了

---

#### Task 6.2: テストデータ投入

**実施者**: ローカル環境

**手順**:
1. Supabaseダッシュボード → SQL Editor
2. テスト組織作成:
```sql
-- テスト組織作成
INSERT INTO organizations (name, subdomain, is_active)
VALUES ('テスト建設株式会社', 'testorg01', true)
RETURNING id;

-- テストユーザー作成（上記のorganization_idを使用）
-- ...
```

3. 各機能の動作確認:
   - 道具管理
   - 出退勤管理
   - 作業報告書
   - 帳票管理

**完了条件**:
- [ ] テスト組織作成完了
- [ ] テストユーザー作成完了
- [ ] 各機能の基本動作確認完了

---

### Phase 7: 本番環境へのマイグレーション適用

#### Task 7.1: 本番環境バックアップ取得

**実施者**: 手動（Supabaseダッシュボード）

**手順**:
1. Supabase Dashboard → **zairoku-production** → **Database**
2. **Backups** タブ → **Create backup**
3. バックアップ名: `pre-migration-backup-YYYYMMDD`
4. **Create** をクリック
5. バックアップ完了を確認

**完了条件**:
- [ ] バックアップ作成完了
- [ ] バックアップファイル確認

---

#### Task 7.2: 本番環境マイグレーション実行

**実施者**: ローカル環境

**手順**:
```bash
# 1. スクリプト実行
./scripts/migrate-production-safe.sh

# 2. バックアップ確認プロンプト → yes
# 3. 最終確認プロンプト → yes
# 4. マイグレーション適用実行
```

**完了条件**:
- [ ] マイグレーション適用完了
- [ ] エラーなし
- [ ] 本番環境で動作確認完了

---

## 🔒 セキュリティチェックリスト

- [x] `.env.test` が `.gitignore` に含まれている
- [x] `.env.production` が `.gitignore` に含まれている
- [ ] Vercel環境変数すべてSensitiveに設定
- [ ] 本番環境の環境変数もSensitiveに変更
- [ ] テスト環境にパスワード保護設定
- [ ] GitHubブランチ保護ルール設定

---

## 📊 完了基準

### テスト環境構築完了の定義

✅ すべての以下の条件を満たす：

1. **ドメイン**:
   - [ ] `test-zairoku.com` 取得完了
   - [ ] DNS設定完了（ワイルドカード含む）
   - [ ] Vercelドメイン追加完了
   - [ ] SSL証明書発行完了

2. **Supabase**:
   - [x] テストプロジェクト作成完了
   - [ ] 115個のマイグレーション適用完了
   - [ ] テストデータ投入完了

3. **Vercel**:
   - [ ] 環境変数設定完了（11個）
   - [ ] パスワード保護設定完了
   - [ ] testブランチ自動デプロイ成功

4. **Git**:
   - [x] testブランチ作成・プッシュ完了
   - [ ] ブランチ保護ルール設定完了

5. **動作確認**:
   - [ ] `https://test-zairoku.com` アクセス成功
   - [ ] パスワード保護動作確認
   - [ ] テスト組織ログイン成功
   - [ ] 主要機能動作確認

---

## 🚨 トラブルシューティング

### DNS反映されない場合

```bash
# DNS確認コマンド
dig test-zairoku.com
dig *.test-zairoku.com

# 期待される結果
# ANSWER SECTION に cname.vercel-dns.com が含まれる
```

### Vercelドメイン追加でエラー

- DNSが反映されていない可能性（最大48時間待つ）
- CNAMEレコードが正しいか確認

### マイグレーション適用でエラー

- エラーメッセージを記録
- 該当するマイグレーションファイルを確認
- ロールバックが必要か判断

---

## 📅 実施スケジュール

| フェーズ | タスク | 所要時間 | 担当 |
|---------|--------|---------|------|
| Phase 1 | ドメイン取得・DNS設定 | 1-2日 | 手動 |
| Phase 2 | Supabase構築 | 10分 | 手動 |
| Phase 3 | Vercel設定 | 30分 | 手動 |
| Phase 4 | Git設定 | 15分 | 手動 |
| Phase 5 | スクリプト作成 | 1時間 | コード |
| Phase 6 | テスト環境マイグレーション | 1-2時間 | 実行 |
| Phase 7 | 本番環境マイグレーション | 2-3時間 | 実行 |

**合計**: 約3-4日

---

**次のステップ**: Phase 1（ドメイン取得）から開始
