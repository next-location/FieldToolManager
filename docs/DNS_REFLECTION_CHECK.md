# DNS反映確認とテスト環境マイグレーション再開手順

**作成日**: 2025-12-23
**目的**: DNS反映後、スムーズにテスト環境マイグレーションを再開する

---

## 📋 作業再開時のプロンプト（このままコピペしてください）

```
test-zairoku.com のDNS反映が完了しました。
PRODUCTION_MIGRATION_LOG.md の Task 21（テスト環境マイグレーション実行）から再開してください。
```

---

## ✅ DNS反映確認方法

### 方法1: ブラウザで確認（簡単）

```
https://test-zairoku.com
```

にアクセスして以下を確認：

**期待される動作**:
- ✅ Vercelログイン画面が表示される → **DNS反映完了**
- ❌ 「Forbidden」エラー → DNS未反映（もう少し待つ）
- ❌ 「このサイトにアクセスできません」 → DNS未反映

---

### 方法2: コマンドで確認（詳細）

```bash
dig test-zairoku.com
```

**期待される結果**:
```
;; ANSWER SECTION:
test-zairoku.com.  3600  IN  CNAME  cname.vercel-dns.com.
```

`cname.vercel-dns.com` が表示されれば **DNS反映完了**

---

## 📋 再開時の作業内容（参考）

### Task 21: テスト環境マイグレーション実行

1. **スクリプト実行**:
   ```bash
   ./scripts/migrate-test.sh
   ```

2. **確認プロンプトで `yes` を入力**

3. **マイグレーション適用完了を確認**

4. **Supabaseダッシュボードでテーブル確認**

5. **PRODUCTION_MIGRATION_LOG.md に記録**

---

## 🔄 現在の作業状態（2025-12-23 1:10時点）

### 完了済み
- ✅ test-zairoku.com ドメイン取得
- ✅ DNS設定（お名前.com）
- ✅ Vercel ドメイン設定
- ✅ Vercel 環境変数設定
- ✅ マイグレーションスクリプト作成

### 待機中
- ⏳ DNS反映（数時間〜24時間）

### 次のタスク
- ⏳ テスト環境マイグレーション実行（DNS反映後）

---

## 📞 困った時

### Vercelダッシュボードでドメイン状態確認

1. https://vercel.com/dashboard
2. field-tool-manager → Settings → Domains
3. `test-zairoku.com` の Status を確認:
   - ✅ **Valid Configuration** → DNS反映完了、マイグレーション実行可能
   - ⚠️ **Pending Verification** → DNS反映待ち
   - ❌ **Invalid Configuration** → DNS設定エラー（サポートに連絡）

---

**DNS反映が確認できたら、上記のプロンプトをコピペして再開してください。**
