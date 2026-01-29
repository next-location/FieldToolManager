# 本番環境マイグレーション手順

## ⚠️ 重要：レート制限機能のデプロイ手順

レート制限がSupabaseベースに変更されたため、**本番デプロイ前に必ずSupabaseのテーブルを作成してください**。

---

## 手順1: Supabase Dashboardでマイグレーション実行

### 1-1. Supabase Dashboardにアクセス

https://supabase.com/dashboard → プロジェクト選択 → **SQL Editor**

### 1-2. 以下のSQLを実行

```sql
-- レート制限テーブル
-- サーバーレス環境でレート制限を実現するためのストレージ

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL UNIQUE, -- IPアドレスまたは識別子
  count INTEGER NOT NULL DEFAULT 1, -- リクエスト回数
  reset_at TIMESTAMPTZ NOT NULL, -- リセット時刻
  blocked_until TIMESTAMPTZ, -- ブロック解除時刻（nullの場合はブロックなし）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_at ON rate_limits(reset_at);
CREATE INDEX IF NOT EXISTS idx_rate_limits_updated_at ON rate_limits(updated_at);

-- RLSポリシー（サービスロールキーでのみアクセス可能）
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- サービスロールキーからのアクセスを許可
-- 注: 通常のユーザーはこのテーブルにアクセスできない
CREATE POLICY "Service role can manage rate limits"
ON rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- コメント追加
COMMENT ON TABLE rate_limits IS 'サーバーレス環境でのレート制限を管理するテーブル';
COMMENT ON COLUMN rate_limits.identifier IS 'IPアドレスまたは識別子（例: 192.168.1.1）';
COMMENT ON COLUMN rate_limits.count IS '現在の時間窓内でのリクエスト回数';
COMMENT ON COLUMN rate_limits.reset_at IS 'カウントがリセットされる時刻';
COMMENT ON COLUMN rate_limits.blocked_until IS 'ブロック解除時刻（nullの場合はブロックなし）';
```

### 1-3. 実行確認

「Success. No rows returned」と表示されればOK

---

## 手順2: テーブル作成を確認

Supabase Dashboard → **Table Editor** → 「rate_limits」テーブルが表示されることを確認

---

## 手順3: Vercel環境変数を確認

Vercel Dashboard → Settings → Environment Variables

以下が設定されていることを確認：

- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `RESEND_API_KEY`

---

## 手順4: Gitコミット & デプロイ

```bash
# 変更をコミット
git add .
git commit -m "fix: use Supabase-based rate limiting for serverless compatibility"
git push origin main
```

Vercelが自動的にデプロイを開始します。

---

## 手順5: デプロイ後の動作確認

### 5-1. お問い合わせフォームで4回送信テスト

1. https://zairoku.com/contact にアクセス
2. 同じ内容で **4回連続** 送信
3. **4回目** で「リクエスト制限に達しました」エラーが表示されることを確認

### 5-2. Supabaseでデータ確認

Supabase Dashboard → Table Editor → `rate_limits`

- レコードが作成されている
- `identifier` にIPアドレスが記録されている
- `count` が正しくカウントされている

### 5-3. Vercelログ確認

```bash
vercel logs
```

以下のログが出力されることを確認：

```
[Contact Form] Rate limit check passed: IP=xxx.xxx.xxx.xxx, remaining=2
[Contact Form] Rate limit check passed: IP=xxx.xxx.xxx.xxx, remaining=1
[Contact Form] Rate limit check passed: IP=xxx.xxx.xxx.xxx, remaining=0
[Contact Form] Rate limit exceeded from IP: xxx.xxx.xxx.xxx, remaining=0
```

---

## トラブルシューティング

### エラー: 「relation "rate_limits" does not exist」

**原因**: テーブルがまだ作成されていない

**解決策**: 手順1を再実行してテーブルを作成

---

### エラー: 「permission denied for table rate_limits」

**原因**: RLSポリシーが正しく設定されていない

**解決策**:

1. Supabase Dashboard → Authentication → Policies
2. `rate_limits`テーブルのポリシーを確認
3. 「Service role can manage rate limits」ポリシーが存在することを確認

---

### レート制限が効かない

**原因1**: Supabase環境変数が設定されていない

**解決策**: Vercel Dashboard → Settings → Environment Variables で確認

**原因2**: テーブルが作成されていない

**解決策**: 手順1を実行

---

## ロールバック手順（緊急時）

もし問題が発生した場合は、以下のコマンドで前のバージョンに戻せます：

```bash
git revert HEAD
git push origin main
```

---

## 完了チェックリスト

- [ ] Supabase Dashboardで`rate_limits`テーブルを作成
- [ ] Vercel環境変数を確認
- [ ] Gitコミット & プッシュ
- [ ] Vercelデプロイ完了
- [ ] お問い合わせフォームで4回送信テスト成功
- [ ] Supabaseで`rate_limits`テーブルにデータが記録されている
- [ ] Vercelログで「Rate limit exceeded」が表示されている

---

すべて✅になったら完了です！🎉
