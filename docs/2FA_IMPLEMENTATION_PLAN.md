# 二要素認証（2FA）実装計画

## 概要
システム管理者アカウントの二要素認証（TOTP: Time-based One-Time Password）実装計画

## 実装スケジュール
- **Phase 1**: データベース設計とモデル更新（30分）
- **Phase 2**: TOTPライブラリ導入と鍵生成（1時間）
- **Phase 3**: QRコード生成とセットアップフロー（1時間）
- **Phase 4**: ログイン時の2FA検証（30分）
- **Phase 5**: バックアップコードとリカバリー（30分）

## 技術スタック
- **OTPライブラリ**: otpauth または speakeasy
- **QRコード生成**: qrcode
- **暗号化**: crypto（Node.js標準）

## データベース変更

### super_admins テーブルの拡張
```sql
ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;
ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false;
ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS two_factor_backup_codes TEXT[];
ALTER TABLE super_admins ADD COLUMN IF NOT EXISTS two_factor_last_used TIMESTAMPTZ;
```

## API エンドポイント

### 1. 2FA セットアップ開始
**POST** `/api/admin/2fa/setup`
- 秘密鍵を生成
- QRコードURLを返す
- 一時的に保存（確認前）

### 2. 2FA 有効化
**POST** `/api/admin/2fa/enable`
- TOTPコードで検証
- 成功時に2FA有効化
- バックアップコード生成

### 3. 2FA 無効化
**POST** `/api/admin/2fa/disable`
- パスワード再確認
- 2FA無効化

### 4. バックアップコード再生成
**POST** `/api/admin/2fa/backup-codes`
- 新しいバックアップコード生成
- 古いコードを無効化

## セキュリティ考慮事項

### 秘密鍵の保護
- AES-256暗号化で保存
- 環境変数で暗号化キー管理

### レート制限
- TOTP検証: 1分間に3回まで
- バックアップコード使用: 1時間に5回まで

### セッション管理
- 2FA成功後に新しいセッショントークン発行
- 既存のセッションを無効化

## UI/UXフロー

### セットアップフロー
1. 設定画面で「2FAを有効にする」
2. パスワード再確認
3. QRコード表示
4. 認証アプリでスキャン
5. 6桁コード入力で確認
6. バックアップコード表示・保存

### ログインフロー
1. メール/パスワード入力
2. 2FA有効の場合、コード入力画面
3. 6桁コード or バックアップコード入力
4. ログイン完了

## 実装優先順位
1. **必須**: 基本的なTOTP実装
2. **推奨**: バックアップコード
3. **オプション**: SMS/Email OTP代替手段

## テスト計画
- [ ] QRコード生成テスト
- [ ] TOTP検証テスト（30秒窓）
- [ ] バックアップコード使用テスト
- [ ] レート制限テスト
- [ ] セッション管理テスト

## 依存パッケージ
```json
{
  "otpauth": "^9.0.0",
  "qrcode": "^1.5.0"
}
```