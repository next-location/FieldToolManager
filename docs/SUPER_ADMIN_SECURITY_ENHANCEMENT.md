# スーパー管理者セキュリティ強化実装計画

## 概要

マスターアカウント（system@zairoku.com）のセキュリティを最大限に強化するための実装計画。

**実装日**: 2025-12-31
**対象**: スーパー管理者アカウント（特にマスターアカウント）
**目的**: 不正アクセス防止、侵入検知、セキュリティインシデント対応

---

## 1. 2FA設定 ✅

**状態**: 実装完了（CSRFエラー修正済み）

**実装内容**:
- CSRFトークンを取得してヘッダーに含めるように修正
- 有効化・検証・無効化の3箇所を修正

**ファイル**:
- `components/admin/TwoFactorSetup.tsx`

**アクション**:
- マスターアカウントで後ほど手動設定

---

## 2. パスワード変更機能

### 2-1. メール認証付きパスワード変更（マスターアカウント用）

**優先度**: 高
**工数**: 2-3時間

#### 実装内容

1. **設定画面に追加**
   - `/admin/settings/security`にパスワード変更セクション追加
   - フォーム項目:
     - 現在のパスワード（必須）
     - 新しいパスワード（必須）
     - 新しいパスワード（確認）

2. **フロー**
   ```
   [現在のパスワード入力]
   ↓
   [パスワード検証]
   ↓
   [system@zairoku.comに6桁コード送信]
   ↓
   [確認コード入力]
   ↓
   [新パスワード設定]
   ↓
   [監査ログ記録]
   ↓
   [完了通知メール送信]
   ```

3. **セキュリティ要件**
   - 現在のパスワードが正しいことを確認
   - メール確認コードは10分間有効
   - 確認コードは1回のみ使用可能
   - パスワードポリシー適用（8文字以上、大小英数字記号）
   - 変更時に監査ログ記録

#### 実装ファイル

- **API**: `app/api/admin/password/change/route.ts` (新規)
- **API**: `app/api/admin/password/verify-code/route.ts` (新規)
- **UI**: `app/admin/settings/security/page.tsx` (修正)
- **DB**: `password_change_tokens` テーブル (新規)

#### データベース

```sql
CREATE TABLE password_change_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  super_admin_id UUID REFERENCES super_admins(id) NOT NULL,
  token VARCHAR(6) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_password_change_tokens_admin ON password_change_tokens(super_admin_id);
CREATE INDEX idx_password_change_tokens_expires ON password_change_tokens(expires_at);
```

---

### 2-2. 営業用アカウントのパスワードリセット機能

**優先度**: 中
**工数**: 1-2時間

#### 実装内容

1. **スーパー管理者一覧画面に機能追加**
   - `/admin/super-admins`に「パスワードリセット」ボタン追加
   - マスターアカウント（role=master）のみ実行可能
   - 営業アカウント（role=sales）のみが対象

2. **フロー**
   ```
   [リセットボタンクリック]
   ↓
   [確認ダイアログ]
   ↓
   [ランダム仮パスワード生成]
   ↓
   [DBに保存 + force_password_change=true]
   ↓
   [対象アカウントにメール送信]
   ↓
   [監査ログ記録]
   ↓
   [system@zairoku.comに通知]
   ```

3. **仮パスワード仕様**
   - 16文字ランダム（大小英数字記号）
   - 次回ログイン時に強制変更

#### 実装ファイル

- **API**: `app/api/admin/super-admins/[id]/reset-password/route.ts` (新規)
- **UI**: `app/admin/super-admins/page.tsx` (修正)

#### アカウント識別

- **マスターアカウント**: `super_admins.role = 'master'`
- **営業アカウント**: `super_admins.role = 'sales'`
- マスターアカウントは基本的に1つのみ（system@zairoku.com）

---

## 3. セッションタイムアウト（スーパー管理者用）

**優先度**: 最優先
**工数**: 1-2時間

### 実装内容

1. **専用コンポーネント作成**
   - `components/admin/SuperAdminSessionTimeoutMonitor.tsx` (新規)
   - 既存の`SessionTimeoutMonitor.tsx`をベースに作成
   - スーパー管理者用に最適化

2. **タイムアウト設定**
   - デフォルト: 30分無操作でログアウト
   - 警告表示: タイムアウト5分前
   - `system_settings`テーブルで設定変更可能

3. **監視イベント**
   - マウス操作
   - キーボード入力
   - スクロール
   - タッチ操作

4. **統合**
   - 全管理画面レイアウトに組み込み
   - `/admin`配下の全ページで動作

### 実装ファイル

- **Component**: `components/admin/SuperAdminSessionTimeoutMonitor.tsx` (新規)
- **Layout**: `app/admin/layout.tsx` (修正)
- **API**: `app/api/admin/settings/timeout/route.ts` (新規、設定変更用)

### 設定管理

```json
// system_settings.super_admin_config
{
  "sessionTimeoutMinutes": 30,
  "warningMinutes": 5
}
```

---

## 4. ログイン通知機能

**優先度**: 高
**工数**: 2-3時間

### 4-1. 通常ログイン通知

#### 実装内容

1. **ログイン成功時に自動送信**
   - 送信先: `system@zairoku.com`
   - タイミング: 2FA検証成功後

2. **通知内容**
   ```
   件名: 【ザイロク】管理者アカウントへのログインがありました

   以下の管理者アカウントにログインがありました。

   ■ ログイン情報
   - アカウント: {email} ({name})
   - 日時: {timestamp}
   - IPアドレス: {ip}
   - 場所: {推定場所}
   - ブラウザ: {user_agent}

   心当たりがない場合は、すぐにパスワードを変更してください。
   ```

3. **IPから場所推定**
   - MaxMind GeoLite2使用
   - 都道府県レベルまで表示

#### 実装ファイル

- **API**: `app/api/admin/login/route.ts` (修正)
- **API**: `app/api/admin/login/verify-2fa/route.ts` (修正)
- **Utility**: `lib/notifications/login-notification.ts` (新規)

---

### 4-2. 不正ログイン警告

#### 実装内容

1. **警告トリガー**
   - ログイン失敗5回連続
   - 日本以外からのアクセス
   - 2FA検証失敗3回

2. **通知内容**
   ```
   件名: 【重要】ザイロク管理者アカウントへの不正アクセスの可能性

   以下の不審なアクティビティが検出されました。

   ■ 警告内容
   - 種類: {warning_type}
   - 対象アカウント: {email}
   - 日時: {timestamp}
   - IPアドレス: {ip}
   - 場所: {country/region}

   ■ 推奨対応
   1. すぐにパスワードを変更してください
   2. 2FAが無効の場合は有効化してください
   3. 不明なログイン履歴がないか確認してください

   管理画面: https://zairoku.com/admin/logs
   ```

3. **ログイン試行回数管理**
   - Redisまたはメモリキャッシュで管理
   - IPアドレス + メールアドレスでカウント
   - 30分でリセット

#### 実装ファイル

- **API**: `app/api/admin/login/route.ts` (修正)
- **Utility**: `lib/security/login-attempt-tracker.ts` (新規)
- **Utility**: `lib/notifications/security-alert.ts` (新規)

---

### 4-3. 重要操作通知

#### 実装内容

1. **通知対象操作**
   - パスワード変更
   - 2FA設定変更（有効化・無効化）
   - 営業アカウントのパスワードリセット
   - セキュリティ設定変更

2. **通知内容**
   ```
   件名: 【ザイロク】管理者アカウントで重要な操作が行われました

   以下の操作が実行されました。

   ■ 操作内容
   - 操作: {action}
   - 実行者: {email} ({name})
   - 日時: {timestamp}
   - IPアドレス: {ip}

   心当たりがない場合は、すぐに対応してください。
   ```

#### 実装ファイル

- **Utility**: `lib/notifications/operation-notification.ts` (新規)
- 各API（パスワード変更、2FA設定等）に通知処理追加

---

### 4-4. 通知設定

#### 実装内容

1. **設定画面追加**
   - `/admin/settings/notifications` (新規)
   - 通知ON/OFF切り替え

2. **設定項目**
   - ログイン通知
   - 不正アクセス警告
   - 重要操作通知
   - 通知先メールアドレス（デフォルト: system@zairoku.com）

#### 実装ファイル

- **UI**: `app/admin/settings/notifications/page.tsx` (新規)
- **API**: `app/api/admin/settings/notifications/route.ts` (新規)

---

## 5. IP制限（日本国内のみ）

**優先度**: 中
**工数**: 2-3時間

### 実装内容

1. **GeoIPデータベース導入**
   - ライブラリ: `@maxmind/geoip2-node`
   - データベース: MaxMind GeoLite2（無料版）
   - 更新: 月次自動更新

2. **middleware.tsで実装**
   ```typescript
   if (request.nextUrl.pathname.startsWith('/admin')) {
     const ip = getClientIP(request)
     const country = await getCountryFromIP(ip)

     // system_settingsで設定確認
     const { data: settings } = await supabase
       .from('system_settings')
       .select('value')
       .eq('key', 'ip_restriction_config')
       .single()

     if (settings?.value?.enabled && country !== 'JP') {
       return NextResponse.redirect('/error/region-blocked')
     }
   }
   ```

3. **設定画面**
   - `/admin/settings/security`に設定項目追加
   - IP制限の有効/無効切り替え
   - 許可国リスト（現状は日本のみ、将来拡張可能）

4. **除外設定**
   - ホワイトリストIP機能
   - VPN使用時の一時的な無効化

5. **エラーページ**
   - `/error/region-blocked` (新規)
   - 日本国外からのアクセスをブロック
   - 緊急連絡先を表示

### 実装ファイル

- **Middleware**: `middleware.ts` (修正)
- **Utility**: `lib/security/geoip.ts` (新規)
- **Error Page**: `app/error/region-blocked/page.tsx` (新規)
- **API**: `app/api/admin/security/ip-restriction/route.ts` (新規)

### 設定管理

```json
// system_settings.ip_restriction_config
{
  "enabled": false,
  "allowedCountries": ["JP"],
  "whitelistIPs": []
}
```

### 注意事項

- VPN経由で海外IPになる場合もブロックされる
- 海外出張時は一時的に無効化が必要
- 精度は約95%（完全ではない）
- Vercelの`x-forwarded-for`ヘッダーから実IPを取得

---

## 実装順序と工数

| No | 機能 | 優先度 | 工数 | 実装順序 |
|----|------|--------|------|---------|
| 1 | スーパー管理者セッションタイムアウト | **最優先** | 1-2時間 | 1 |
| 2 | メール認証付きパスワード変更 | **高** | 2-3時間 | 2 |
| 3 | ログイン通知（通常・不正・重要操作） | **高** | 2-3時間 | 3 |
| 4 | 営業アカウントパスワードリセット | 中 | 1-2時間 | 4 |
| 5 | 日本国内IP制限 | 中 | 2-3時間 | 5 |

**合計工数**: 8-13時間

---

## 設定情報

### アカウント識別

- **マスターアカウント**:
  - `super_admins.role = 'master'`
  - 基本的に1つのみ（system@zairoku.com）
  - 全権限保持

- **営業アカウント**:
  - `super_admins.role = 'sales'`
  - パスワードリセット対象
  - マスターアカウントによる管理対象

### IP制限

- **許可国**: 日本（JP）のみ
- **対象**: `/admin`配下のみ
- **取引先画面**: 影響なし（グローバルアクセス可能）

### 通知先

- **送信先**: `system@zairoku.com`（固定）
- **送信タイミング**:
  - ログイン成功時
  - 不正アクセス検知時
  - 重要操作実行時

### セッションタイムアウト

- **タイムアウト時間**: 30分
- **警告表示**: タイムアウト5分前
- **対象**: スーパー管理者のみ

---

## データベース変更

### 新規テーブル

1. **password_change_tokens** - パスワード変更確認コード管理
2. **login_attempts** - ログイン試行回数追跡（オプション、Redisでも可）

### system_settings追加項目

```json
{
  "super_admin_config": {
    "sessionTimeoutMinutes": 30,
    "warningMinutes": 5
  },
  "ip_restriction_config": {
    "enabled": false,
    "allowedCountries": ["JP"],
    "whitelistIPs": []
  },
  "notification_config": {
    "loginNotification": true,
    "securityAlert": true,
    "operationNotification": true,
    "notificationEmail": "system@zairoku.com"
  }
}
```

---

## テスト項目

### 1. パスワード変更
- [ ] 現在のパスワード誤りでエラー
- [ ] メール確認コード送信成功
- [ ] 確認コード検証（正常・誤り・期限切れ）
- [ ] 新パスワード設定成功
- [ ] 監査ログ記録確認
- [ ] 通知メール送信確認

### 2. セッションタイムアウト
- [ ] 30分無操作でログアウト
- [ ] 操作時にタイマーリセット
- [ ] 警告モーダル表示（5分前）
- [ ] セッション延長ボタン動作

### 3. ログイン通知
- [ ] ログイン成功時メール送信
- [ ] IPアドレス・場所情報正確
- [ ] ログイン失敗5回で警告メール
- [ ] 日本国外アクセスで警告メール

### 4. IP制限
- [ ] 日本国内IP: アクセス可
- [ ] 日本国外IP: ブロック
- [ ] 設定無効時: 全IP許可
- [ ] ホワイトリストIP: 常に許可

### 5. 営業アカウントリセット
- [ ] マスターアカウントのみ実行可能
- [ ] 仮パスワード生成・メール送信
- [ ] 次回ログイン時強制変更
- [ ] 監査ログ記録

---

## セキュリティチェックリスト

- [ ] 全APIエンドポイントでCSRF検証
- [ ] 全操作で監査ログ記録
- [ ] メール確認コードは1回のみ使用可能
- [ ] トークンに有効期限設定
- [ ] パスワードはbcryptでハッシュ化
- [ ] 機密情報はログに出力しない
- [ ] RLSポリシー適用
- [ ] 環境変数で秘密情報管理

---

## デプロイ手順

1. **データベースマイグレーション実行**
   ```bash
   # ローカル確認
   psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/[migration_file].sql

   # 本番環境
   ./scripts/migrate-production.sh
   ```

2. **環境変数確認**
   - `SUPER_ADMIN_JWT_SECRET`
   - `RESEND_API_KEY`
   - `TWO_FACTOR_ENCRYPTION_KEY`
   - MaxMind License Key（追加）

3. **GeoIPデータベース設定**
   - MaxMindアカウント作成
   - License Key取得
   - 自動更新設定

4. **本番デプロイ**
   ```bash
   git add .
   git commit -m "feat: スーパー管理者セキュリティ強化実装"
   git push origin main
   ```

5. **動作確認**
   - 各機能のテスト実施
   - 通知メール受信確認
   - 監査ログ記録確認

---

## 完了後のアクション

1. **マスターアカウントで2FA有効化**
2. **セッションタイムアウト設定確認**
3. **ログイン通知メール受信テスト**
4. **IP制限を有効化（必要に応じて）**
5. **営業アカウントにセキュリティポリシー周知**

---

## 関連ドキュメント

- `docs/SUPER_ADMIN_GUIDE.md` - スーパー管理者ガイド
- `docs/TWO_FACTOR_AUTHENTICATION.md` - 2FA設定ガイド
- `docs/ADMIN_SECURITY_AUDIT.md` - セキュリティ監査ログ
- `docs/DATABASE_SCHEMA.md` - データベーススキーマ
- `docs/MIGRATIONS.md` - マイグレーション履歴

---

## 変更履歴

| 日付 | 変更内容 | 担当 |
|------|---------|------|
| 2025-12-31 | 初版作成 | Claude |
