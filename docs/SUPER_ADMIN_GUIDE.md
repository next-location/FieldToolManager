# スーパーアドミン管理画面ガイド

## 目次
1. [概要](#1-概要)
2. [ログイン方法](#2-ログイン方法)
3. [管理画面の構造](#3-管理画面の構造)
4. [実装済み機能](#4-実装済み機能)
5. [セキュリティ](#5-セキュリティ)
6. [今後の実装予定](#6-今後の実装予定)

---

## 1. 概要

スーパーアドミン管理画面は、ザイロクのSaaSシステム全体を管理するためのシステム管理者専用の画面です。全組織の契約管理、パッケージ設定、操作ログ閲覧などが可能です。

### アクセスURL
- **ログインページ**: `http://localhost:3000/admin/login`
- **ダッシュボード**: `http://localhost:3000/admin/dashboard`

### 対象ユーザー
- システム管理者（スーパーアドミン）
- 運用担当者

---

## 2. ログイン方法

### 2.1 ログイン画面

![ログイン画面イメージ](http://localhost:3000/admin/login)

**アクセス**: `http://localhost:3000/admin/login`

### 2.2 ログイン情報

#### デフォルトアカウント（開発環境）
```
Email: superadmin@fieldtool.com
Password: SuperAdmin123!
```

> **⚠️ 注意**: 本番環境では必ず強固なパスワードに変更してください。

### 2.3 ログイン手順

1. ログインページにアクセス
2. メールアドレスとパスワードを入力
3. 「ログイン」ボタンをクリック
4. 認証成功後、ダッシュボードにリダイレクト

### 2.4 セキュリティ機能

- **パスワードハッシュ化**: bcryptによる暗号化
- **JWT認証**: 8時間有効なセッショントークン
- **アカウントロック**: 5回連続失敗で30分間ロック
- **操作ログ記録**: 全てのログイン/ログアウトを記録
- **RLSポリシー**: データベースレベルでアクセス制御

---

## 3. 管理画面の構造

### 3.1 レイアウト構成

```
┌─────────────────────────────────────────────────┐
│  サイドバー  │        ヘッダー（通知・ユーザー情報）│
│  (メニュー)  │─────────────────────────────────│
│             │                                  │
│  - ダッシュ  │      メインコンテンツエリア        │
│  - 契約管理  │                                  │
│  - 組織管理  │                                  │
│  - パッケージ│                                  │
│  - ログ     │                                  │
│  - 分析     │                                  │
│  - 設定     │                                  │
└─────────────────────────────────────────────────┘
```

### 3.2 サイドバーメニュー

| メニュー項目 | URL | 状態 | 説明 | 権限 |
|------------|-----|------|------|------|
| ダッシュボード | `/admin/dashboard` | ✅ 実装済み | 統計情報の概要 | 全員 |
| 契約管理 | `/admin/contracts` | ✅ 実装済み | 全組織の契約一覧・管理 | 全員（営業は閲覧のみ） |
| 組織管理 | `/admin/organizations` | ✅ 実装済み | 組織の追加・編集・削除・営業管理 | 全員 |
| 営業管理 | `/admin/sales` | ✅ 実装済み | 営業ダッシュボード・案件管理 | 全員 |
| マスタ管理 | `/admin/tools/common` | ✅ 実装済み | 共通道具マスタ・メーカーマスタ | 全員 |
| パッケージ設定 | `/admin/packages` | ✅ 実装済み | プラン・機能パックの設定 | **Owner のみ** |
| 操作ログ | `/admin/logs` | ✅ 実装済み | スーパーアドミンの操作履歴 | 全員 |
| 売上分析 | `/admin/analytics` | ✅ 実装済み | 売上・契約状況の分析 | 全員 |
| 管理者アカウント | `/admin/admins` | ✅ 実装済み | Super Admin アカウント管理 | **Owner のみ** |
| 設定 | `/admin/settings` | 🚧 未実装 | システム設定 | 全員 |

### 3.3 ヘッダー機能

#### 通知アイコン
- **場所**: ヘッダー右側
- **機能**: 未読通知の表示
- **リンク先**: `/admin/notifications`
- **バッジ**: 未読件数を赤い丸で表示

#### ユーザー情報エリア
- **表示内容**:
  - ユーザー名
  - 役職（システム管理者）
  - ログアウトボタン

---

## 4. 実装済み機能

### 4.1 ダッシュボード

**URL**: `/admin/dashboard`

#### 表示内容
- **統計カード（3つ）**:
  1. **組織数**: 登録されている組織の総数
  2. **有効契約**: 現在有効な契約の数
  3. **総ユーザー数**: 全組織のユーザー合計

#### データソース
- `organizations` テーブル
- `contracts` テーブル
- `users` テーブル

#### 実装ファイル
- `app/admin/dashboard/page.tsx`

---

### 4.2 契約管理

**URL**: `/admin/contracts`

#### 機能概要
全組織の契約情報を一覧表示し、管理できる画面です。

#### 表示項目
| 列名 | 内容 |
|------|------|
| 組織名 | 組織名とサブドメイン |
| プラン | 契約プラン名 |
| ステータス | 有効/保留中/停止中/キャンセル |
| 契約日 | 契約開始日 |
| 月額料金 | 月額費用 |
| 操作 | 詳細ボタン |

#### ステータスバッジ
- **有効** (active): 緑色バッジ
- **保留中** (pending): 黄色バッジ
- **停止中** (suspended): 赤色バッジ
- **キャンセル** (cancelled): 灰色バッジ

#### 主要機能
- ✅ 契約一覧表示
- ✅ 組織情報との連携表示
- ✅ ステータスフィルタリング（予定）
- 🚧 新規契約作成（ボタンのみ実装）
- 🚧 契約詳細表示
- 🚧 契約編集・更新
- 🚧 契約停止・再開

#### データソース
```sql
SELECT
  contracts.*,
  organizations.name,
  organizations.subdomain
FROM contracts
LEFT JOIN organizations ON contracts.organization_id = organizations.id
ORDER BY created_at DESC
```

#### 実装ファイル
- `app/admin/contracts/page.tsx`

---

### 4.3 通知管理

**URL**: `/admin/notifications`

#### 機能概要
システムからの重要な通知を確認できる画面です。

#### 通知タイプ
| タイプ | アイコン | カラー | 用途 |
|--------|---------|--------|------|
| info | ℹ️ | 青 | 情報通知 |
| warning | ⚠️ | 黄 | 警告・注意 |
| success | ✅ | 緑 | 成功通知 |
| error | ❌ | 赤 | エラー通知 |

#### 表示内容
- 通知タイトル
- 通知メッセージ
- 通知日時
- 未読/既読ステータス
- 通知タイプ別アイコン

#### 主要機能
- ✅ 通知一覧表示（カード形式）
- ✅ 未読バッジ表示
- ✅ 未読件数カウント
- 🚧 すべて既読にする
- 🚧 個別の既読設定
- 🚧 通知詳細表示
- 🚧 通知の削除

#### 通知例
1. **新規組織登録**: 新しい組織が登録された時
2. **契約更新リマインダー**: 契約更新日が近づいた時
3. **システムアップデート**: システムの更新完了時
4. **支払いエラー**: 決済処理でエラーが発生した時

#### 実装ファイル
- `app/admin/notifications/page.tsx`

---

### 4.4 認証システム

#### JWT認証
- **ライブラリ**: jose
- **有効期限**: 8時間
- **保存場所**: HttpOnly Cookie
- **パス制限**: `/admin` 以下のみ

#### パスワード管理
- **ハッシュ化**: bcrypt (saltRounds: 10)
- **最小強度**: 大文字・小文字・数字・記号を含む

#### セッション管理
```typescript
// Cookie設定
{
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 60 * 60 * 8, // 8時間
  path: '/admin',
}
```

#### ログイン失敗対策
- 5回連続失敗 → 30分間アカウントロック
- ログイン試行回数をDBに記録
- ロック解除は自動（30分後）

---

## 5. セキュリティ

### 5.1 データベースセキュリティ

#### RLS（Row Level Security）
`super_admins` および `super_admin_logs` テーブルにRLSを適用：

```sql
-- anon/authenticatedロールからのアクセスを完全拒否
CREATE POLICY "super_admins_no_access"
ON super_admins
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false);
```

#### Service Role Key使用
- ログインAPIは Service Role Key を使用
- RLSをバイパスしてデータにアクセス
- フロントエンドには公開されない

### 5.2 middleware設定

```typescript
// /admin 以下は認証チェックをスキップ（独自認証）
if (request.nextUrl.pathname.startsWith('/admin')) {
  return response;
}
```

### 5.3 監査ログ

全ての操作を `super_admin_logs` テーブルに記録：
- ログイン/ログアウト
- IPアドレス
- User Agent
- 操作内容
- タイムスタンプ

---

## 6. 今後の実装予定

### Phase 1: 契約管理機能の拡充
- [ ] 契約詳細ページ
- [ ] 契約の新規作成フォーム
- [ ] 契約の編集・更新
- [ ] 契約の停止・再開
- [ ] 契約履歴の表示

### Phase 2: 組織管理
- [ ] 組織一覧ページ
- [ ] 組織詳細ページ
- [ ] 組織の新規作成
- [ ] 組織情報の編集
- [ ] 組織の有効化/無効化
- [ ] サブドメイン変更

### Phase 3: パッケージ設定
- [ ] プラン一覧・管理
- [ ] 機能パック管理
- [ ] 料金設定
- [ ] 機能の有効化/無効化設定

### Phase 4: 操作ログ閲覧
- [ ] ログ一覧表示
- [ ] ログのフィルタリング
- [ ] ログの検索
- [ ] ログのエクスポート（CSV）

### Phase 5: 売上分析
- [ ] 月次売上レポート
- [ ] プラン別売上分析
- [ ] 組織別売上推移
- [ ] グラフ・チャート表示
- [ ] レポートのエクスポート

### Phase 6: 通知システム強化
- [ ] リアルタイム通知（WebSocket）
- [ ] 通知のDB連携
- [ ] 通知設定（受信するイベント選択）
- [ ] メール通知連携

### Phase 7: システム設定
- [ ] スーパーアドミンユーザー管理
- [ ] 権限レベル設定
- [ ] IPホワイトリスト管理
- [ ] 2要素認証の有効化
- [ ] システム全体の設定

---

## 技術スタック

### フロントエンド
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: カスタムコンポーネント

### バックエンド
- **Database**: Supabase (PostgreSQL)
- **Authentication**: カスタムJWT認証
- **Password**: bcrypt
- **Token**: jose

### セキュリティ
- **RLS**: Row Level Security
- **JWT**: JSON Web Tokens
- **Cookie**: HttpOnly, Secure, SameSite
- **Logging**: 全操作の監査ログ

---

## ファイル構造

```
app/admin/
├── login/
│   └── page.tsx              # ログインページ
├── dashboard/
│   └── page.tsx              # ダッシュボード
├── contracts/
│   └── page.tsx              # 契約管理
├── notifications/
│   └── page.tsx              # 通知管理
└── layout.tsx                # 共通レイアウト

components/admin/
└── AdminSidebar.tsx          # サイドバーコンポーネント

lib/auth/
└── super-admin.ts            # 認証ヘルパー関数

app/api/admin/
├── login/
│   └── route.ts              # ログインAPI
└── logout/
│   └── route.ts              # ログアウトAPI
```

---

## データベーステーブル

### super_admins
システム管理者の情報

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | プライマリキー |
| email | TEXT | メールアドレス（ユニーク） |
| name | TEXT | 管理者名 |
| password_hash | TEXT | パスワードハッシュ |
| permission_level | TEXT | 権限レベル (viewer/operator/admin) |
| last_login_at | TIMESTAMPTZ | 最終ログイン日時 |
| last_login_ip | TEXT | 最終ログインIP |
| failed_login_attempts | INTEGER | ログイン失敗回数 |
| locked_until | TIMESTAMPTZ | ロック解除日時 |
| is_active | BOOLEAN | アクティブ状態 |

### super_admin_logs
システム管理者の操作ログ

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID | プライマリキー |
| super_admin_id | UUID | 管理者ID |
| action | TEXT | 操作内容 |
| ip_address | TEXT | IPアドレス |
| user_agent | TEXT | User Agent |
| created_at | TIMESTAMPTZ | 実行日時 |

---

## 環境変数

```bash
# スーパーアドミン認証用JWT秘密鍵
SUPER_ADMIN_JWT_SECRET=your-super-secret-key-change-in-production

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## トラブルシューティング

### ログインできない場合

1. **パスワードを忘れた**
   ```bash
   # スーパーアドミンを再作成
   npx tsx scripts/create-super-admin.ts
   ```

2. **アカウントがロックされた**
   ```sql
   -- ロックを手動解除
   UPDATE super_admins
   SET locked_until = NULL, failed_login_attempts = 0
   WHERE email = 'superadmin@fieldtool.com';
   ```

3. **RLSエラーが発生する**
   - Service Role Keyが正しく設定されているか確認
   - `.env.local`の環境変数を確認

### セッションが切れる場合

- JWTの有効期限は8時間
- 期限切れ後は再ログインが必要
- 環境変数 `SUPER_ADMIN_JWT_SECRET` が変更されていないか確認

---

## まとめ

スーパーアドミン管理画面は、ザイロクSaaSシステムの心臓部です。セキュリティを最優先に設計されており、全ての操作が記録されます。

**次のステップ**: [契約管理機能の詳細実装](./CONTRACT_MANAGEMENT.md)（作成予定）

---

## 契約管理機能（2025-12-09追加）

### 概要

契約管理機能では、全組織の契約情報を一元管理します。契約の作成、編集、フィルタリング、ソート機能を提供します。

### 実装機能

#### 1. 契約一覧ページ (`/admin/contracts`)

##### 1.1 テーブル表示項目

| 列名 | 説明 |
|------|------|
| 組織名 | 契約組織の名前とサブドメイン |
| 基本プラン | スタート/スタンダード/ビジネス/プロ |
| 機能パック | 現場資産パック、DX効率化パックのバッジ表示 |
| ステータス | 有効/保留中/停止中/キャンセル（カラーバッジ） |
| 契約日 | 契約開始日 |
| 月額料金 | 基本料金+パック料金の合計 |
| 操作 | 詳細リンク |

##### 1.2 絞り込みフィルター機能

**第1行（横並び）:**
- **キーワード検索**: 組織名・サブドメインをリアルタイム検索（ひらがな・カタカナ相互変換対応）
- **ステータス**: 全て/有効/保留中/停止中/キャンセル

**第2行（3列）:**
- **基本プラン**: 全て/ベーシック/プレミアム/エンタープライズ
- **資産管理パック**: 全て/あり/なし
- **DX効率化パック**: 全て/あり/なし

##### 1.3 ソート機能

- 新しい順（デフォルト）
- 古い順
- 金額の高い順
- 金額の安い順

##### 1.4 複合検索

すべてのフィルターを組み合わせて検索可能。フィルター結果の件数を「全X件中Y件を表示」形式で表示。

#### 2. 新規契約作成ページ (`/admin/contracts/new`)

##### 2.1 契約組織選択

- 既存組織から選択（ドロップダウン）
- 組織名とサブドメインを表示

##### 2.2 プラン・機能設定

**契約タイプ:**
- 月契約
- 年契約（10%割引自動適用）

**基本プラン:**
| プラン | 人数上限 | 月額料金 | 初期設定費 |
|--------|---------|---------|-----------|
| スタート | ~10名 | ¥18,000 | ¥10,000 |
| スタンダード | ~30名 | ¥45,000 | ¥28,000 |
| ビジネス | ~50名 | ¥70,000 | ¥45,000 |
| プロ | ~100名 | ¥120,000 | ¥80,000 |

**機能パック（ラジオボタン選択 - 2025-12-10更新）:**
- 現場資産パック: ¥18,000/月（道具管理・消耗品管理・重機管理・各種アラート機能・QRコード一括生成・棚卸し機能）
- DX効率化パック: ¥22,000/月（出退勤管理・作業報告書作成・見積/請求/領収書・売上管理・承認ワークフロー）
- フル機能統合パック: ¥32,000/月（全機能利用可能・複数パック割引適用）

##### 2.3 契約期間設定

- 契約開始日（必須）
- 契約終了日（任意）
- トライアル終了日（任意） - トライアル期間中は料金が発生しません
- 自動更新フラグ - 契約タイプに応じて1ヶ月または1年ごとに自動更新

##### 2.4 初期費用設定（2025-12-10更新）

**表示方法**: デフォルトで非表示。「初期費用を入力する」ボタンで表示切り替え。
**料金表リンク**: 「費用表を見る」リンクで料金表ページを新規ウィンドウ表示（`/admin/pricing-table`）

PRICING_STRATEGY.mdに基づく初期費用を設定可能：

- **基本設定費**: プランに応じて自動設定（読み取り専用）
- **データ登録費**: ~100件 ¥20,000、~500件 ¥50,000、~1,000件 ¥80,000（手動入力）
- **オンサイト作業費**: 時給¥3,000 × 作業時間（手動入力）
- **研修費**: 管理者研修、現場スタッフ研修（手動入力）
- **その他費用**: 交通費・宿泊費など（手動入力）
- **お値引き**: キャンペーンや特別割引（手動入力）

**入力形式**: 全てnumber input（min="0", step="1000"）で金額を直接入力

##### 2.5 請求情報（2025-12-10更新）

**自動入力機能**: 組織選択時に、organizationsテーブルのbilling情報を自動入力。手動変更も可能。

- 請求担当者名
- 請求担当者メールアドレス
- 請求担当者電話番号
- 請求先住所

**データベース**: organizationsテーブルに以下のカラムを追加（マイグレーション: `20251210000001_add_billing_info_to_organizations.sql`）
- `billing_contact_name`
- `billing_contact_email`
- `billing_contact_phone`
- `billing_address`

##### 2.6 料金サマリー表示

フォーム入力時にリアルタイムで料金を計算・表示：

- 基本プラン料金
- 機能パック料金
- **月額合計**（青色で強調）
- **初期費用合計**（オレンジ色で強調、割引適用後の金額）

年契約の場合、10%割引が適用されていることを表示。
割引がある場合、「※ お値引き¥X,XXXが適用されています」と表示。

#### 3. データベース構造

##### 3.1 追加カラム

**初期費用関連（マイグレーション: `20251209000003_add_initial_fees_to_contracts.sql`）:**
- `initial_setup_fee`: 初期設定費
- `initial_data_registration_fee`: データ登録費
- `initial_onsite_fee`: オンサイト作業費
- `initial_training_fee`: 研修費
- `initial_other_fee`: その他費用
- `initial_discount`: 初期費用の割引額（2025-12-10追加: `20251210000002_add_initial_discount_to_contracts.sql`）
- `total_initial_fee`: 初期費用合計
- `initial_fee_paid`: 支払済みフラグ
- `initial_fee_paid_at`: 支払日時

**請求情報:**
- `billing_contact_name`: 請求担当者名
- `billing_contact_email`: 請求担当者メール
- `billing_contact_phone`: 請求担当者電話
- `billing_address`: 請求先住所

#### 4. APIエンドポイント

##### POST `/api/admin/contracts`

契約を新規作成します。

**リクエストボディ:**
```json
{
  "organizationId": "uuid",
  "contractType": "monthly" | "annual",
  "plan": "start" | "standard" | "business" | "pro",
  "hasAssetPackage": boolean,
  "hasDxPackage": boolean,
  "userLimit": number,
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD" | null,
  "autoRenew": boolean,
  "trialEndDate": "YYYY-MM-DD" | null,
  "baseMonthlyFee": number,
  "packageMonthlyFee": number,
  "totalMonthlyFee": number,
  "initialSetupFee": number,
  "initialDataRegistrationFee": number,
  "initialOnsiteFee": number,
  "initialTrainingFee": number,
  "initialOtherFee": number,
  "totalInitialFee": number,
  "billingContactName": string,
  "billingContactEmail": string,
  "billingContactPhone": string,
  "billingAddress": string,
  "notes": string,
  "createdBy": "uuid"
}
```

**レスポンス:**
```json
{
  "success": true,
  "contract": { ... }
}
```

**機能:**
- 契約番号の自動生成（形式: `CONT-YYYYMMDD-XXXX`）
- 組織のプラン情報を自動更新
- super_admin_logsに操作を記録

#### 5. 実装ファイル

| ファイル | 説明 |
|---------|------|
| `app/admin/contracts/page.tsx` | 契約一覧ページ（Server Component） |
| `app/admin/contracts/new/page.tsx` | 新規契約作成ページ（Server Component） |
| `app/admin/pricing-table/page.tsx` | 初期費用料金表ページ（Client Component、2025-12-10追加） |
| `components/admin/ContractsTable.tsx` | 契約テーブル（Client Component） |
| `components/admin/ContractsFilter.tsx` | フィルターUI（Client Component） |
| `components/admin/NewContractForm.tsx` | 新規契約フォーム（Client Component、2025-12-10更新） |
| `app/api/admin/contracts/route.ts` | 契約作成API（credentials対応: 2025-12-10） |
| `lib/utils/kana.ts` | ひらがな・カタカナ変換ユーティリティ |
| `lib/auth/super-admin.ts` | スーパーアドミン認証（cookieパス修正: 2025-12-10） |
| `supabase/migrations/20251209000003_add_initial_fees_to_contracts.sql` | 初期費用カラム追加マイグレーション |
| `supabase/migrations/20251210000001_add_billing_info_to_organizations.sql` | 組織テーブルに請求情報追加 |
| `supabase/migrations/20251210000002_add_initial_discount_to_contracts.sql` | 契約テーブルに割引カラム追加 |
| `supabase/migrations/20251210000003_fix_contracts_plan_check.sql` | Plan制約を新プラン値に対応（start/standard/business/pro追加） |
| `supabase/migrations/20251210000005_fix_contracts_creator_tracking.sql` | 作成者追跡の適切な実装（super_admin_created_byカラム追加） |
| `supabase/migrations/20251210000006_prevent_duplicate_active_contracts.sql` | 重複契約防止（1組織1active契約のみ） |

#### 6. 料金計算ロジック

##### 6.1 月額料金計算

```typescript
// 基本料金
baseFee = isAnnual ? (annualFee / 12) : monthlyFee

// 機能パック料金
if (hasAssetPackage && hasDxPackage) {
  // フル機能パック適用
  packageFee = isAnnual ? (FULL_ANNUAL / 12) : FULL_MONTHLY
} else {
  packageFee = 0
  if (hasAssetPackage) packageFee += assetPackageFee
  if (hasDxPackage) packageFee += dxPackageFee
}

// 合計
totalMonthlyFee = baseFee + packageFee
```

##### 6.2 初期費用計算

```typescript
totalInitialFee = 
  initialSetupFee +
  initialDataRegistrationFee +
  initialOnsiteFee +
  initialTrainingFee +
  initialOtherFee
```

#### 7. セキュリティ（2025-12-10更新）

##### 7.1 認証・認可
- スーパーアドミン認証必須（JWT検証）
- Cookie設定: `sameSite: 'lax'`, `path: '/'`, `httpOnly: true`
- Service Role Keyを使用してRLSをバイパス
- 全ての操作を`super_admin_logs`に記録

##### 7.2 データ整合性
- **契約番号の一意性**: 自動生成（`CONT-YYYYMMDD-XXXX`形式）
- **作成者追跡**:
  - `created_by` → `users`テーブル参照（通常ユーザーが作成）
  - `super_admin_created_by` → `super_admins`テーブル参照（スーパーアドミンが作成）
  - CHECK制約: どちらか一方のみ必須
- **重複契約防止**:
  - UNIQUE INDEX: 1組織につき1つの`active`契約のみ許可
  - 過去の契約（`cancelled`, `expired`）は複数OK

##### 7.3 プラン制約
- CHECK制約: `start`, `standard`, `business`, `pro`, `enterprise`のみ許可
- 旧データ用に`basic`, `premium`も許可

#### 8. UX改善（2025-12-10更新）

##### 8.1 初期費用フォーム改善
- **初期値**: データ登録費、オンサイト作業費、研修費、その他費用、お値引きの初期値を空文字列に変更
- **理由**: 初期値`0`が邪魔で入力しづらい問題を解決
- **実装**: `placeholder="0"`で0を表示、実際の値は空文字列
- **送信時**: `parseFloat()`で数値に変換、空文字列は`0`として扱う

##### 8.2 お値引き表示改善
- **表示形式**: `-¥X,XXX`（マイナス記号付き）
- **色**: 赤色（`#DC2626`）で強調
- **フォント**: `font-medium`で太字
- **条件**: 割引額が0より大きい場合のみ表示

##### 8.3 料金表ページ
- **URL**: `/admin/pricing-table`
- **タイプ**: Client Component（styled-jsx使用）
- **サービス名**: ザイロク
- **開き方**: 小さいウィンドウ（1000x800px）でポップアップ表示
- **内容**: PRICING_STRATEGY.mdに基づく全料金体系を表示

##### 8.4 認証改善
- **Cookie設定**: pathを`/admin`から`/`に変更
- **fetch設定**: `credentials: 'include'`を追加してcookie送信
- **注意**: セッション切れの場合は再ログインが必要

#### 9. 契約詳細ページ（2025-12-10追加）

**URL**: `/admin/contracts/[id]`

契約一覧の「詳細」リンクから遷移し、契約の全情報を表示します。

##### 9.1 表示セクション

**1. 基本情報カード**
- 組織名・契約番号（ヘッダー）
- ステータスバッジ（カラー付き）
- 組織情報: 名前、サブドメイン、業種、従業員数
- 契約情報: 契約タイプ、開始日、終了日、トライアル終了日、自動更新

**2. プラン・機能設定カード**
- 基本プラン（バッジ表示）
- ユーザー上限
- 機能パック（現場資産パック、DX効率化パック）

**3. 料金情報カード**
- **月額料金セクション**:
  - 基本料金
  - パック料金
  - 合計月額（青色で強調）
- **初期費用セクション**:
  - 初期設定費
  - データ登録費
  - オンサイト作業費
  - 研修費
  - その他費用
  - お値引き（赤色表示）
  - 初期費用合計（オレンジ色で強調）
  - 支払状況（支払済み/未払い）

**4. 請求情報カード**
- 請求担当者名、メール、電話番号
- 請求先住所
- 契約に情報がない場合は組織情報から取得

**5. 備考カード**
- 備考が入力されている場合のみ表示
- 改行を保持して表示（`whitespace-pre-wrap`）

**6. メタ情報カード**
- 契約ID（UUID）
- 作成日時
- 更新日時

##### 9.2 アクション

- **契約書を作成ボタン**: 契約書PDF生成機能（近日実装予定）
- **契約一覧に戻るリンク**: 一覧ページへの戻りリンク

##### 9.3 エラーハンドリング

- 契約が見つからない場合: エラーメッセージと一覧へのリンクを表示
- 認証なしの場合: ログインページにリダイレクト

##### 9.4 実装ファイル

| ファイル | 説明 |
|---------|------|
| `app/admin/contracts/[id]/page.tsx` | 契約詳細ページ（Server Component） |
| `components/admin/ContractDetailView.tsx` | 契約詳細ビュー（Client Component） |

##### 9.5 データ取得

Supabase Service Role Keyを使用して以下のクエリを実行:

```sql
SELECT
  contracts.*,
  organizations.*
FROM contracts
LEFT JOIN organizations ON contracts.organization_id = organizations.id
WHERE contracts.id = $1
```

#### 10. 初期管理者アカウント自動作成機能（2025-12-10追加）

契約作成時に、初期管理者アカウントを自動的に作成する機能です。契約完了と同時にお客様がすぐにシステムにログインできるようになります。

##### 10.1 概要

**目的**: 契約作成時に自動的にSupabase Authアカウントと`users`テーブルのレコードを作成し、顧客がすぐにシステムを利用開始できるようにする。

**実装範囲**:
- ✅ Phase 1: 契約作成フォームに初期管理者情報セクションを追加
- ✅ Phase 1: パスワード自動生成機能
- ✅ Phase 1: Supabase Authでユーザー作成
- ✅ Phase 1: usersテーブルにレコード作成
- ✅ Phase 2: エラー時のロールバック処理
- ✅ Phase 2: 初回ログイン時のパスワード変更強制
- 🚧 Phase 3: ウェルカムメール送信（未実装）

##### 10.2 フォーム入力項目

契約作成フォーム（`/admin/contracts/new`）に「初期管理者情報」セクションが追加されました。

**入力項目:**
- **管理者氏名** (必須): 管理者の氏名
- **管理者メールアドレス** (必須): ログインに使用するメールアドレス
- **初期パスワード** (必須):
  - 自動生成ボタンで安全なパスワード（16文字）を生成可能
  - 手動入力も可能
  - 12文字以上推奨
- **管理者電話番号** (任意): 連絡先電話番号

**自動生成パスワード仕様:**
- 長さ: 16文字
- 使用文字: 大文字・小文字・数字・記号 (`!@#$%^&*`)
- 生成方法: `crypto.getRandomValues()` を使用した暗号学的に安全な生成

##### 10.3 処理フロー

**契約作成API (`POST /api/admin/contracts`) の処理順序:**

1. **バリデーション**: 管理者情報（氏名・メール・パスワード）の必須チェック
2. **契約作成**: `contracts`テーブルにレコード挿入
3. **組織情報更新**: `organizations`テーブルのプラン情報を更新
4. **Supabase Auth ユーザー作成**:
   ```typescript
   supabase.auth.admin.createUser({
     email: adminEmail,
     password: adminPassword,
     email_confirm: true, // メール確認済みとして作成
     user_metadata: {
       name: adminName,
       phone: adminPhone || null,
     },
   })
   ```
5. **usersテーブルにレコード作成**:
   ```typescript
   supabase.from('users').insert({
     id: authUser.user.id,
     email: adminEmail,
     name: adminName,
     phone: adminPhone || null,
     organization_id: organizationId,
     role: 'admin',
     is_active: true,
     must_change_password: true, // 初回ログイン時にパスワード変更を強制
   })
   ```
6. **操作ログ記録**: `super_admin_logs`に作成記録
7. **レスポンス返却**: 成功メッセージと契約・管理者情報

##### 10.4 エラーハンドリングとロールバック（Phase 2）

**エラーケース1: Authユーザー作成失敗**
- 契約は作成済み
- エラーメッセージを返却: 「契約は作成されましたが、初期管理者アカウントの作成に失敗しました。手動で作成してください。」
- contractIdを返却して、後から管理者を追加できるようにする

**エラーケース2: usersテーブル挿入失敗**
- Authユーザーは作成済み
- **ロールバック処理を実行**: `supabase.auth.admin.deleteUser(createdAuthUserId)`
- エラーメッセージを返却: 「契約は作成されましたが、初期管理者アカウントのデータベース登録に失敗しました。」

**エラーケース3: その他の予期しないエラー**
- `try-catch`でキャッチ
- Authユーザーが作成されていればロールバック
- エラー詳細をログに記録

##### 10.5 パスワード変更強制機能（Phase 2）

**データベース設計:**
- `users`テーブルに`must_change_password`カラムを追加
- マイグレーション: `20251210000007_add_must_change_password_to_users.sql`

**動作:**
- 初期管理者アカウント作成時、`must_change_password = true`に設定
- 初回ログイン時にパスワード変更画面にリダイレクト（※未実装）
- パスワード変更完了後、`must_change_password = false`に更新（※未実装）

##### 10.6 セキュリティ考慮事項

**パスワード管理:**
- パスワードはSupabase Auth内でハッシュ化される
- 初期パスワードはメールで送信（Phase 3で実装予定）
- 初回ログイン後の強制変更で、スーパーアドミンも初期パスワードを知らない状態にする

**権限設定:**
- 作成されるユーザーは`role='admin'`
- 組織内の全機能にアクセス可能
- 他組織のデータにはRLSで隔離

**監査ログ:**
- 管理者作成をsuper_admin_logsに記録
- 作成されたメールアドレスをログに含める

##### 10.7 実装ファイル

| ファイル | 変更内容 |
|---------|---------|
| `components/admin/NewContractForm.tsx` | 初期管理者情報セクション追加、パスワード生成機能 |
| `app/api/admin/contracts/route.ts` | Authユーザー作成、usersレコード作成、ロールバック処理 |
| `supabase/migrations/20251210000007_add_must_change_password_to_users.sql` | must_change_passwordカラム追加 |

##### 10.8 APIレスポンス

**成功時:**
```json
{
  "success": true,
  "contract": { ... },
  "admin_user_created": true,
  "admin_email": "admin@example.com"
}
```

**エラー時（Authユーザー作成失敗）:**
```json
{
  "error": "契約は作成されましたが、初期管理者アカウントの作成に失敗しました。手動で作成してください。",
  "details": "エラー詳細",
  "contractId": "uuid"
}
```

##### 10.9 今後の実装予定（Phase 3以降）

**Phase 3: メール送信機能（本番環境移行前に実装予定）**
- [ ] Google Workspace SMTP連携
  - Nodemailer + Gmail SMTP使用
  - 独自ドメイン取得後に設定（`noreply@yourdomain.com`）
  - 環境変数で認証情報管理
- [ ] ウェルカムメール送信
  - 契約完了時に自動送信
  - 初期パスワードをメールで送信
  - ログインURLとアカウント情報を記載
  - パスワード変更の案内
- [ ] メール送信ログ記録
  - 送信成功/失敗の記録
  - リトライ機能

**Phase 4: 契約書作成機能（後日実装予定）**
- [ ] 契約書PDF自動生成
  - 契約情報をもとにPDF作成
  - プラン・料金情報の自動反映
  - 電子署名対応の検討
- [ ] 契約書テンプレート管理
  - 複数テンプレートの切り替え
  - カスタマイズ可能な項目設定
- [ ] 契約書ダウンロード・送信
  - PDF直接ダウンロード
  - メール添付送信機能

**Phase 5: その他の機能拡張**
- [ ] 管理者一覧・管理画面
  - 契約詳細から管理者一覧を表示
  - 追加の管理者アカウント作成
- [ ] パスワード変更画面の実装
  - 初回ログイン時の強制パスワード変更フロー
  - パスワード強度チェック

#### 11. 契約フローの変更（2025-12-10更新）

##### 11.1 新しい契約フロー

従来は契約作成時に即座にアカウントを作成していましたが、以下の3段階フローに変更しました：

**Step 1: 契約作成（ステータス: `draft`）**
- 契約情報と初期管理者情報を入力
- この時点ではアカウントは作成されない
- 初期管理者情報（氏名・メール・パスワード・電話番号）を契約テーブルに保存

**Step 2: 契約書作成（近日実装予定）**
- ステータスが`draft`の契約に対して実行可能
- 契約書PDFを自動生成
- 顧客に送付

**Step 3: 契約完了（ステータス: `draft` → `active`）**
- 契約書が締結されたら「契約完了」ボタンを押下
- この時点で初期管理者のSupabase Authアカウントを作成
- 初期パスワードを自動生成（16文字の強力なパスワード）
- ウェルカムメールを送信（本番環境移行後に実装）
- 画面にパスワードを表示（現在はこれで顧客に伝える）

##### 11.2 メリット

- **契約前の準備**: 契約書を作成してから顧客に送付できる
- **セキュリティ**: 契約が確定するまでアカウントは作成されない
- **柔軟性**: 契約内容の変更が容易（draft状態なら編集可能）

##### 11.3 実装状況（2025-12-10更新）

**データベース:**
- ✅ draftステータス追加（contracts.status）
- ✅ 管理者情報カラム追加（admin_name, admin_email, admin_password, admin_phone）
- ✅ 管理者ユーザーID参照（admin_user_id）
- ✅ 契約完了日時（contract_completed_at）

**契約作成フロー:**
- ✅ 契約作成時にdraftステータスで保存
- ✅ 管理者情報を契約テーブルに保存
- ✅ アカウントは作成せず、契約完了時まで待機

**契約完了機能:**
- ✅ 契約完了API実装（`POST /api/admin/contracts/[id]/complete`）
- ✅ 契約完了時にSupabase Authアカウント作成
- ✅ 新しいパスワードを自動生成（16文字、セキュア）
- ✅ usersテーブルにレコード作成
- ✅ エラー時のロールバック処理
- ✅ 契約ステータスをactiveに更新
- ✅ 組織情報の更新

**UI実装:**
- ✅ 契約詳細ページに契約完了ボタン追加
- ✅ 契約完了確認モーダル
- ✅ パスワード表示モーダル（コピー機能付き）
- ✅ 契約一覧にdraftバッジ表示
- ✅ ステータスフィルターにdraft追加

**未実装:**
- 🚧 契約書PDF生成（後日実装予定）
- 🚧 ウェルカムメール送信（本番環境移行前に実装予定）

##### 11.4 実装ファイル

| ファイル | 説明 |
|---------|------|
| `supabase/migrations/20251210000010_add_draft_status_to_contracts.sql` | draftステータス追加 |
| `supabase/migrations/20251210000011_add_admin_info_to_contracts.sql` | 管理者情報カラム追加 |
| `app/api/admin/contracts/route.ts` | 契約作成API（draft保存に変更） |
| `app/api/admin/contracts/[id]/complete/route.ts` | 契約完了API（新規作成） |
| `components/admin/CompleteContractButton.tsx` | 契約完了ボタンコンポーネント |
| `app/admin/contracts/[id]/page.tsx` | 契約詳細ページ（ボタン配置） |
| `components/admin/ContractsTable.tsx` | 契約一覧（draftバッジ追加） |
| `components/admin/ContractsFilter.tsx` | フィルター（draft追加） |

##### 11.5 使用方法

**契約作成から完了までの流れ:**

1. **契約作成** (`/admin/contracts/new`)
   - 組織、プラン、管理者情報を入力
   - 「契約を作成」ボタンをクリック
   - ステータス: `draft`（契約準備中）

2. **契約書作成** (近日実装予定)
   - 契約詳細ページの「契約書を作成」ボタンをクリック
   - 契約書PDFを生成・ダウンロード
   - 顧客に送付

3. **契約完了** (`/admin/contracts/[id]`)
   - 契約書が締結されたら「契約完了」ボタンをクリック
   - 確認モーダルで「はい、契約を完了する」を選択
   - 処理完了後、パスワード表示モーダルが表示される
   - メールアドレスとパスワードをコピーして顧客に伝える
   - ステータス: `active`（有効）

**セキュリティ:**
- パスワードは契約完了時に新規生成（保存していたものは使用しない）
- 初回ログイン時にパスワード変更が必要（`must_change_password=true`）
- 契約完了後、契約テーブルの`admin_password`はNULLに設定

#### 12. 今後の拡張

- [ ] 契約編集機能
- [ ] 契約履歴表示
- [ ] 契約ステータス変更（停止・再開・キャンセル）
- [ ] 契約ステータス一括変更
- [ ] CSV/Excelエクスポート
- [ ] 契約書PDF自動生成
- [ ] 請求書自動生成
- [ ] 初期費用支払状況の更新機能

---

## 組織管理機能（2025-12-10追加）

### 概要

組織管理機能は、SaaSシステムに登録されている全組織の基本情報を管理するマスターデータ管理機能です。契約管理とは独立しており、組織の基本情報、連絡先、ユーザー数、契約状況を一元管理できます。

### URL

- **一覧ページ**: `/admin/organizations`
- **詳細ページ**: `/admin/organizations/[id]`
- **新規登録**: `/admin/organizations/new`
- **編集**: `/admin/organizations/[id]/edit`

### 実装済み機能

#### 1. 組織一覧ページ (`/admin/organizations`)

##### 1.1 表示項目（テーブルカラム）

| 列名 | 説明 |
|------|------|
| 組織名 | 組織の名前と住所（サブ表示） |
| サブドメイン | 組織のサブドメイン（monospaceフォント） |
| 連絡先 | 請求担当者名、電話番号、メールアドレス |
| ユーザー数 | 登録ユーザー数 |
| 契約状況 | 「契約中」or「契約なし」のバッジ表示 |
| ステータス | 有効/無効（カラーバッジ） |
| 登録日 | 組織作成日 |
| 操作 | 詳細リンク |

##### 1.2 フィルター機能

**第1行:**
- **キーワード検索**: 組織名・サブドメインで検索（ひらがな・カタカナ相互変換対応）
- **ステータス**: 全て/有効/無効

**第2行:**
- **契約状況**: 全て/契約中/契約なし
- **並び替え**: 新しい順/古い順/組織名(昇順・降順)/ユーザー数(多い順・少ない順)

##### 1.3 実装ファイル

| ファイル | 説明 |
|---------|------|
| `app/admin/organizations/page.tsx` | 組織一覧ページ（Server Component） |
| `components/admin/OrganizationsTable.tsx` | 組織テーブル（Client Component） |
| `components/admin/OrganizationsFilter.tsx` | フィルターUI（Client Component） |

#### 2. 組織詳細ページ (`/admin/organizations/[id]`)

##### 2.1 表示セクション

**1. 基本情報カード**
- 組織名、サブドメイン、ステータスバッジ
- 基本情報: 組織名、サブドメイン、ユーザー数、登録日
- 連絡先情報: 電話番号、FAX、郵便番号、住所

**2. 請求情報カード**
- 請求担当者名、メール、電話番号
- 請求先住所

**3. 契約情報カード**
- 契約ありの場合: 契約番号、契約タイプ、契約開始日、月額料金、契約詳細へのリンク
- 契約なしの場合: 「契約なし」表示

**4. メタ情報カード**
- 組織ID（UUID）、作成日時、更新日時

##### 2.2 アクション

- **編集ボタン**: 組織編集ページへ遷移（右上）
- **組織一覧に戻るリンク**: 一覧ページへの戻りリンク

##### 2.3 実装ファイル

| ファイル | 説明 |
|---------|------|
| `app/admin/organizations/[id]/page.tsx` | 組織詳細ページ（Server Component） |

#### 3. 組織新規登録ページ (`/admin/organizations/new`)

##### 3.1 入力項目

**基本情報セクション:**
- 組織名 ※必須
- サブドメイン ※必須（半角英数字とハイフンのみ）

**連絡先情報セクション:**
- 電話番号
- FAX
- 郵便番号
- 住所

**請求情報セクション:**
- 請求担当者名
- 請求担当者メール
- 請求担当者電話
- 請求先住所

**ステータス:**
- 有効/無効（チェックボックス）

##### 3.2 バリデーション

- サブドメインの重複チェック
- 必須項目のチェック
- メールアドレスの形式チェック

##### 3.3 実装ファイル

| ファイル | 説明 |
|---------|------|
| `app/admin/organizations/new/page.tsx` | 新規登録ページ（Server Component） |
| `components/admin/OrganizationForm.tsx` | 組織フォーム（Client Component、新規・編集共通） |

#### 4. 組織編集ページ (`/admin/organizations/[id]/edit`)

新規登録ページと同じフォームを使用し、初期値として既存データを表示します。

##### 4.1 実装ファイル

| ファイル | 説明 |
|---------|------|
| `app/admin/organizations/[id]/edit/page.tsx` | 編集ページ（Server Component） |
| `components/admin/OrganizationForm.tsx` | 組織フォーム（新規・編集共通） |

#### 5. APIエンドポイント

##### POST `/api/admin/organizations`

組織を新規作成します。

**リクエストボディ:**
```json
{
  "name": "株式会社〇〇",
  "subdomain": "example-company",
  "phone": "03-1234-5678",
  "fax": "03-1234-5679",
  "postal_code": "123-4567",
  "address": "東京都〇〇区〇〇 1-2-3",
  "billing_contact_name": "山田太郎",
  "billing_contact_email": "billing@example.com",
  "billing_contact_phone": "03-1234-5678",
  "billing_address": "東京都〇〇区〇〇 1-2-3",
  "is_active": true
}
```

**機能:**
- サブドメインの重複チェック
- デフォルトプラン（basic）とデフォルト支払い方法（invoice）を設定
- super_admin_logsに操作を記録

##### PUT `/api/admin/organizations/[id]`

組織情報を更新します。

**機能:**
- サブドメインの重複チェック（自分以外）
- super_admin_logsに操作を記録

##### 実装ファイル

| ファイル | 説明 |
|---------|------|
| `app/api/admin/organizations/route.ts` | 組織作成API |
| `app/api/admin/organizations/[id]/route.ts` | 組織更新API |

#### 6. データベーステーブル

組織管理では`organizations`テーブルを使用します。

**主要カラム:**
- `id` (UUID): プライマリキー
- `name` (TEXT): 組織名
- `subdomain` (VARCHAR): サブドメイン（UNIQUE制約）
- `phone` (TEXT): 電話番号
- `fax` (TEXT): FAX
- `postal_code` (TEXT): 郵便番号
- `address` (TEXT): 住所
- `billing_contact_name` (TEXT): 請求担当者名
- `billing_contact_email` (TEXT): 請求担当者メール
- `billing_contact_phone` (TEXT): 請求担当者電話
- `billing_address` (TEXT): 請求先住所
- `is_active` (BOOLEAN): 有効/無効ステータス
- `plan` (TEXT): プラン（basic/premium/enterprise）
- `payment_method` (TEXT): 支払い方法（invoice/bank_transfer）
- `created_at` (TIMESTAMPTZ): 作成日時
- `updated_at` (TIMESTAMPTZ): 更新日時

#### 7. セキュリティ

- スーパーアドミン認証必須（JWT検証）
- Service Role Keyを使用してRLSをバイパス
- 全ての操作を`super_admin_logs`に記録
- サブドメインの重複チェック

#### 8. 営業管理ページ（プレースホルダー）

**URL**: `/admin/sales`

営業管理ページは近日実装予定です。将来的に以下の機能を提供します：
- 見込み客リスト管理
- 営業ステージ管理
- アポイントメント管理
- 商談履歴・活動記録
- 営業レポート・分析

現在はサイドバーメニューとプレースホルダーページのみ実装済みです。

#### 9. 今後の拡張

- [ ] 組織削除機能（論理削除）
- [ ] 組織の一括インポート（CSV）
- [ ] 組織のエクスポート機能
- [ ] 組織の詳細設定（機能フラグ、システム設定など）
- [ ] 組織ユーザーの一覧表示

---

## 12. 営業管理機能 ✅ **実装済み**

営業管理機能は、営業先の管理、アポイントメント管理、活動履歴トラッキングを行うためのCRMシステムです。

### 12.1 概要

**アクセスURL**: `http://localhost:3000/admin/sales`

営業管理機能では以下の管理が可能です：
- 営業リード（見込み客）の登録・管理
- ステータス別の分類（アポイント → 見込み客 → 提案中 → 商談中 → 契約中 → 契約済み）
- 活動履歴の記録（架電、メール、商談、提案書送付など）
- 重複チェック機能（会社名・住所での自動検出）
- 組織マスタとの連携

### 12.2 データベース設計

#### テーブル: `sales_leads`（営業リード）

```sql
CREATE TABLE sales_leads (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),

  -- 基本情報
  company_name TEXT NOT NULL,
  company_name_kana TEXT,
  subdomain_candidate TEXT,

  -- ステータス（7種類）
  status TEXT CHECK (status IN (
    'appointment',      -- アポイント
    'prospect',         -- 見込み客
    'proposal',         -- 提案中
    'negotiation',      -- 商談中
    'contracting',      -- 契約中
    'contracted',       -- 契約済み
    'do_not_contact'    -- アポ禁止
  )),

  -- 連絡先情報
  contact_person TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  postal_code TEXT,
  address TEXT,

  -- 営業情報
  industry TEXT,
  employee_count INTEGER,
  estimated_budget DECIMAL(15, 2),
  estimated_plan TEXT,
  next_appointment_date TIMESTAMPTZ,
  last_contact_date TIMESTAMPTZ,
  proposal_details TEXT,
  notes TEXT,
  assigned_to TEXT,

  -- メタデータ
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,

  -- 重複防止
  UNIQUE(company_name, address)
);
```

#### テーブル: `sales_activities`（活動履歴）

```sql
CREATE TABLE sales_activities (
  id UUID PRIMARY KEY,
  sales_lead_id UUID REFERENCES sales_leads(id) ON DELETE CASCADE,

  -- 活動タイプ
  activity_type TEXT CHECK (activity_type IN (
    'phone_call',        -- 架電
    'email',             -- メール送信
    'inquiry_form',      -- 問い合わせフォーム
    'meeting',           -- 対面商談
    'online_meeting',    -- オンライン商談
    'proposal_sent',     -- 提案書送付
    'follow_up',         -- フォローアップ
    'status_change',     -- ステータス変更
    'other'              -- その他
  )),

  -- 活動詳細
  title TEXT NOT NULL,
  description TEXT,
  outcome TEXT,  -- success, no_answer, declined, pending, scheduled
  next_action TEXT,
  next_action_date TIMESTAMPTZ,

  -- メタデータ
  activity_date TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT
);
```

### 12.3 主要機能

#### 1. 営業リード一覧ページ（`/admin/sales`）

**特徴**:
- ステータス別サマリーカード（7種類のステータスを視覚的に表示）
- カードクリックで該当ステータスにフィルター可能
- キーワード検索（会社名、カナ、担当者名）
- ステータス・担当者での絞り込み
- 並び替え（次回アポ日近い順、最終接触日、会社名など）
- 活動回数の表示

**画面構成**:
```
┌─────────────────────────────────────────────────────────┐
│ [📞12] [👤8] [📋5] [💼3] [📝2] [✅15] [🚫1]  ← サマリー │
├─────────────────────────────────────────────────────────┤
│ [検索・フィルター]                                       │
├─────────────────────────────────────────────────────────┤
│ 全50件中 12件を表示          並び替え: [次回アポ日近い順]│
├─────────────────────────────────────────────────────────┤
│ 会社名 | ステータス | 連絡先 | 次回アポ | 活動回数 | 操作│
│ ...                                                     │
└─────────────────────────────────────────────────────────┘
```

#### 2. 新規リード作成（`/admin/sales/new`）

**2ステッププロセス**:

**Step 1: 重複チェック**
- 会社名と住所を入力
- 「重複チェック」ボタンをクリック
- 類似企業が見つかった場合：
  - 警告表示
  - 既存リードへのリンク表示
  - チェックボックスで「別企業として登録」を確認
- 重複なしの場合：自動的にStep 2へ遷移

**Step 2: 詳細情報入力**
- 基本情報（会社名、カナ、サブドメイン候補、業種、従業員数）
- 連絡先情報（担当者名、電話、メール、住所）
- 営業情報（想定プラン、次回アポ日時、提案内容、メモ）
- 担当者設定
- **組織マスタ連携オプション**: チェックすると`organizations`テーブルにも同時登録

**重複チェックロジック**:
1. 完全一致チェック（会社名 + 住所）
2. 部分一致チェック（会社名・カナの類似）
3. 住所前方一致チェック（最初の10文字）

#### 3. リード詳細・編集ページ（`/admin/sales/[id]`）

**2カラムレイアウト**:

**左カラム（60%）- 基本情報**:
- ステータス表示・変更（大きなセレクトボックス）
- 組織連携情報（紐付いている場合）
- 基本情報（会社名、業種、従業員数、プランなど）
- 連絡先情報（担当者、電話、メール、住所）
- アポイント・提案情報（次回アポ、提案内容、メモ）
- インライン編集機能（編集ボタン → 保存/キャンセル）

**右カラム（40%）- 活動履歴**:
- 新規活動追加フォーム（常時表示、折りたたみ可能）
- 活動履歴タイムライン表示
  - アイコン・色分けで活動タイプを識別
  - 結果表示（成功、不在、断られた、保留、予定）
  - 次回アクション表示
  - 作成者表示

**ステータス変更時の自動記録**:
- ステータスが変更されると、`sales_activities`テーブルに自動で活動履歴が追加される
- 活動タイプ: `status_change`
- 詳細: 「見込み客 → 提案中」のように変更内容を記録

#### 4. 活動履歴管理

**活動タイプ**:
- 📞 架電
- ✉️ メール送信
- 📝 問い合わせフォーム
- 🤝 対面商談
- 💻 オンライン商談
- 📋 提案書送付
- 🔄 フォローアップ
- 🔔 ステータス変更（自動）
- 📌 その他

**活動の結果**:
- ✅ 成功（つながった、アポ取得等）
- ⏸ 不在・不通
- ❌ 断られた
- ⏳ 保留
- 📅 予定

**次回アクション設定**:
- 次回やるべきことを記録
- 予定日を設定可能

### 12.4 API エンドポイント

#### `POST /api/admin/sales`
営業リードを新規作成

**リクエストボディ**:
```json
{
  "companyName": "株式会社サンプル",
  "companyNameKana": "カブシキガイシャサンプル",
  "status": "appointment",
  "contactPerson": "山田太郎",
  "contactEmail": "yamada@sample.com",
  "contactPhone": "03-1234-5678",
  "address": "東京都渋谷区...",
  "industry": "建設業",
  "employeeCount": "50",
  "estimatedPlan": "basic",
  "nextAppointmentDate": "2025-12-15T14:00",
  "assignedTo": "営業担当A",
  "notes": "初回ヒアリング済み",
  "createOrganization": false
}
```

**レスポンス**:
```json
{
  "id": "uuid",
  "warning": "組織マスタの作成に失敗しました"  // オプション
}
```

#### `POST /api/admin/sales/check-duplicate`
重複チェック

**リクエストボディ**:
```json
{
  "companyName": "株式会社サンプル",
  "address": "東京都渋谷区..."
}
```

**レスポンス**:
```json
{
  "isDuplicate": true,
  "similarLeads": [
    {
      "id": "uuid",
      "company_name": "株式会社サンプル",
      "address": "東京都渋谷区...",
      "status": "prospect"
    }
  ]
}
```

#### `PATCH /api/admin/sales/[id]`
営業リードを更新

**リクエストボディ**: 新規作成と同様（全フィールド）+ 以下:
```json
{
  "statusChanged": true,
  "oldStatus": "prospect"
}
```

#### `POST /api/admin/sales/[id]/activities`
活動履歴を追加

**リクエストボディ**:
```json
{
  "activityType": "phone_call",
  "title": "初回ヒアリング",
  "description": "課題のヒアリングを実施。現在の工具管理方法を確認。",
  "outcome": "success",
  "nextAction": "提案書を作成して送付する",
  "nextActionDate": "2025-12-20T10:00"
}
```

### 12.5 UI/UX の特徴

#### ステータス別カラーコード
- **アポイント** (紫): `bg-purple-100 text-purple-800`
- **見込み客** (青): `bg-blue-100 text-blue-800`
- **提案中** (黄): `bg-yellow-100 text-yellow-800`
- **商談中** (橙): `bg-orange-100 text-orange-800`
- **契約中** (水色): `bg-cyan-100 text-cyan-800`
- **契約済み** (緑): `bg-green-100 text-green-800`
- **アポ禁止** (赤): `bg-red-100 text-red-800`

#### サマリーカードのインタラクション
- クリックでそのステータスにフィルター
- 再クリックで全件表示に戻る
- ホバー時にシャドウで反応

#### 活動履歴タイムライン
- 時系列で降順表示（最新が上）
- タイムライン線で視覚的に繋がりを表現
- 各活動はカード形式で表示
- アイコンと色で活動タイプを識別

### 12.6 組織マスタとの連携

#### 契約済みステータスへの移行
営業リードが「契約済み」ステータスになった場合：
1. リード詳細画面に組織情報が表示される
2. 組織詳細ページへのリンクが表示される
3. 契約管理ページから新規契約を作成する際、営業リードと紐付け可能

#### 新規リード作成時の同時登録
「組織マスタにも同時登録する」をチェックした場合：
- `organizations`テーブルにレコード作成
- `sales_leads.organization_id`に組織IDを紐付け
- 初期状態は`is_active = false`（無効）
- サブドメインが必須

### 12.7 実装ファイル一覧

#### ページコンポーネント
- `app/admin/sales/page.tsx` - 営業リード一覧ページ
- `app/admin/sales/new/page.tsx` - 新規リード作成ページ
- `app/admin/sales/[id]/page.tsx` - リード詳細ページ

#### UIコンポーネント
- `components/admin/SalesLeadsTable.tsx` - リード一覧テーブル
- `components/admin/SalesLeadsFilter.tsx` - フィルターコンポーネント
- `components/admin/NewSalesLeadForm.tsx` - 新規作成フォーム
- `components/admin/SalesLeadDetail.tsx` - リード詳細・編集
- `components/admin/ActivityTimeline.tsx` - 活動履歴タイムライン
- `components/admin/AddActivityForm.tsx` - 活動追加フォーム

#### API
- `app/api/admin/sales/route.ts` - リード作成
- `app/api/admin/sales/check-duplicate/route.ts` - 重複チェック
- `app/api/admin/sales/[id]/route.ts` - リード更新
- `app/api/admin/sales/[id]/activities/route.ts` - 活動追加

#### データベース
- `supabase/migrations/20251210000012_create_sales_leads.sql`
- `supabase/migrations/20251210000013_create_sales_activities.sql`

### 12.8 今後の拡張予定

- [ ] カンバンボード表示（ドラッグ&ドロップでステータス変更）
- [ ] カレンダービュー（アポイント日時の可視化）
- [ ] リマインダー機能（次回アクション日の通知）
- [ ] 営業レポート機能（ステータス別集計、コンバージョン率）
- [ ] メール送信機能の統合
- [ ] 活動履歴の一括エクスポート（CSV）
- [ ] 営業担当者の権限管理
- [ ] 契約書作成機能との連携

---


## 13. パッケージ管理システム ✅ **実装済み**（2025-12-12追加）

### 13.1 概要

パッケージ管理システムは、Super Adminがシステムの機能パッケージを動的に管理できる機能です。パッケージの作成、編集、削除、機能リストの管理が可能です。

### 13.2 アクセス方法

**URL**: `http://localhost:3000/admin/packages`

**権限**: **Owner のみ**（Sales ロールは閲覧のみ）

### 13.3 主な機能

#### パッケージ一覧表示
- パッケージカード形式で表示
- パッケージ名、説明、月額料金、機能リスト表示
- パッケージキーの表示
- 有効/無効ステータス表示

#### パッケージ作成
1. 「新規パッケージ作成」ボタンをクリック
2. モーダルで以下を入力:
   - パッケージ名
   - 説明
   - 月額料金（円）
   - 機能リスト
     - 機能名
     - 機能キー（例: `asset.tool_management`）
     - ヘッダー表示（【】で囲む）
3. 「作成」ボタンで保存
4. パッケージキーは自動生成（`package_001`, `package_002`, ...）

#### パッケージ編集
1. パッケージカードの「編集」ボタンをクリック
2. モーダルで情報を編集
3. 「更新」ボタンで保存

#### パッケージ削除
1. パッケージカードの「削除」ボタンをクリック
2. 確認ダイアログで「削除」を選択
3. 契約で使用中のパッケージは削除不可（エラーメッセージ表示）

### 13.4 機能キー命名規則

機能キーは以下のカテゴリ別に命名:

- `asset.*`: 現場資産管理系（道具、消耗品、重機）
- `dx.*`: 業務効率化系（勤怠、作業報告書、帳票）
- `master.*`: マスタ管理系（現場、スタッフ）
- `report.*`: レポート系（使用状況、分析）
- `integration.*`: 外部連携系

詳細: `docs/FEATURE_KEY_NAMING.md`

### 13.5 契約作成との連携

- 契約作成ページ (`/admin/contracts/new`) でパッケージを動的選択
- 複数パッケージ選択可能（チェックボックス）
- パッケージの料金は自動反映
- 選択したパッケージは `contract_packages` テーブルに保存

### 13.6 初期データ

- **現場資産パック**: ¥18,000/月
- **現場DX業務効率化パック**: ¥22,000/月
- **フル機能統合パック**: ¥32,000/月

### 13.7 データベース

#### テーブル
- `packages`: パッケージマスタ
- `package_features`: パッケージ機能リスト
- `contract_packages`: 契約とパッケージの紐付け

#### マイグレーション
- `supabase/migrations/20251212000010_create_packages_system.sql`

### 13.8 API エンドポイント

| メソッド | エンドポイント | 説明 | 権限 |
|---------|-------------|------|------|
| GET | `/api/admin/packages` | パッケージ一覧取得 | 全員 |
| POST | `/api/admin/packages` | パッケージ作成 | Owner のみ |
| GET | `/api/admin/packages/[id]` | パッケージ詳細取得 | 全員 |
| PUT | `/api/admin/packages/[id]` | パッケージ更新 | Owner のみ |
| DELETE | `/api/admin/packages/[id]` | パッケージ削除 | Owner のみ |

---

## 14. Super Admin 権限管理システム ✅ **実装済み**（2025-12-12追加）

### 14.1 概要

Super Adminに権限レベルを導入し、Owner（オーナー）と Sales（営業）の2つのロールで機能アクセスを制御します。

### 14.2 権限レベル

#### Owner（オーナー）
- **対象ユーザー**: システム管理者（あなた）
- **アクセス可能機能**:
  - 全ての機能にアクセス可能
  - パッケージ設定の作成・編集・削除
  - 契約の作成・編集・削除・完了
  - 管理者アカウントの追加・編集・削除
  - 全ての操作が可能

#### Sales（営業）
- **対象ユーザー**: 営業会社の担当者
- **制限事項**:
  - ❌ パッケージ設定: 閲覧のみ（作成・編集・削除不可）
  - ❌ 契約管理: 閲覧のみ（作成・編集・削除・完了不可）
  - ❌ 管理者アカウント管理: アクセス不可（メニュー非表示）
- **アクセス可能**:
  - ✅ ダッシュボード: 閲覧可
  - ✅ 組織管理: 閲覧・編集可
  - ✅ 営業管理: 閲覧・編集可
  - ✅ マスタ管理: 閲覧・編集可
  - ✅ 操作ログ: 閲覧可
  - ✅ 売上分析: 閲覧可

### 14.3 UI制御

#### サイドバーメニュー
- 「パッケージ設定」: Owner のみ表示
- 「管理者アカウント」: Owner のみ表示

#### パッケージ設定ページ
- Sales ロール:
  - 「新規パッケージ作成」ボタン無効化
  - 各パッケージカードの編集・削除ボタン非表示
  - 「閲覧のみ」メッセージ表示

#### 契約管理ページ
- Sales ロール:
  - 「新規契約」ボタン無効化、「閲覧のみ」表示
  - 黄色の警告バナー表示

### 14.4 API権限チェック

以下のAPIは Owner のみ実行可能:

- `POST /api/admin/packages`
- `PUT /api/admin/packages/[id]`
- `DELETE /api/admin/packages/[id]`
- `POST /api/admin/contracts`
- `POST /api/admin/contracts/[id]/complete`
- `POST /api/admin/super-admins`

Sales ロールがこれらのAPIを実行すると 403 エラーを返します。

### 14.5 データベース

#### カラム追加
- `super_admins.role TEXT NOT NULL DEFAULT 'sales' CHECK (role IN ('owner', 'sales'))`

#### マイグレーション
- `supabase/migrations/20251212000011_add_super_admin_roles.sql`

### 14.6 確認方法

現在のロールは `GET /api/admin/me` で取得可能。

---

## 15. 管理者アカウント管理機能 ✅ **実装済み**（2025-12-12追加）

### 15.1 概要

Super Admin アカウントを追加・管理できる機能です。営業会社のログインアカウントを作成し、権限レベルを設定できます。

### 15.2 アクセス方法

**URL**: `http://localhost:3000/admin/admins`

**権限**: **Owner のみ**

### 15.3 主な機能

#### アカウント一覧表示
- 名前
- メールアドレス
- 権限レベル（バッジ表示）
  - オーナー: 紫色バッジ
  - 営業: 青色バッジ
- 作成日時

#### 新規アカウント追加
1. 「+ 新規アカウント追加」ボタンをクリック
2. モーダルで以下を入力:
   - 名前
   - メールアドレス
   - パスワード
   - 権限レベル（Owner / Sales）
3. 「作成」ボタンで保存
4. パスワードは bcrypt でハッシュ化して保存

### 15.4 API エンドポイント

| メソッド | エンドポイント | 説明 | 権限 |
|---------|-------------|------|------|
| POST | `/api/admin/super-admins` | Super Admin作成 | Owner のみ |

---

## 16. 操作ログページ ✅ **実装済み**（2025-12-12追加）

### 16.1 概要

Super Admin の操作履歴を一覧表示し、フィルタリングできる機能です。

### 16.2 アクセス方法

**URL**: `http://localhost:3000/admin/logs`

**権限**: 全員

### 16.3 主な機能

#### ログ一覧表示
- 日時
- 実行者
- アクション
- 対象
- IPアドレス

#### フィルタリング
- アクション種別
- 対象タイプ
- 日付範囲（開始日・終了日）

#### ページネーション
- 50件/ページ

#### ログ詳細表示
- モーダルでJSON形式の詳細情報表示

### 16.4 API エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|-------------|------|
| GET | `/api/admin/logs` | ログ一覧取得 |

---

## 17. 売上分析ページ ✅ **実装済み**（2025-12-12追加）

### 17.1 概要

売上・契約状況を分析できる機能です。

### 17.2 アクセス方法

**URL**: `http://localhost:3000/admin/analytics`

**権限**: 全員

### 17.3 主な機能

#### 統計情報
- **MRR**（月次経常収益）
- **ARR**（年次経常収益）
- **YoY成長率**（前年同月比）

#### グラフ表示
- 月次売上推移グラフ（12ヶ月）

#### 内訳
- パッケージ別売上内訳
- プラン別契約数内訳

#### 表示範囲
- 現在年のデータのみ表示
- データがない場合は「まだ契約データがありません」メッセージ

### 17.4 API エンドポイント

| メソッド | エンドポイント | 説明 |
|---------|-------------|------|
| GET | `/api/admin/analytics/revenue` | 売上データ集計 |

---

