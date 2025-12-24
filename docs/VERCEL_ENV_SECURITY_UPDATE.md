# Vercel 本番環境変数のセキュリティ更新

**作成日**: 2025-12-22
**優先度**: 🔴 高
**所要時間**: 約15分

---

## 📋 概要

本番環境（Production）の環境変数がSensitiveに設定されていない可能性があります。
すべての機密情報をSensitiveに変更し、ログやダッシュボードに表示されないようにします。

---

## 🔒 対象環境変数（Production環境）

以下の環境変数をSensitiveに変更します：

| 変数名 | 現在 | 変更後 |
|--------|------|--------|
| `DATABASE_URL` | ❌ Not Sensitive | ✅ Sensitive |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ Not Sensitive | ✅ Sensitive |
| `NEXTAUTH_SECRET` | ❌ Not Sensitive | ✅ Sensitive |
| `SUPER_ADMIN_JWT_SECRET` | ❌ Not Sensitive | ✅ Sensitive |
| `STRIPE_SECRET_KEY` | ❌ Not Sensitive | ✅ Sensitive |
| `CRON_SECRET` | ❌ Not Sensitive | ✅ Sensitive |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ❌ Not Sensitive | ✅ Sensitive（推奨）|
| `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY` | ❌ Not Sensitive | ✅ Sensitive（推奨）|
| `NEXT_PUBLIC_SUPABASE_URL` | ❌ Not Sensitive | ⚠️ 任意 |
| `VERCEL_OIDC_TOKEN` | ❌ Not Sensitive | ✅ Sensitive |

---

## 📝 作業手順

### Step 1: Vercel Dashboard にアクセス

1. https://vercel.com/dashboard にログイン
2. **field-tool-manager** プロジェクトを選択
3. **Settings** タブをクリック
4. **Environment Variables** を選択

---

### Step 2: 各環境変数をSensitiveに変更

**重要**: Production環境の環境変数のみを変更します。

#### 変更方法（各環境変数で同じ手順）

1. 環境変数の右側の **「...」（三点リーダー）** をクリック
2. **Edit** を選択
3. **Sensitive** チェックボックスにチェックを入れる
4. **Save** をクリック

---

### Step 3: 対象環境変数リスト

以下の順番で1つずつ変更してください：

#### 🔴 必須（Sensitive ON）

1. **DATABASE_URL**
   - 理由：データベース接続情報（パスワード含む）
   - Environment: Production

2. **SUPABASE_SERVICE_ROLE_KEY**
   - 理由：管理者権限キー
   - Environment: Production

3. **NEXTAUTH_SECRET**
   - 理由：認証の秘密鍵
   - Environment: Production

4. **SUPER_ADMIN_JWT_SECRET**
   - 理由：JWT秘密鍵
   - Environment: Production

5. **STRIPE_SECRET_KEY**
   - 理由：決済秘密鍵
   - Environment: Production

6. **CRON_SECRET**
   - 理由：CRON認証鍵
   - Environment: Production

7. **VERCEL_OIDC_TOKEN**
   - 理由：Vercel認証トークン
   - Environment: Production

#### ⚠️ 推奨（Sensitive ON推奨）

8. **NEXT_PUBLIC_SUPABASE_ANON_KEY**
   - 理由：公開鍵だが保護推奨
   - Environment: Production

9. **NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY**
   - 理由：公開鍵だが保護推奨
   - Environment: Production

#### ⚪ 任意（Sensitive OFF でも可）

10. **NEXT_PUBLIC_SUPABASE_URL**
    - 理由：公開URL
    - Environment: Production

---

### Step 4: 変更完了確認

すべての環境変数を変更後：

1. 環境変数一覧画面で確認
2. Sensitiveな環境変数の値が **`***********`** と表示されていることを確認
3. 本番環境に影響がないか確認（デプロイは不要、既存のデプロイがそのまま動作）

---

## ✅ チェックリスト

変更作業の確認：

- [ ] Vercel Dashboard にログイン完了
- [ ] field-tool-manager プロジェクト選択完了
- [ ] Environment Variables 画面表示完了
- [ ] `DATABASE_URL` をSensitiveに変更
- [ ] `SUPABASE_SERVICE_ROLE_KEY` をSensitiveに変更
- [ ] `NEXTAUTH_SECRET` をSensitiveに変更
- [ ] `SUPER_ADMIN_JWT_SECRET` をSensitiveに変更
- [ ] `STRIPE_SECRET_KEY` をSensitiveに変更
- [ ] `CRON_SECRET` をSensitiveに変更
- [ ] `VERCEL_OIDC_TOKEN` をSensitiveに変更
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` をSensitiveに変更（推奨）
- [ ] `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY` をSensitiveに変更（推奨）
- [ ] すべての値が `***********` と表示されることを確認
- [ ] 本番環境の動作確認（https://zairoku.com）

---

## 🚨 注意事項

1. **再デプロイ不要**
   - 環境変数の変更のみではデプロイは発生しません
   - 既存のデプロイがそのまま動作します

2. **値の確認**
   - Sensitiveに変更後、値を確認する場合は再度Editで表示可能
   - ただし、完全にマスクされるため再入力が必要な場合があります

3. **Production環境のみ**
   - この作業はProduction環境の環境変数のみが対象
   - Preview、Development環境は別途設定

---

## 📊 完了基準

✅ すべての機密情報がSensitiveに設定され、Vercelダッシュボードで値が `***********` と表示される

---

**次のステップ**: [TEST_ENVIRONMENT_IMPLEMENTATION.md](./TEST_ENVIRONMENT_IMPLEMENTATION.md) のテスト環境構築に進む
