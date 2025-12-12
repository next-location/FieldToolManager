# 2要素認証（2FA）実装ガイド

## 目次
1. [概要](#概要)
2. [技術仕様](#技術仕様)
3. [セットアップ手順](#セットアップ手順)
4. [使い方](#使い方)
5. [API仕様](#api仕様)
6. [トラブルシューティング](#トラブルシューティング)

---

## 概要

スーパーアドミンログイン用の2要素認証（2FA）システムを実装しました。TOTP（Time-based One-Time Password）標準に準拠し、Google Authenticator や Authy などの一般的な認証アプリと互換性があります。

### 主な機能
- ✅ TOTP（Time-based One-Time Password）による認証
- ✅ QRコードによる簡単なセットアップ
- ✅ 10個のバックアップコード生成
- ✅ シークレットの暗号化保存
- ✅ バックアップコードの使い捨て機能
- ✅ 操作ログの記録

---

## 技術仕様

### 使用パッケージ
- **speakeasy**: TOTP生成・検証ライブラリ
- **qrcode**: QRコード生成ライブラリ
- **bcrypt**: バックアップコードのハッシュ化
- **crypto**: シークレットの暗号化

### データベーススキーマ

#### super_admins テーブル（既存 + 追加カラム）
```sql
-- 既存フィールド
two_factor_enabled BOOLEAN DEFAULT false
two_factor_secret TEXT

-- 新規追加フィールド
backup_codes TEXT[] DEFAULT ARRAY[]::TEXT[]
backup_codes_used TEXT[] DEFAULT ARRAY[]::TEXT[]
```

### セキュリティ対策
1. **シークレットの暗号化**: AES-256-CBC で暗号化してDB保存
2. **バックアップコードのハッシュ化**: bcrypt でハッシュ化
3. **時間窓の許容**: ±30秒の時計のズレに対応
4. **使い捨てバックアップコード**: 各コードは1回のみ使用可能
5. **操作ログ記録**: 全ての2FA関連操作をログに記録

---

## セットアップ手順

### 1. 環境変数の設定

`.env.local` に以下を追加（既に設定済み）：

```bash
# Two-Factor Authentication Encryption Key (32+ characters required)
TWO_FACTOR_ENCRYPTION_KEY=a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

**本番環境では必ず新しいランダムな値を生成してください：**
```bash
openssl rand -hex 32
```

### 2. データベースマイグレーション

マイグレーションファイル:
- `/supabase/migrations/20251213000002_add_2fa_backup_codes.sql`

実行済み（ローカル環境）。本番環境では以下で実行：
```bash
PGPASSWORD=your_password psql -h your_host -U postgres -d your_database -f supabase/migrations/20251213000002_add_2fa_backup_codes.sql
```

### 3. パッケージのインストール

既にインストール済み：
```bash
npm install speakeasy @types/speakeasy --save --legacy-peer-deps
```

---

## 使い方

### スーパーアドミン側の操作

#### 1. 2FAを有効化する

1. スーパーアドミンログイン後、設定ページにアクセス
2. 「2FAを有効化」ボタンをクリック
3. QRコードをGoogle Authenticator/Authyでスキャン
4. バックアップコードをダウンロード（安全な場所に保管）
5. 認証アプリに表示された6桁のコードを入力
6. 「確認」ボタンで2FA有効化完了

#### 2. 2FA有効化後のログイン

1. メールアドレスとパスワードを入力
2. 2FA検証画面が表示される
3. 認証アプリに表示された6桁のコードを入力
4. 「確認」ボタンでログイン完了

#### 3. バックアップコードを使用する

認証アプリが使えない場合：

1. 2FA検証画面で「バックアップコード」タブをクリック
2. 保存したバックアップコード（形式: XXXX-XXXX）を入力
3. 「確認」ボタンでログイン完了
4. **注意**: 各バックアップコードは1回のみ使用可能

#### 4. 2FAを無効化する

1. 設定ページで「2FAを無効化」セクションに移動
2. 認証アプリから6桁のコードを入力
3. 「無効化」ボタンをクリック
4. シークレットとバックアップコードがすべて削除される

---

## API仕様

### 1. 2FA有効化（シークレット生成）

**Endpoint**: `POST /api/admin/2fa/enable`

**レスポンス**:
```json
{
  "success": true,
  "qrCode": "data:image/png;base64,...",
  "secret": "ABCD1234...",
  "backupCodes": [
    "A1B2-C3D4",
    "E5F6-G7H8",
    ...
  ]
}
```

### 2. TOTP検証（セットアップ時）

**Endpoint**: `POST /api/admin/2fa/verify`

**リクエスト**:
```json
{
  "token": "123456"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "2FAが正常に有効化されました"
}
```

### 3. 2FA無効化

**Endpoint**: `POST /api/admin/2fa/disable`

**リクエスト**:
```json
{
  "token": "123456"
}
```

**レスポンス**:
```json
{
  "success": true,
  "message": "2FAが正常に無効化されました"
}
```

### 4. ログイン時の2FA検証

**Endpoint**: `POST /api/admin/login/verify-2fa`

**リクエスト**:
```json
{
  "userId": "uuid",
  "token": "123456",
  "isBackupCode": false
}
```

**レスポンス**:
```json
{
  "success": true,
  "redirect": "/admin/dashboard",
  "usedBackupCode": false
}
```

---

## トラブルシューティング

### Q1: QRコードをスキャンできない

**A**: 手動入力オプションを使用してください。セットアップ画面に表示されるシークレットキーを認証アプリに直接入力できます。

### Q2: 認証コードが正しくないと表示される

**A**: 以下を確認してください：
- デバイスの時刻が正確か（NTPで同期推奨）
- 6桁のコードが最新のものか（30秒ごとに更新）
- 認証アプリに複数のアカウントがある場合、正しいアカウントを選択しているか

### Q3: バックアップコードを紛失した

**A**: セキュリティ上、バックアップコードの再表示はできません。以下の対応が必要です：
1. データベースから直接 `two_factor_enabled` を `false` に変更
2. 再度2FAを設定して新しいバックアップコードを生成

### Q4: 本番環境での暗号化キー変更

**A**: 既に2FAを使用しているユーザーがいる場合、暗号化キーの変更は**絶対に行わないでください**。変更すると既存のシークレットが復号化できなくなります。

### Q5: 時計のズレでログインできない

**A**: サーバーとクライアントの時刻を同期してください。デフォルトで±30秒の許容範囲があります。

---

## ファイル構成

### バックエンド
- `/lib/security/2fa.ts` - 2FAユーティリティ関数
- `/app/api/admin/2fa/enable/route.ts` - 2FA有効化API
- `/app/api/admin/2fa/verify/route.ts` - TOTP検証API（セットアップ時）
- `/app/api/admin/2fa/disable/route.ts` - 2FA無効化API
- `/app/api/admin/2fa/verify-backup/route.ts` - バックアップコード検証API
- `/app/api/admin/login/verify-2fa/route.ts` - ログイン時の2FA検証API

### フロントエンド
- `/components/admin/TwoFactorSetup.tsx` - 2FAセットアップコンポーネント
- `/components/admin/TwoFactorVerification.tsx` - ログイン時の2FA検証コンポーネント
- `/app/admin/login/page.tsx` - ログインページ（2FA統合済み）

### データベース
- `/supabase/migrations/20251213000002_add_2fa_backup_codes.sql` - バックアップコード用マイグレーション

---

## セキュリティ考慮事項

1. **シークレットの保護**
   - データベースに暗号化して保存
   - フロントエンドには初回セットアップ時のみ送信
   - ログに記録しない

2. **バックアップコードの管理**
   - bcrypt でハッシュ化して保存
   - 使用済みコードは別配列で管理
   - プレーンテキストは初回のみ表示

3. **レート制限**
   - ログインAPIに既存のレート制限が適用される
   - 2FA検証失敗もログに記録

4. **監査ログ**
   - 2FA有効化/無効化
   - ログイン成功/失敗
   - バックアップコード使用
   - 全て `super_admin_logs` に記録

---

## 本番環境への適用

1. **環境変数の設定**
   ```bash
   TWO_FACTOR_ENCRYPTION_KEY=$(openssl rand -hex 32)
   ```

2. **マイグレーションの実行**
   ```bash
   # Supabase CLI使用の場合
   supabase db push

   # または直接SQLを実行
   psql -h [host] -U postgres -d [database] -f supabase/migrations/20251213000002_add_2fa_backup_codes.sql
   ```

3. **動作確認**
   - テストアカウントで2FAを有効化
   - ログイン・ログアウトを繰り返しテスト
   - バックアップコードのテスト

---

## 今後の拡張案

- [ ] SMS認証の追加（Twilio連携）
- [ ] メール認証の追加（バックアップ手段）
- [ ] 信頼済みデバイスの記憶（30日間2FA免除）
- [ ] バックアップコードの再生成機能
- [ ] 2FA必須化ポリシー（組織単位）

---

## 参考資料

- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [Speakeasy Documentation](https://github.com/speakeasyjs/speakeasy)
- [Google Authenticator Wiki](https://github.com/google/google-authenticator/wiki)
