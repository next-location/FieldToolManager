# 本番環境デプロイ手順書 - スーパー管理者セキュリティ強化

**デプロイ日時**: 2025-12-31
**担当者**: あなた（マスターアカウント）
**所要時間**: 約15-20分

---

## 📋 デプロイ内容まとめ

### 実装完了機能（すべて完成）
1. ✅ スーパー管理者用セッションタイムアウト（30分）
2. ✅ メール認証付きパスワード変更機能
3. ✅ スーパー管理者ログイン通知（system@zairoku.comに送信）
4. ✅ 営業アカウントのパスワードリセット機能
5. ✅ 2FA設定CSRFエラー修正
6. ✅ サイドメニューに「パスワード変更」リンク追加
7. ✅ **日本国内IP制限（NEW）**
8. ✅ **不正ログイン警告（ログイン失敗5回・2FA失敗3回・日本国外IP）（NEW）**

---

## 🚀 デプロイ手順

### STEP 1: データベースマイグレーション実行（3つのマイグレーション）

**いつ**: 今すぐ実行してください
**どこで**: あなたのMacのターミナル
**誰が**: あなた
**何をする**: 3つの新しいテーブル・設定を本番データベースに作成

#### 実行コマンド（3つ実行）

```bash
cd /Users/youichiakashi/FieldToolManager

# 1. パスワード変更トークンテーブル作成
PGPASSWORD="cF1!hVERlDgjMD" psql -h db.ecehilhaxgwphvamvabj.supabase.co -p 5432 -U postgres -d postgres -f supabase/migrations/20251231000001_add_password_change_tokens.sql

# 2. ログイン試行履歴テーブル作成
PGPASSWORD="cF1!hVERlDgjMD" psql -h db.ecehilhaxgwphvamvabj.supabase.co -p 5432 -U postgres -d postgres -f supabase/migrations/20251231000002_add_login_attempts.sql

# 3. IP制限設定を追加
PGPASSWORD="cF1!hVERlDgjMD" psql -h db.ecehilhaxgwphvamvabj.supabase.co -p 5432 -U postgres -d postgres -f supabase/migrations/20251231000003_add_ip_restriction_settings.sql
```

#### 期待される出力

**1つ目のマイグレーション（password_change_tokens）:**
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
ALTER TABLE
CREATE POLICY
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
```

**2つ目のマイグレーション（login_attempts）:**
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
CREATE INDEX
ALTER TABLE
CREATE POLICY
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
COMMENT
```

**3つ目のマイグレーション（ip_restriction_settings）:**
```
INSERT 0 1
COMMENT
```

#### エラーが出た場合

- **エラー**: `psql: error: could not translate host name`
  - **原因**: インターネット接続の問題
  - **対処**: ネットワーク接続を確認して再実行

- **エラー**: `relation "password_change_tokens" already exists`
  - **原因**: すでにマイグレーション済み
  - **対処**: 問題なし、STEP 2に進む

---

### STEP 2: コードのビルド確認

**いつ**: マイグレーション実行後すぐ
**どこで**: あなたのMacのターミナル
**誰が**: あなた
**何をする**: コードにエラーがないか確認

#### 実行コマンド

```bash
npm run build
```

#### 期待される結果

```
✓ Compiled successfully
```

最後に`✓ Compiled successfully`が表示されればOK。

#### エラーが出た場合

エラーメッセージをコピーして私（Claude）に報告してください。

---

### STEP 3: Gitコミット & プッシュ

**いつ**: ビルド成功後すぐ
**どこで**: あなたのMacのターミナル
**誰が**: あなた
**何をする**: 変更をGitにコミットしてVercelに自動デプロイ

#### 実行コマンド

```bash
cd /Users/youichiakashi/FieldToolManager

# 変更ファイルを確認
git status

# 全ファイルをステージング
git add .

# コミット
git commit -m "feat: スーパー管理者セキュリティ強化実装（完全版）

- セッションタイムアウト（30分無操作でログアウト）
- メール認証付きパスワード変更機能
- ログイン通知（system@zairoku.com）
- 営業アカウントパスワードリセット機能
- 2FA設定CSRFエラー修正
- サイドメニューにパスワード変更リンク追加
- 日本国内IP制限（middleware対応）
- 不正ログイン警告（パスワード失敗5回・2FA失敗3回・日本国外IP）"

# 本番環境にプッシュ
git push origin main
```

#### 期待される結果

```
Enumerating objects: XX, done.
...
To github.com:youraccount/FieldToolManager.git
   abc1234..def5678  main -> main
```

---

### STEP 4: Vercelデプロイ確認

**いつ**: git push後1-3分待つ
**どこで**: Vercelダッシュボード
**誰が**: あなた
**何をする**: 自動デプロイが成功したか確認

#### 確認手順

1. ブラウザで https://vercel.com/dashboard にアクセス
2. `FieldToolManager`プロジェクトをクリック
3. 「Deployments」タブを確認
4. 最新のデプロイが「Ready」になるまで待つ（1-3分）

#### 期待される状態

- ✅ ステータス: **Ready** (緑色)
- ✅ ビルド時間: 1-3分程度
- ✅ エラーなし

#### エラーが出た場合

1. Vercelの「View Function Logs」をクリック
2. エラーメッセージをコピー
3. 私（Claude）に報告

---

### STEP 5: 本番環境で動作確認

**いつ**: Vercelデプロイ成功後すぐ
**どこで**: https://zairoku.com
**誰が**: あなた
**何をする**: 実装した機能が正常に動作するか確認

#### 確認項目チェックリスト

##### ✅ 1. ログイン通知
- [ ] https://zairoku.com/admin/login にアクセス
- [ ] マスターアカウント（system@zairoku.com）でログイン
- [ ] **確認**: system@zairoku.comにログイン通知メールが届く
  - 件名: 「【ザイロク】管理者アカウントへのログインがありました」
  - 内容: ログイン日時、IPアドレス、ブラウザ情報

##### ✅ 2. セッションタイムアウト
- [ ] 管理画面にログインしたまま30分放置
- [ ] **確認**: 25分後に警告モーダルが表示される
  - 「管理者セッションがまもなく終了します」
  - 残り時間カウントダウン表示
- [ ] 「セッションを延長」ボタンをクリック
- [ ] **確認**: モーダルが閉じてセッションが延長される

##### ✅ 3. パスワード変更
- [ ] 左サイドメニュー「設定」→「パスワード変更」をクリック
- [ ] **確認**: パスワード変更ページ（/admin/settings/password）が表示される
- [ ] 現在のパスワードを入力して「確認コードを送信」
- [ ] **確認**: system@zairoku.comに6桁の確認コードが届く
  - 件名: 「【ザイロク】パスワード変更の確認コード」
- [ ] 確認コードと新しいパスワードを入力
- [ ] **確認**: パスワード変更完了メッセージが表示される
- [ ] **確認**: system@zairoku.comに変更完了通知が届く

##### ✅ 4. 営業アカウントパスワードリセット（営業アカウントがある場合のみ）
- [ ] 左サイドメニュー「管理者アカウント」をクリック
- [ ] 営業アカウント（role=sales）の行に「パスワードリセット」ボタンが表示される
- [ ] ボタンをクリック
- [ ] **確認**: 確認ダイアログが表示される
- [ ] 「OK」をクリック
- [ ] **確認**: 対象アカウントにリセット通知メールが届く
  - 件名: 「【ザイロク】パスワードがリセットされました」
  - 内容: 16文字の仮パスワード
- [ ] **確認**: system@zairoku.comにも通知が届く

##### ✅ 5. 2FA設定
- [ ] 左サイドメニュー「設定」→「2FA設定」をクリック
- [ ] 「2FAを有効化」ボタンをクリック
- [ ] **確認**: CSRFエラーが出ず、QRコードが表示される
- [ ] （実際に設定する場合は、QRコードをスキャンして設定）

##### ✅ 6. 日本国内IP制限（NEW）
- [ ] VPN等で日本国外のIPアドレスに変更
- [ ] https://zairoku.com/admin にアクセス
- [ ] **確認**: 「アクセスが制限されています」ページ（/error/region-blocked）が表示される
  - 「セキュリティ上の理由により、日本国外からの管理画面へのアクセスは制限されています」
- [ ] VPNをオフにして日本国内IPに戻す
- [ ] **確認**: 通常通り管理画面にアクセスできる

**注意**: IP制限はデフォルトで有効化されています。無効化するにはsystem_settingsテーブルで`ipRestrictionEnabled: false`に設定してください。

##### ✅ 7. 不正ログイン警告（NEW）
- [ ] **テスト1: パスワード失敗5回**
  - 新しいタブでログアウト
  - 間違ったパスワードで5回連続ログイン試行
  - **確認**: system@zairoku.comに警告メールが届く
    - 件名: 「【重要】ザイロク管理者アカウントへの不正アクセスの可能性」
    - 内容: 「ログイン失敗5回連続」

- [ ] **テスト2: 2FA失敗3回**（2FA有効化している場合のみ）
  - 正しいパスワードでログイン
  - 間違った2FAコードを3回連続入力
  - **確認**: system@zairoku.comに警告メールが届く
    - 内容: 「2FA認証失敗」

- [ ] **テスト3: 日本国外IP**
  - VPNで日本国外IPに変更
  - 正しいパスワードとメールアドレスでログイン試行（IP制限を一時的に無効化した場合のみ）
  - **確認**: system@zairoku.comに警告メールが届く
    - 内容: 「日本国外からのアクセス」

---

### STEP 6: トラブルシューティング

#### 問題: メールが届かない

**確認事項**:
1. Vercelの環境変数`RESEND_API_KEY`が設定されているか確認
   - https://vercel.com/youraccount/fieldtoolmanager/settings/environment-variables
2. 迷惑メールフォルダを確認
3. Resendダッシュボードでメール送信ログを確認
   - https://resend.com/emails

**対処方法**:
- 環境変数が未設定の場合: Vercel環境変数に`RESEND_API_KEY`を追加して再デプロイ

#### 問題: セッションタイムアウトが動作しない

**確認事項**:
1. ブラウザのJavaScriptが有効になっているか
2. ブラウザのコンソールにエラーが出ていないか（F12で確認）

**対処方法**:
- コンソールエラーがあれば、スクリーンショットを撮って私に報告

#### 問題: パスワード変更時に「データベースエラー」

**原因**: マイグレーションが未実行の可能性

**対処方法**:
- STEP 1のマイグレーションコマンドを再実行

---

## 📊 デプロイ完了チェックリスト

デプロイ完了後、以下を確認してください:

- [ ] STEP 1: データベースマイグレーション実行完了（3つすべて）
- [ ] STEP 2: ビルド成功確認完了
- [ ] STEP 3: Git push完了
- [ ] STEP 4: Vercelデプロイ成功確認完了
- [ ] STEP 5-1: ログイン通知メール受信確認完了
- [ ] STEP 5-2: セッションタイムアウト動作確認完了
- [ ] STEP 5-3: パスワード変更機能動作確認完了
- [ ] STEP 5-5: 2FA設定CSRFエラー修正確認完了
- [ ] STEP 5-6: 日本国内IP制限動作確認完了（NEW）
- [ ] STEP 5-7: 不正ログイン警告動作確認完了（NEW）

---

## 🎯 デプロイ後にすべきこと

### 優先度：高（今すぐ実施）

1. **マスターアカウントで2FA有効化**
   - https://zairoku.com/admin/settings/2fa
   - Google AuthenticatorまたはMicrosoft Authenticatorをスマホにインストール
   - QRコードをスキャンして設定
   - バックアップコードを安全な場所に保存

### 優先度：中（1週間以内）

2. **営業アカウントの作成とパスワードリセットテスト**
   - テスト用営業アカウントを作成
   - パスワードリセット機能の動作確認

3. **セキュリティ設定の確認**
   - https://zairoku.com/admin/settings/security
   - 2FA推奨設定を確認（必要に応じて有効化）

### 優先度：低（必要に応じて）

4. **IP制限の調整**
   - デフォルトで日本国内IP制限が有効化されています
   - 海外からのアクセスが必要な場合は、system_settingsテーブルで`ipRestrictionEnabled: false`に設定
   - または、特定の国を許可リストに追加することも可能

---

## 📝 デプロイ記録

以下を記録してください:

```
デプロイ実施日時: __________年__月__日 __:__
マイグレーション実行: ✅ / ❌
ビルド成功: ✅ / ❌
デプロイ成功: ✅ / ❌
動作確認完了: ✅ / ❌
問題発生: なし / あり（内容: ____________）
```

---

## ⚠️ 重要な注意事項

1. **マイグレーションは必ず本番環境に実行してください**
   - 実行しないとパスワード変更機能が使えません

2. **デプロイ中はメンテナンス不要**
   - ダウンタイムなしでデプロイされます

3. **ロールバックが必要な場合**
   ```bash
   # 前のコミットに戻す
   git revert HEAD
   git push origin main

   # テーブル削除（必要な場合のみ）
   PGPASSWORD="cF1!hVERlDgjMD" psql -h db.ecehilhaxgwphvamvabj.supabase.co -p 5432 -U postgres -d postgres -c "DROP TABLE IF EXISTS password_change_tokens CASCADE;"
   PGPASSWORD="cF1!hVERlDgjMD" psql -h db.ecehilhaxgwphvamvabj.supabase.co -p 5432 -U postgres -d postgres -c "DROP TABLE IF EXISTS login_attempts CASCADE;"
   ```

4. **2FA設定後は必ずバックアップコードを保存**
   - バックアップコードを失うとログインできなくなります
   - パスワードマネージャーまたは安全な場所に保管

---

## 📞 サポート

問題が発生した場合は、以下の情報を添えて私（Claude）に報告してください:

1. どのステップで問題が発生したか
2. エラーメッセージ（コピー&ペースト）
3. スクリーンショット（該当する場合）
4. 実行したコマンド

---

**デプロイ完了後、このドキュメントを保存しておいてください。**

次回デプロイ時の参考資料として活用できます。
