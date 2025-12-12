# ザイロク (Zairoku) 本番環境移行計画書

> **最終更新**: 2025-12-12
> **ステータス**: Phase 0準備中
> **目標リリース日**: 2025年1月2日（本日から21日後）

## 📋 エグゼクティブサマリー

本ドキュメントは、ザイロク（Zairoku）のローカル開発環境から本番環境への移行計画を定義します。

### プロジェクト基本情報

| 項目 | 内容 |
|------|------|
| **サービス名** | ザイロク (Zairoku) |
| **サービスタイプ** | マルチテナントSaaS |
| **対象業種** | 現場系業種（建築、土木、塗装、電気工事等） |
| **技術スタック** | Next.js 15.1.6, TypeScript, Supabase, Stripe, Vercel |
| **マイグレーション数** | 82ファイル（5,815行のSQL） |
| **TypeScriptファイル数** | 360ファイル |
| **パッケージシステム** | 2つの機能パック（現場資産パック、現場DX業務効率化パック） |
| **課金方式** | Stripe Billing A方式（Invoice Item方式） |

---

## 1. 現状分析

### 1.1 実装済み機能リスト

#### Phase 1-3: コア機能（✅ 完了）

**認証・組織管理**
- ✅ マルチテナント認証システム（Supabase Auth）
- ✅ サブドメイン識別（organization_idによる分離）
- ✅ Row Level Security (RLS) ポリシー実装
- ✅ ユーザー役割管理（staff, leader, manager, admin）

**資産管理パッケージ機能**
- ✅ 道具管理（個別QRコード、数量管理）
- ✅ 道具マスタプリセット（共通マスタ）
- ✅ メーカーマスタ管理
- ✅ カテゴリマスタ管理
- ✅ 倉庫位置管理
- ✅ 重機管理
- ✅ 消耗品管理
- ✅ 移動履歴追跡
- ✅ 在庫アラート（低在庫、保証期限）

**DX業務効率化パッケージ機能**
- ✅ 出退勤管理
  - QRコード打刻（事務所、現場リーダー）
  - 休憩時間記録
  - タブレット端末管理
  - 月次レポート
- ✅ 作業報告書
  - 報告書作成・編集
  - 写真・資料アップロード
  - 承認ワークフロー
  - PDF出力
  - カスタムフィールド対応
- ✅ 帳票管理（見積書、請求書、発注書）
- ✅ 取引先管理

**システム管理者機能（Super Admin）**
- ✅ スーパーアドミン認証（JWT、bcrypt）
- ✅ 組織管理（CRUD、営業ステータス管理）
- ✅ 契約管理（契約作成、プラン変更、パッケージ管理）
- ✅ 契約書PDF生成
- ✅ 営業管理（案件管理、活動履歴）
- ✅ 共通道具マスタ管理
- ✅ メーカーマスタ管理（未登録メーカー統合機能）
- ✅ パッケージ管理システム
- ✅ 操作ログ記録・閲覧
- ✅ 売上分析ダッシュボード
- ✅ スーパーアドミンアカウント管理（Owner/Operator/Salesの3役割）

#### Phase 4: Stripe Billing統合（✅ 完了）

**Stripe Billing A方式実装**
- ✅ Stripe Customer作成
- ✅ 契約作成時のStripe設定（`lib/billing/setup-contract-billing.ts`）
- ✅ 料金計算ロジック（`lib/billing/calculate-fee.ts`）
- ✅ 毎月の請求書自動生成（`/api/cron/create-monthly-invoices`）
- ✅ 請求書リマインダーメール送信（`/api/cron/send-invoice-reminders`）
- ✅ 請求書・入金管理画面（Super Admin）
- ✅ 請求書PDF生成
- ✅ Stripe Webhook受信（`/api/webhooks/stripe`）
- ✅ データベーススキーマ（invoices, payment_records）

**Vercel Cron設定**
- ✅ `vercel.json`に2つのcron jobを設定
  - 毎日1:00 AM: 請求書自動生成
  - 毎日9:00 AM: リマインダーメール送信

#### パッケージ制御システム（✅ 完了）

**データベース**
- ✅ `contracts`テーブルに機能パッケージカラム追加
- ✅ `organization_features`ビュー作成
- ✅ テスト用組織データ（資産パック、DXパック）

**フロントエンド**
- ✅ `useFeatures`フック実装
- ✅ サイドバーメニュー表示制御
- ✅ ダッシュボードウィジェット制御
- ✅ 設定メニューのパッケージ制御

**テスト**
- ✅ ユニットテスト（26テストケース）
- ✅ 統合テスト（9シナリオ）
- ✅ E2Eテスト（Playwright、5シナリオ）

### 1.2 未実装機能リスト

#### 緊急度: 高（本番リリース前に必須）

1. **ビルドエラー修正**（最優先）★★★★★
   - ❌ `/api/cron/process-plan-changes/route.ts`のimport修正
   - ❌ `/api/cron/send-invoice-reminders/route.ts`のimport修正
   - ❌ `/api/stripe/customers/create/route.ts`のimport修正
   - ❌ `/api/stripe/subscriptions/create/route.ts`のimport修正
   - ❌ `/api/stripe/subscriptions/downgrade/route.ts`のimport修正
   - ❌ `/api/stripe/subscriptions/upgrade/route.ts`のimport修正
   - 原因: `@/utils/supabase/server`が存在しない（正しくは`@/lib/supabase/server`）

2. **ESLint設定の修正**
   - ❌ Next.js 15とESLint 9の互換性問題
   - 影響: CI/CDパイプラインでエラー

3. **本番環境変数の設定**
   - ❌ Supabase本番プロジェクトの作成
   - ❌ Stripe本番APIキーの設定
   - ❌ `CRON_SECRET`の強固な値に変更
   - ❌ `SUPER_ADMIN_JWT_SECRET`の再生成
   - ❌ `NEXTAUTH_SECRET`の本番用値生成

4. **セキュリティ強化**
   - ❌ スーパーアドミン2FA（二要素認証）実装
   - ❌ Rate Limiting実装（現在Redis設定済みだが未実装）
   - ❌ IPアドレス制限（Super Admin）

#### 緊急度: 中（初期ユーザー獲得前に完了すべき）

5. **エラー監視・ロギング**
   - ❌ Sentry本番設定（環境変数のみ、実装未）
   - ❌ 構造化ログ出力（`lib/logger.ts`は存在するが活用未）
   - ❌ アラート通知設定

6. **パフォーマンス最適化**
   - ❌ データベースインデックス最適化検証
   - ❌ 画像最適化（Next.js Image最適化設定）
   - ❌ クエリパフォーマンステスト

7. **顧客向けUI改善**
   - ❌ カード情報登録画面（顧客自身で登録）
   - ❌ 請求履歴閲覧画面（組織管理者向け）
   - ❌ 領収書ダウンロード機能

8. **運用ドキュメント**
   - ❌ 顧客向けマニュアル（操作ガイド）
   - ❌ トラブルシューティングガイド
   - ❌ FAQ

#### 緊急度: 低（ユーザー増加後に対応）

9. **自動化・効率化**
   - ❌ CI/CDパイプライン完全自動化（現在は手動デプロイ）
   - ❌ E2Eテストの自動実行（GitHub Actions）
   - ❌ データベースバックアップ自動化

10. **スケーラビリティ**
    - ❌ CDN設定（画像配信高速化）
    - ❌ 全文検索（PostgreSQL FTS or Elasticsearch）
    - ❌ 非同期ジョブキュー（Bull/BullMQ）

### 1.3 データベース状態

**マイグレーション**
- 総数: 82ファイル
- 総行数: 5,815行のSQL
- 最新: `20251212000015_add_stripe_columns_to_invoices.sql`
- 状態: ✅ローカル環境では完全適用済み

**主要テーブル数**
- 認証・組織: 4テーブル（organizations, users, super_admins, super_admin_logs）
- 資産管理: 15テーブル（tools, tool_sets, tool_items, consumables等）
- 重機管理: 3テーブル
- 出退勤: 5テーブル
- 作業報告書: 6テーブル
- 帳票管理: 4テーブル
- 契約・請求: 6テーブル（contracts, invoices, payment_records等）
- マスタ: 5テーブル（system_common_tools, tool_manufacturers等）
- **合計: 約50テーブル**

**RLSポリシー**
- ✅ 全テーブルでRLS有効化
- ✅ organization_idによるテナント分離
- ✅ ユーザー役割ベースのアクセス制御
- ✅ スーパーアドミン専用ポリシー

### 1.4 依存関係の状態

**主要依存パッケージ（package.json）**

| パッケージ | バージョン | 状態 |
|----------|----------|------|
| Next.js | 15.1.6 | ✅最新 |
| React | 19.0.0 | ✅最新 |
| TypeScript | 5.3.3 | ✅安定 |
| Supabase | 2.39.3 | ✅安定 |
| Stripe | 20.0.0 | ✅最新 |
| Tailwind CSS | 3.4.1 | ✅最新 |

**開発依存関係**
- ✅ ESLint（設定要修正）
- ✅ Playwright（E2Eテスト）
- ✅ Jest（ユニットテスト）
- ✅ Husky（Git hooks）

**セキュリティ監査**
- ⚠️ `npm audit`実行推奨（未実施）

---

## 2. 本番環境移行タスクリスト

### 2.1 必須タスク（本番リリース前に絶対必要）

#### Task 1: ビルドエラー修正（最優先）★★★★★

**説明**: 6つのファイルでimportパスが間違っている
**必要な作業**:
```bash
# 以下のファイルを修正
# Before: import { createClient } from '@/utils/supabase/server'
# After:  import { createClient } from '@/lib/supabase/server'

1. app/api/cron/process-plan-changes/route.ts
2. app/api/cron/send-invoice-reminders/route.ts
3. app/api/stripe/customers/create/route.ts
4. app/api/stripe/subscriptions/create/route.ts
5. app/api/stripe/subscriptions/downgrade/route.ts
6. app/api/stripe/subscriptions/upgrade/route.ts
```
**所要時間**: 30分
**依存関係**: なし
**検証方法**: `npm run build`が成功すること

---

#### Task 2: ESLint設定修正 ★★★★☆

**説明**: Next.js 15とESLint 9の互換性問題
**必要な作業**:
```bash
# .eslintrc.jsonを削除し、eslint.config.jsに移行
# または、eslint@8にダウングレード
```
**所要時間**: 1時間
**依存関係**: Task 1完了後
**検証方法**: `npm run lint`が成功すること

---

#### Task 3: Supabase本番プロジェクト作成 ★★★★★

**説明**: 本番データベースとAuth環境のセットアップ
**必要な作業**:
1. Supabase Dashboardで新規プロジェクト作成（本番用）
2. プロジェクト設定:
   - リージョン: Tokyo（ap-northeast-1）推奨
   - PostgreSQL バージョン: 15.x
3. 環境変数取得:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. マイグレーション実行:
   ```bash
   supabase db push --db-url $PRODUCTION_DATABASE_URL
   ```
5. RLSポリシー検証
6. Storage Bucket作成:
   - `tool-images`
   - `work-report-photos`
   - `work-report-attachments`

**所要時間**: 2時間
**依存関係**: なし
**検証方法**: 全マイグレーションが正常実行、RLSテスト成功

---

#### Task 4: Stripe本番環境設定 ★★★★★

**説明**: Stripe本番アカウントとWebhook設定
**必要な作業**:
1. Stripe本番モードに切り替え
2. 本番APIキー取得:
   - `STRIPE_SECRET_KEY` (sk_live_xxxxx)
   - `STRIPE_PUBLISHABLE_KEY` (pk_live_xxxxx)
3. Webhook設定:
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - イベント:
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
     - `invoice.finalized`
   - `STRIPE_WEBHOOK_SECRET`を取得
4. 本番環境でテスト決済実行

**所要時間**: 1.5時間
**依存関係**: Task 3（本番URL確定後）
**検証方法**: テスト請求書を作成し、Webhook正常受信確認

---

#### Task 5: 本番環境変数設定 ★★★★★

**説明**: Vercel本番環境に全環境変数を設定
**必要な作業**:
1. Vercel Dashboardで環境変数設定:
   ```bash
   # Database
   DATABASE_URL=postgresql://... (本番)
   DIRECT_URL=postgresql://... (本番)

   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=(Task 3で取得)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=(Task 3で取得)
   SUPABASE_SERVICE_ROLE_KEY=(Task 3で取得)

   # Stripe
   STRIPE_SECRET_KEY=(Task 4で取得)
   STRIPE_PUBLISHABLE_KEY=(Task 4で取得)
   STRIPE_WEBHOOK_SECRET=(Task 4で取得)

   # Security
   NEXTAUTH_SECRET=(openssl rand -base64 32で生成)
   SUPER_ADMIN_JWT_SECRET=(openssl rand -hex 32で生成)
   CRON_SECRET=(openssl rand -base64 32で生成)

   # Monitoring
   SENTRY_DSN=(Sentry設定後に取得)
   NEXT_PUBLIC_SENTRY_DSN=(同上)

   # Email (SendGrid or Resend)
   SMTP_HOST=smtp.sendgrid.net
   SMTP_PORT=587
   SMTP_USER=apikey
   SMTP_PASSWORD=(SendGrid APIキー)
   SMTP_FROM=noreply@zairoku.com
   ```
2. 環境変数の暗号化確認
3. `.env.production.local`にバックアップ（Gitignore対象）

**所要時間**: 1時間
**依存関係**: Task 3, 4完了後
**検証方法**: Vercelデプロイ時にビルド成功

---

#### Task 6: 初期スーパーアドミン作成 ★★★★☆

**説明**: 本番環境用の初期管理者アカウント作成
**必要な作業**:
1. スクリプト実行:
   ```typescript
   // scripts/create-super-admin-production.ts
   import bcrypt from 'bcrypt';
   import { createClient } from '@supabase/supabase-js';

   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.SUPABASE_SERVICE_ROLE_KEY!
   );

   const passwordHash = await bcrypt.hash('強固なパスワード', 10);

   await supabase.from('super_admins').insert({
     email: 'admin@your-company.com',
     name: 'System Administrator',
     password_hash: passwordHash,
     role: 'owner',
     is_active: true,
   });
   ```
2. 初回ログイン後、パスワード変更を強制
3. 2FA有効化（将来実装）

**所要時間**: 30分
**依存関係**: Task 3完了後
**検証方法**: Super Adminログイン成功

---

#### Task 7: ドメイン設定とSSL証明書 ★★★★☆

**説明**: カスタムドメインとHTTPS設定
**必要な作業**:
1. ドメイン取得（例: zairoku.com）
2. Vercelにドメイン追加:
   - メインドメイン: `zairoku.com`
   - ワイルドカードサブドメイン: `*.zairoku.com`
   - Super Adminドメイン: `admin.zairoku.com`
3. DNS設定:
   ```
   A Record: @ → Vercel IP
   CNAME: * → cname.vercel-dns.com
   CNAME: admin → cname.vercel-dns.com
   ```
4. SSL証明書の自動発行確認（Vercelが自動処理）
5. HTTPSリダイレクト有効化

**所要時間**: 2時間（DNS伝播含む）
**依存関係**: なし
**検証方法**: `https://zairoku.com`、`https://test-org.zairoku.com`、`https://admin.zairoku.com`にアクセス可能

---

#### Task 8: Sentry エラー監視設定 ★★★☆☆

**説明**: 本番エラートラッキングの設定
**必要な作業**:
1. Sentry プロジェクト作成
2. `sentry.client.config.ts`と`sentry.server.config.ts`設定
3. 環境変数設定（Task 5に含む）
4. テストエラー送信で動作確認
5. アラート通知設定（Slack連携推奨）

**所要時間**: 1.5時間
**依存関係**: なし
**検証方法**: テストエラーがSentryに記録される

---

#### Task 9: データベースバックアップ設定 ★★★★★

**説明**: 定期的な自動バックアップ設定
**必要な作業**:
1. Supabase自動バックアップ確認（Pro プラン以上で有効）
2. 手動バックアップスクリプト作成:
   ```bash
   # scripts/backup-database.sh
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   # S3やGoogle Cloud Storageにアップロード
   ```
3. 復元手順ドキュメント作成

**所要時間**: 2時間
**依存関係**: Task 3完了後
**検証方法**: バックアップファイルから復元テスト成功

---

#### Task 10: 本番デプロイとスモークテスト ★★★★★

**説明**: 初回本番デプロイと基本動作確認
**必要な作業**:
1. Gitにpush（mainブランチ）
2. Vercel自動デプロイ確認
3. スモークテスト実行:
   - [ ] Super Adminログイン
   - [ ] 組織作成
   - [ ] 契約作成
   - [ ] 契約書PDF生成
   - [ ] ウェルカムメール送信
   - [ ] 顧客ログイン（サブドメイン）
   - [ ] 道具登録（資産パック）
   - [ ] 出退勤打刻（DXパック）
   - [ ] 請求書自動生成（cron手動実行）
   - [ ] Stripeダッシュボード確認
4. エラーログ確認（Sentry、Vercel Logs）

**所要時間**: 3時間
**依存関係**: Task 1-9すべて完了
**検証方法**: 全スモークテスト項目が成功

---

### 2.2 推奨タスク（初期ユーザー獲得前に完了すべき）

#### Task 11: Rate Limiting実装 ★★★☆☆

**説明**: APIエンドポイントのレート制限
**所要時間**: 3時間
**実装内容**:
```typescript
// lib/rate-limit.ts (Redisベース)
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export async function rateLimit(
  identifier: string,
  limit: number = 100,
  window: number = 60
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate_limit:${identifier}`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, window);
  }

  return {
    success: current <= limit,
    remaining: Math.max(0, limit - current),
  };
}
```

---

#### Task 12: 顧客向けカード情報登録画面 ★★★☆☆

**説明**: 組織管理者が自社のカード情報を登録できる画面
**所要時間**: 5時間
**実装内容**:
- Stripe Elements統合
- カード情報の暗号化保存（Stripeが管理）
- 支払い方法変更機能（請求書払い ⇔ カード決済）

---

#### Task 13: E2Eテスト自動化（CI/CD統合） ★★★☆☆

**説明**: GitHub ActionsでPlaywright実行
**所要時間**: 4時間
**実装内容**:
```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

---

#### Task 14: パフォーマンス最適化 ★★★☆☆

**説明**: 初期表示速度とクエリ最適化
**所要時間**: 6時間
**実装内容**:
1. データベースクエリ最適化
   - N+1クエリの排除
   - インデックス追加
2. 画像最適化
   - Next.js Imageコンポーネント活用
   - WebP変換
3. バンドルサイズ削減
   - 動的インポート
   - コード分割

---

#### Task 15: 顧客向けマニュアル作成 ★★★☆☆

**説明**: エンドユーザー向け操作ガイド
**所要時間**: 8時間
**内容**:
- スタッフ向けマニュアル（QRコードスキャン、道具持出・返却）
- リーダー向けマニュアル（現場管理、チーム管理）
- 管理者向けマニュアル（組織設定、ユーザー管理）
- 動画チュートリアル（Loomで録画）

---

### 2.3 セキュリティ強化タスク（本番リリース前に実施推奨）

#### Task S1: セキュリティヘッダー本番環境確認 ★★★★★
**説明**: middleware.tsのセキュリティヘッダーが本番環境で適切に動作するか確認
**必要な作業**:
1. 本番環境でのHTTPSヘッダー確認
   ```bash
   # HSTSヘッダーが本番のみで有効になることを確認
   curl -I https://zairoku.com
   # Strict-Transport-Security: max-age=31536000 が含まれていることを確認
   ```
2. CSP（Content Security Policy）の調整
   - 本番ドメインに合わせてCSPを調整
   - Supabase本番URLを許可リストに追加

**所要時間**: 1時間
**依存関係**: Task 7（ドメイン設定）完了後
**検証方法**: セキュリティヘッダースキャナーで確認

---

#### Task S2: 2FA（二要素認証）実装 ★★★★★
**説明**: スーパーアドミン向けTOTP認証の実装
**必要な作業**:
1. データベーステーブル追加
   ```sql
   ALTER TABLE super_admins ADD COLUMN two_fa_secret TEXT;
   ALTER TABLE super_admins ADD COLUMN two_fa_enabled BOOLEAN DEFAULT false;
   ALTER TABLE super_admins ADD COLUMN backup_codes TEXT[];
   ```
2. 2FA設定画面の実装
3. ログイン時のTOTP検証
4. バックアップコードの生成と管理

**所要時間**: 8時間
**依存関係**: Task 6（初期スーパーアドミン作成）完了後
**検証方法**: Google AuthenticatorでのTOTP認証成功

---

#### Task S3: Supabaseサービスロールキー暗号化 ★★★★☆
**説明**: サービスロールキーの暗号化管理
**必要な作業**:
1. 環境変数の暗号化
   ```typescript
   // lib/security/encryption.ts
   import crypto from 'crypto';

   const algorithm = 'aes-256-gcm';
   const key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

   export function encryptServiceKey(text: string): string {
     const iv = crypto.randomBytes(16);
     const cipher = crypto.createCipheriv(algorithm, key, iv);
     // 実装詳細...
   }
   ```
2. キーローテーション機能
3. アクセスログ記録

**所要時間**: 4時間
**依存関係**: Task 5（環境変数設定）完了後
**検証方法**: 暗号化キーでのみアクセス可能

---

#### Task S4: CSRFトークン本番環境検証 ★★★★☆
**説明**: CSRF保護の本番環境での動作確認
**必要な作業**:
1. 本番環境でのCookie設定確認
   - SameSite属性の検証
   - Secure属性の確認（HTTPS必須）
2. クロスドメインリクエストのテスト
3. トークン有効期限の調整

**所要時間**: 2時間
**依存関係**: Task 10（本番デプロイ）完了後
**検証方法**: CSRF攻撃シミュレーションテスト

---

#### Task S5: IPアドレス制限実装 ★★★★☆
**説明**: スーパーアドミン画面へのIP制限
**必要な作業**:
1. 許可IPリストの管理
   ```typescript
   // middleware.ts に追加
   const ALLOWED_IPS = process.env.ADMIN_ALLOWED_IPS?.split(',') || [];

   if (request.nextUrl.pathname.startsWith('/admin')) {
     const clientIp = getClientIp(request);
     if (!ALLOWED_IPS.includes(clientIp)) {
       return NextResponse.redirect(new URL('/error/forbidden', request.url));
     }
   }
   ```
2. VPN接続要件の検討
3. 緊急アクセス用の一時解除機能

**所要時間**: 3時間
**依存関係**: なし
**検証方法**: 許可IP外からのアクセス拒否確認

---

#### Task S6: セキュリティ監査ログ強化 ★★★☆☆
**説明**: 詳細な監査ログの実装
**必要な作業**:
1. 全管理操作のログ記録
2. ログの改ざん防止（ハッシュチェーン）
3. ログ保存期間の設定（90日以上）
4. 異常検知アラート

**所要時間**: 5時間
**依存関係**: Task 8（Sentry設定）完了後
**検証方法**: ログの完全性検証

---

### 2.4 将来タスク（ユーザー増加後に対応）

#### Task 16: CDN設定（Cloudflare） ★★☆☆☆
**説明**: 画像配信の高速化
**所要時間**: 2時間

#### Task 17: 全文検索機能（PostgreSQL FTS） ★★☆☆☆
**説明**: 道具名、メーカー名の高速検索
**所要時間**: 6時間

#### Task 18: 非同期ジョブキュー（BullMQ + Redis） ★★☆☆☆
**説明**: 重い処理の非同期実行
**所要時間**: 8時間

---

## 3. 実装フェーズプラン

### Phase 0: 本番環境準備（インフラ・セキュリティ）

**期間**: 3日
**担当**: バックエンドエンジニア

| タスク | 優先度 | 所要時間 |
|-------|--------|---------|
| Task 1: ビルドエラー修正 | 最高 | 30分 |
| Task 2: ESLint設定修正 | 高 | 1時間 |
| Task 3: Supabase本番プロジェクト作成 | 最高 | 2時間 |
| Task 4: Stripe本番環境設定 | 最高 | 1.5時間 |
| Task 5: 本番環境変数設定 | 最高 | 1時間 |
| Task 6: 初期スーパーアドミン作成 | 高 | 30分 |
| Task 7: ドメイン設定とSSL証明書 | 高 | 2時間 |
| Task 8: Sentry エラー監視設定 | 中 | 1.5時間 |
| Task 9: データベースバックアップ設定 | 高 | 2時間 |

**完了条件**:
- ✅ `npm run build`成功
- ✅ 全マイグレーション適用済み
- ✅ HTTPS接続可能
- ✅ Sentryでエラー監視開始

---

### Phase 1: コア機能完成（MVP）

**期間**: 2日
**担当**: フルスタックエンジニア

| タスク | 優先度 | 所要時間 |
|-------|--------|---------|
| Task 10: 本番デプロイとスモークテスト | 最高 | 3時間 |
| Task 11: Rate Limiting実装 | 中 | 3時間 |
| テスト組織作成（3社） | 高 | 2時間 |
| 初期データ投入（マスタデータ） | 高 | 1時間 |

**完了条件**:
- ✅ 全スモークテスト合格
- ✅ APIレート制限動作
- ✅ テスト組織でログイン可能

---

### Phase 2: 品質保証・テスト

**期間**: 3日
**担当**: QAエンジニア + 開発者

**テスト項目**:
1. **機能テスト**（2日）
   - 全機能の手動テスト
   - マルチテナント分離テスト
   - パッケージ制御テスト
   - 決済フローテスト
2. **セキュリティテスト**（0.5日）
   - RLSポリシー検証
   - SQLインジェクション対策確認
   - XSS対策確認
3. **パフォーマンステスト**（0.5日）
   - 100組織×100ツール負荷テスト
   - クエリ実行時間計測

**完了条件**:
- ✅ 重大バグ0件
- ✅ セキュリティチェック合格
- ✅ ページ表示速度 < 2秒

---

### Phase 3: ベータリリース

**期間**: 1週間
**担当**: 全員

**内容**:
1. **ベータユーザー募集**（3社程度）
2. **フィードバック収集**
   - 毎日ユーザーインタビュー
   - 不具合報告の迅速対応
3. **ドキュメント整備**
   - Task 15: 顧客向けマニュアル作成
   - FAQ作成

**完了条件**:
- ✅ ベータユーザーから高評価（NPS > 50）
- ✅ 致命的バグ0件
- ✅ マニュアル完備

---

### Phase 4: 本番リリース

**期間**: 1日
**担当**: リードエンジニア

**手順**:
1. **リリース前確認**（午前）
   - [ ] 全環境変数設定済み
   - [ ] データベースバックアップ取得
   - [ ] ロールバック手順確認
   - [ ] 監視アラート設定確認
2. **本番リリース**（午後2時実施推奨）
   - [ ] mainブランチにマージ
   - [ ] Vercel自動デプロイ確認
   - [ ] スモークテスト再実行
3. **リリース後監視**（4時間）
   - Sentryエラー監視
   - Vercelログ監視
   - Supabaseクエリログ監視

**完了条件**:
- ✅ 本番環境正常稼働
- ✅ エラー発生率 < 0.1%
- ✅ ユーザーからの問い合わせなし

---

### Phase 5: 運用・監視体制確立

**期間**: 継続
**担当**: DevOps + カスタマーサポート

**内容**:
1. **日次監視**
   - Sentryエラーレビュー
   - Stripe請求書生成確認
   - データベースパフォーマンス確認
2. **週次メンテナンス**
   - 依存パッケージ更新
   - セキュリティパッチ適用
   - データベース最適化
3. **月次レビュー**
   - ユーザー増加分析
   - パフォーマンス改善提案
   - 新機能優先順位決定

---

## 4. 想定される課題と対策

### 4.1 技術的課題

#### 課題1: ビルドエラーによるデプロイ失敗 ⚠️

**問題の詳細**:
- 6つのファイルで`@/utils/supabase/server`をimportしているが、実際は`@/lib/supabase/server`
- このままではVercelデプロイが失敗する

**影響度**: 🔴 高（デプロイ不可）

**対策案**:
```bash
# 一括置換スクリプト
find app/api -type f -name "*.ts" -exec sed -i '' 's/@\/utils\/supabase\/server/@\/lib\/supabase\/server/g' {} +
```

**代替案**: なし（修正必須）

**担当者**: バックエンドエンジニア
**期限**: Phase 0開始直後

---

#### 課題2: ESLintエラーによるCI失敗 ⚠️

**問題の詳細**:
- Next.js 15 + ESLint 9の互換性問題
- `npm run lint`が失敗する

**影響度**: 🟡 中（CIは失敗するがビルドは可能）

**対策案**:
```bash
# Option A: eslint.config.jsに移行（推奨）
# Option B: eslint@8にダウングレード
npm install --save-dev eslint@8
```

**代替案**: CIでlintステップをスキップ（非推奨）

**担当者**: フロントエンドエンジニア
**期限**: Phase 0内

---

#### 課題3: Stripe Webhook署名検証失敗 ⚠️

**問題の詳細**:
- Vercelのリクエストボディが読み込み済みの場合、署名検証が失敗する可能性

**影響度**: 🟡 中（決済通知が受信できない）

**対策案**:
```typescript
// app/api/webhooks/stripe/route.ts
export const config = {
  api: {
    bodyParser: false, // 重要: bodyParserを無効化
  },
};
```

**代替案**: Stripe CLIでローカルテスト実施

**担当者**: バックエンドエンジニア
**期限**: Phase 1内

---

#### 課題4: マイグレーション実行順序の問題 ⚠️

**問題の詳細**:
- 82個のマイグレーションファイルが正しい順序で実行されるか不明

**影響度**: 🔴 高（データベース構築失敗）

**対策案**:
```bash
# ドライラン実行
supabase db push --dry-run --db-url $STAGING_DATABASE_URL

# 失敗した場合、マイグレーション順序を確認
ls -lt supabase/migrations/
```

**代替案**: ステージング環境で事前検証

**担当者**: データベースエンジニア
**期限**: Phase 0内（Task 3実施前）

---

### 4.2 運用上の課題

#### 課題5: 初期ユーザーサポート体制 ⚠️

**問題の詳細**:
- ベータユーザーからの問い合わせ対応リソース不足

**影響度**: 🟡 中（ユーザー満足度低下）

**対策案**:
1. FAQページ作成（Task 15に含む）
2. チャットサポート導入（Intercom or Crisp）
3. 営業時間内のメールサポート（24時間以内返信）

**代替案**: Slackコミュニティ作成（ユーザー同士で助け合い）

**担当者**: カスタマーサクセス
**期限**: Phase 3開始前

---

#### 課題6: cron jobの実行確認手段 ⚠️

**問題の詳細**:
- Vercel Cronが正常実行されているか監視する仕組みがない

**影響度**: 🔴 高（請求書未発行のリスク）

**対策案**:
```typescript
// lib/monitoring/cron-monitor.ts
import { Sentry } from '@sentry/nextjs';

export async function reportCronExecution(
  jobName: string,
  status: 'success' | 'error',
  details?: any
) {
  // Sentryに実行ログ送信
  if (status === 'error') {
    Sentry.captureException(new Error(`Cron job failed: ${jobName}`), {
      extra: details,
    });
  }

  // Slackに通知（オプション）
  await fetch(process.env.SLACK_WEBHOOK_URL!, {
    method: 'POST',
    body: JSON.stringify({
      text: `Cron job ${jobName}: ${status}`,
    }),
  });
}
```

**代替案**: Vercel Logs + 毎朝手動確認

**担当者**: DevOpsエンジニア
**期限**: Phase 2内

---

### 4.3 セキュリティ課題

#### 課題7: Super Admin認証の強化 ⚠️

**問題の詳細**:
- 現在、2FA（二要素認証）未実装
- IPアドレス制限なし

**影響度**: 🔴 高（全顧客データへのアクセスリスク）

**対策案**:
```typescript
// lib/auth/super-admin-2fa.ts
import speakeasy from 'speakeasy';

export function generateSecret() {
  return speakeasy.generateSecret({ name: 'Zairoku Admin' });
}

export function verifyToken(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1,
  });
}
```

**代替案**: IP制限のみ実装（短期対応）

**担当者**: セキュリティエンジニア
**期限**: Phase 1内（最優先）

---

#### 課題8: RLSポリシーの抜け漏れ ⚠️

**問題の詳細**:
- 一部のテーブルでRLSが有効化されていない可能性

**影響度**: 🔴 高（データ漏洩リスク）

**対策案**:
```sql
-- 全テーブルのRLS状態確認
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false;

-- RLS未有効のテーブルを発見した場合
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;
```

**代替案**: E2Eテストでマルチテナント分離を検証

**担当者**: セキュリティエンジニア
**期限**: Phase 2内（品質保証フェーズ）

---

### 4.4 パフォーマンス課題

#### 課題9: 大量データ時のクエリ速度低下 ⚠️

**問題の詳細**:
- 1組織で1,000以上の道具を登録した場合のパフォーマンス未検証

**影響度**: 🟡 中（ユーザー体験低下）

**対策案**:
```sql
-- インデックス追加
CREATE INDEX idx_tools_org_id ON tools(organization_id);
CREATE INDEX idx_tool_movements_org_id ON tool_movements(organization_id);
CREATE INDEX idx_tool_movements_tool_id ON tool_movements(tool_id);
CREATE INDEX idx_tools_qr_code ON tools(qr_code);
```

**代替案**: ページネーション実装（現在は全件取得）

**担当者**: データベースエンジニア
**期限**: Phase 2内

---

#### 課題10: 画像アップロード速度 ⚠️

**問題の詳細**:
- 作業報告書に10枚の写真をアップロードすると時間がかかる

**影響度**: 🟡 中（ユーザー体験低下）

**対策案**:
```typescript
// components/ImageUpload.tsx
import Image from 'next/image';

// クライアント側で画像リサイズ
async function compressImage(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(1024, 768);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, 1024, 768);
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
}
```

**代替案**: CDN導入（Cloudflare）

**担当者**: フロントエンドエンジニア
**期限**: Phase 3内

---

### 4.5 データ移行課題

#### 課題11: テストデータのクリーンアップ ⚠️

**問題の詳細**:
- ローカルで作成したテストデータが本番に混入する可能性

**影響度**: 🟡 中（データ整合性）

**対策案**:
```sql
-- 本番マイグレーション前に実行
DELETE FROM organizations WHERE name LIKE 'テスト%';
DELETE FROM super_admins WHERE email LIKE '%@test.com';
```

**代替案**: 本番環境は完全にクリーンな状態で開始

**担当者**: データベースエンジニア
**期限**: Phase 0内（Task 3実施時）

---

### 4.6 コスト課題

#### 課題12: Supabase Pro プラン費用 💰

**問題の詳細**:
- 本番環境ではPro プラン推奨（$25/月）
- 自動バックアップ、ポイントインタイムリカバリが必要

**影響度**: 🟢 低（事業継続性）

**対策案**:
- 初期は Free プランでスタート（データベース500MB、帯域幅5GB/月）
- ユーザー10社超えたらPro プランにアップグレード

**代替案**: なし（データ損失リスクを考慮すると必須）

**担当者**: プロジェクトマネージャー
**期限**: ユーザー数監視

---

#### 課題13: Vercel 帯域幅超過 💰

**問題の詳細**:
- Hobby プラン: 帯域幅100GB/月まで無料
- 画像配信が多い場合、超過の可能性

**影響度**: 🟡 中（コスト増加）

**対策案**:
```typescript
// vercel.json
{
  "images": {
    "domains": ["supabase.co"], // Supabase Storageから直接配信
    "formats": ["image/webp"],
    "minimumCacheTTL": 86400
  }
}
```

**代替案**: Cloudflare CDN導入（無料）

**担当者**: DevOpsエンジニア
**期限**: ユーザー50社超えたら実施

---

## 5. チェックリスト

### 5.1 本番リリース前チェックリスト

#### コード・ビルド
- [ ] `npm run build`が成功する
- [ ] `npm run lint`が成功する（ESLint修正後）
- [ ] `npm run type-check`が成功する
- [ ] 全ユニットテストが合格する
- [ ] 全E2Eテストが合格する（Playwright）

#### データベース
- [ ] Supabase本番プロジェクト作成済み
- [ ] 全マイグレーション適用済み（82ファイル）
- [ ] RLS有効化確認（全50テーブル）
- [ ] RLSポリシーテスト合格
- [ ] データベースバックアップ設定済み
- [ ] Storage Bucket作成済み（tool-images等）

#### 環境変数
- [ ] `NEXT_PUBLIC_SUPABASE_URL`設定済み
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`設定済み
- [ ] `SUPABASE_SERVICE_ROLE_KEY`設定済み
- [ ] `STRIPE_SECRET_KEY`設定済み（本番）
- [ ] `STRIPE_WEBHOOK_SECRET`設定済み（本番）
- [ ] `NEXTAUTH_SECRET`生成・設定済み（32文字以上）
- [ ] `SUPER_ADMIN_JWT_SECRET`生成・設定済み
- [ ] `CRON_SECRET`生成・設定済み
- [ ] `SENTRY_DSN`設定済み
- [ ] `SMTP_*`設定済み（SendGrid or Resend）

#### セキュリティ
- [ ] スーパーアドミン初期アカウント作成済み
- [ ] スーパーアドミン2FA有効化（推奨）
- [ ] Rate Limiting実装済み
- [ ] HTTPS強制リダイレクト有効
- [ ] CORS設定確認
- [ ] `npm audit`実行済み（脆弱性0件）

#### Stripe設定
- [ ] Stripe本番モードに切り替え済み
- [ ] Webhook URL登録済み（`/api/webhooks/stripe`）
- [ ] Webhookイベント設定済み（invoice系3種）
- [ ] Webhook署名検証テスト成功

#### Vercel設定
- [ ] ドメイン設定済み（zairoku.com）
- [ ] ワイルドカードサブドメイン設定済み（*.zairoku.com）
- [ ] Super Adminドメイン設定済み（admin.zairoku.com）
- [ ] SSL証明書発行済み
- [ ] Vercel Cron設定確認（vercel.json）
- [ ] 環境変数全件設定済み

#### 監視・ロギング
- [ ] Sentry統合済み
- [ ] Sentryアラート設定済み（Slack連携推奨）
- [ ] Vercel Logs確認方法周知
- [ ] Supabaseダッシュボードアクセス権限設定

#### ドキュメント
- [ ] 顧客向けマニュアル作成済み
- [ ] FAQ作成済み
- [ ] トラブルシューティングガイド作成済み
- [ ] 運用手順書作成済み
- [ ] ロールバック手順書作成済み

#### テスト
- [ ] スモークテスト全項目合格
- [ ] マルチテナント分離テスト合格
- [ ] パッケージ制御テスト合格
- [ ] 決済フローテスト合格（カード決済、請求書払い）
- [ ] cron job手動実行テスト合格
- [ ] Webhook受信テスト合格

---

### 5.2 デプロイ当日チェックリスト

#### 午前: 最終確認
- [ ] データベースバックアップ取得（手動）
- [ ] 環境変数再確認（Vercel Dashboard）
- [ ] ロールバック手順確認
- [ ] 監視ツール稼働確認（Sentry、Vercel）
- [ ] チーム全員にデプロイ時刻通知

#### 午後: デプロイ実行（14:00推奨）
- [ ] mainブランチにマージ
- [ ] Vercel自動デプロイ開始確認
- [ ] ビルドログ確認（エラーなし）
- [ ] デプロイ完了通知受信

#### デプロイ直後: スモークテスト（14:30-15:00）
- [ ] `https://zairoku.com`アクセス可能
- [ ] `https://admin.zairoku.com`アクセス可能
- [ ] Super Adminログイン成功
- [ ] 組織作成 → 契約作成 → ログインURL発行
- [ ] 顧客ログイン成功（サブドメイン）
- [ ] 道具登録成功
- [ ] 出退勤打刻成功
- [ ] Sentryエラー0件
- [ ] Vercel Logsエラー0件

#### 継続監視（15:00-19:00）
- [ ] 30分ごとにSentry確認
- [ ] 1時間ごとにVercel Logs確認
- [ ] Stripeダッシュボード確認
- [ ] ユーザーからの問い合わせ確認（メール、Slack）

#### 終了判定（19:00）
- [ ] エラー発生率 < 0.1%
- [ ] ページ表示速度 < 2秒
- [ ] ユーザーからクリティカルな問い合わせなし
- [ ] チームにリリース完了報告

---

## 6. タイムライン（推奨スケジュール）

### Week 1: 本番環境準備

| 日 | フェーズ | タスク | 担当 |
|----|---------|--------|------|
| Day 1 | Phase 0 | Task 1-2（ビルドエラー、ESLint修正） | バックエンド |
| Day 2 | Phase 0 | Task 3-5（Supabase、Stripe、環境変数） | バックエンド |
| Day 3 | Phase 0 | Task 6-9（Super Admin、ドメイン、Sentry、バックアップ） | フルスタック |

### Week 2: MVP完成と品質保証

| 日 | フェーズ | タスク | 担当 |
|----|---------|--------|------|
| Day 4 | Phase 1 | Task 10-11（デプロイ、Rate Limiting） | フルスタック |
| Day 5 | Phase 2 | 機能テスト（全機能） | QA + 開発 |
| Day 6 | Phase 2 | セキュリティ・パフォーマンステスト | QA + 開発 |
| Day 7 | Phase 2 | バグ修正 | 全員 |

### Week 3: ベータリリース

| 日 | フェーズ | タスク | 担当 |
|----|---------|--------|------|
| Day 8 | Phase 3 | ベータユーザー3社招待 | 営業 |
| Day 9-12 | Phase 3 | フィードバック収集・対応 | 全員 |
| Day 13 | Phase 3 | ドキュメント整備 | ドキュメンテーション |
| Day 14 | Phase 3 | 最終レビュー | 全員 |

### Week 4: 本番リリース

| 日 | フェーズ | タスク | 担当 |
|----|---------|--------|------|
| Day 15 | Phase 4 | 本番リリース（午後2時） | リードエンジニア |
| Day 16-21 | Phase 5 | 運用監視開始 | DevOps |

---

## 7. 成功指標（KPI）

### 本番リリース後1ヶ月の目標

| 指標 | 目標値 | 測定方法 |
|------|--------|---------|
| **稼働率** | > 99.5% | Vercel Uptime Monitor |
| **エラー発生率** | < 0.1% | Sentry |
| **ページ表示速度** | < 2秒 | Vercel Analytics |
| **API応答時間** | < 500ms | Vercel Functions |
| **ユーザー満足度（NPS）** | > 50 | アンケート |
| **契約企業数** | 10社 | Super Adminダッシュボード |
| **アクティブユーザー数** | 100人 | Supabase Auth |
| **月間請求書発行数** | 10件 | Stripe Dashboard |
| **請求書払い率** | > 95% | payment_recordsテーブル |

---

## 8. 結論

### 本番環境移行の準備状況

**現状評価**: 🟡 80%完成（ビルドエラー修正と環境設定のみで本番リリース可能）

**強み**:
- ✅ コア機能完全実装（資産管理、DX業務効率化）
- ✅ Stripe Billing A方式完全実装
- ✅ マルチテナントRLS完全実装
- ✅ パッケージ制御システム完全実装
- ✅ 包括的テスト実装（ユニット、統合、E2E）
- ✅ 82個のマイグレーションファイル完備

**リスク**:
- 🔴 ビルドエラー（6ファイルのimport修正必須）
- 🟡 ESLint設定エラー（CI/CD影響）
- 🟡 セキュリティ強化（2FA未実装）
- 🟡 運用ドキュメント不足

**推奨アクション**:
1. **即座に実施**: Task 1（ビルドエラー修正） - 30分
2. **Week 1完了**: Phase 0（本番環境準備） - 3日
3. **Week 2-3完了**: Phase 1-3（MVP完成、品質保証、ベータ） - 10日
4. **Week 4**: Phase 4（本番リリース） - 1日

**最短リリース日**: 本日から**21日後**（3週間）

---

## 付録A: 環境変数テンプレート

```bash
# ========================================
# Production Environment Variables
# ========================================

# Database (Supabase Production)
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_REF].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]

# Application
NEXT_PUBLIC_APP_URL=https://zairoku.com
NODE_ENV=production

# Authentication
NEXTAUTH_URL=https://zairoku.com
NEXTAUTH_SECRET=[GENERATE_WITH_openssl_rand_-base64_32]

# Super Admin
SUPER_ADMIN_JWT_SECRET=[GENERATE_WITH_openssl_rand_-hex_32]

# Cron Job Security
CRON_SECRET=[GENERATE_WITH_openssl_rand_-base64_32]

# Redis (Upstash Production)
REDIS_URL=rediss://default:[PASSWORD]@[ENDPOINT].upstash.io:[PORT]

# Stripe (Production)
STRIPE_SECRET_KEY=sk_live_[YOUR_SECRET_KEY]
STRIPE_PUBLISHABLE_KEY=pk_live_[YOUR_PUBLISHABLE_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_WEBHOOK_SECRET]

# Email (SendGrid Production)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=[SENDGRID_API_KEY]
SMTP_FROM=noreply@zairoku.com

# Monitoring (Sentry Production)
SENTRY_DSN=https://[KEY]@[ORG].ingest.sentry.io/[PROJECT]
NEXT_PUBLIC_SENTRY_DSN=https://[KEY]@[ORG].ingest.sentry.io/[PROJECT]

# Feature Flags
NEXT_PUBLIC_ENABLE_CONTRACT=true
NEXT_PUBLIC_ENABLE_INVOICE=true
NEXT_PUBLIC_ENABLE_STRIPE=true

# Storage
NEXT_PUBLIC_STORAGE_BUCKET=tool-images
```

---

## 付録B: 参考リンク

**公式ドキュメント**:
- [SPECIFICATION_SAAS_FINAL.md](./SPECIFICATION_SAAS_FINAL.md) - メイン仕様書
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - データベース設計
- [MIGRATIONS.md](./MIGRATIONS.md) - マイグレーション履歴
- [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) - 環境構築ガイド
- [PACKAGE_CONTROL_IMPLEMENTATION.md](./PACKAGE_CONTROL_IMPLEMENTATION.md) - パッケージ制御
- [SUPER_ADMIN_GUIDE.md](./SUPER_ADMIN_GUIDE.md) - スーパーアドミンガイド

**外部サービス**:
- [Supabase Dashboard](https://app.supabase.com/)
- [Stripe Dashboard](https://dashboard.stripe.com/)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Sentry Dashboard](https://sentry.io/)

---

**このドキュメントは、ザイロク（Zairoku）の本番環境移行を成功させるための完全ガイドです。**
**質問や不明点があれば、リードエンジニアまでお問い合わせください。**
