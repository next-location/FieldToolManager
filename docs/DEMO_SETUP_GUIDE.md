# デモ環境セットアップガイド

## 📋 実装完了項目

以下の機能が実装されました：

### ✅ 完了した機能

1. **トップページ修正**
   - ボタンテキスト: 「資料請求してデモ画面を見る」
   - リンク先: `/request-demo`

2. **資料請求フォームページ** (`/request-demo`)
   - 会社情報入力フォーム
   - フリーメール警告機能
   - バリデーション
   - 成功ページ

3. **データベーステーブル**
   - `demo_requests` - デモ申請管理
   - `demo_activity_logs` - 行動ログ
   - 関数: `increment_demo_login`, `check_duplicate_demo_request`

4. **APIエンドポイント**
   - `/api/demo/request` - 資料請求受付
   - `/api/demo/create` - デモアカウント自動生成
   - `/api/demo/send-email` - メール送信
   - `/api/analytics/track` - アクティビティ記録
   - `/api/cron/cleanup-demos` - 期限切れアカウント削除

5. **デモアカウント自動生成システム**
   - ユニークメールアドレス生成
   - Supabase Authユーザー作成
   - デモ会社データ作成
   - サンプルデータ投入（20工具、3拠点、4カテゴリ）

6. **メール送信機能**
   - HTMLメールテンプレート
   - Resend API連携
   - デモアカウント情報送信

7. **機能制限システム**
   - `useDemo` Hook
   - `DemoBanner` コンポーネント
   - `DemoRestriction` コンポーネント
   - データ量制限（工具20個、スタッフ5名等）
   - 機能無効化（CSV/PDFエクスポート等）

8. **自動削除Cron**
   - 毎日午前3時に期限切れアカウントを削除
   - Vercel Cron設定済み

9. **KPI計測システム**
   - デモログイン記録
   - 機能使用トラッキング
   - 管理画面ダッシュボード (`/admin/demo-analytics`)

---

## 🚀 セットアップ手順

### 1. データベースマイグレーション実行

Supabaseダッシュボードで以下のSQLを実行：

**ファイル:** `supabase/migrations/20250108000000_create_demo_tables.sql`

**実行手順:**
1. Supabase Dashboard (https://supabase.com/dashboard) にアクセス
2. プロジェクトを選択
3. 左メニュー「SQL Editor」をクリック
4. 「New query」をクリック
5. `supabase/migrations/20250108000000_create_demo_tables.sql` の内容をコピー&ペースト
6. 「Run」をクリック

### 2. 環境変数設定

`.env.local` に以下を追加：

```bash
# Resend API Key（メール送信）
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# Cron Secret（自動削除用）
CRON_SECRET=your-random-secret-key-here
```

#### Resend APIキーの取得方法

1. https://resend.com/ にアクセス
2. アカウント作成/ログイン
3. 「API Keys」→「Create API Key」
4. 名前を入力（例: Zairoku Demo）
5. 作成されたキーをコピーして `.env.local` に貼り付け

#### CRON_SECRETの生成

```bash
# ランダムな文字列を生成
openssl rand -base64 32
```

### 3. Vercel環境変数設定

Vercelダッシュボードで環境変数を設定：

1. https://vercel.com/dashboard にアクセス
2. プロジェクトを選択
3. 「Settings」→「Environment Variables」
4. 以下の変数を追加：
   - `RESEND_API_KEY`: Resend APIキー
   - `CRON_SECRET`: Cron用シークレットキー

### 4. デプロイ

```bash
git add .
git commit -m "feat: implement demo request and auto-generation system"
git push origin main
```

---

## 📁 作成されたファイル一覧

### ページ
- `app/(public)/page.tsx` - トップページ（修正）
- `app/(public)/request-demo/page.tsx` - 資料請求ページ
- `app/(public)/request-demo/success/page.tsx` - 申込完了ページ
- `app/(admin)/admin/demo-analytics/page.tsx` - KPIダッシュボード

### コンポーネント
- `components/RequestDemoForm.tsx` - 資料請求フォーム
- `components/DemoBanner.tsx` - デモ環境バナー
- `components/DemoRestriction.tsx` - 機能制限ラッパー

### API
- `app/api/demo/request/route.ts` - 資料請求API
- `app/api/demo/create/route.ts` - アカウント生成API
- `app/api/demo/send-email/route.ts` - メール送信API
- `app/api/analytics/track/route.ts` - アクティビティ記録API
- `app/api/cron/cleanup-demos/route.ts` - 自動削除Cron

### ライブラリ
- `lib/demo/sample-data.ts` - サンプルデータ生成
- `lib/analytics/demo-tracker.ts` - アクティビティトラッカー
- `hooks/useDemo.ts` - デモ判定Hook

### データベース
- `supabase/migrations/20250108000000_create_demo_tables.sql` - マイグレーション

### 設定
- `vercel.json` - Cron設定（修正）

### ドキュメント
- `docs/DEMO_IMPLEMENTATION_SPEC.md` - 実装仕様書
- `docs/DEMO_SETUP_GUIDE.md` - このファイル

---

## 🧪 動作確認手順

### 1. 資料請求フロー

1. トップページ (https://ijthywxu.zairoku.com/) にアクセス
2. 「資料請求してデモ画面を見る」ボタンをクリック
3. フォームに情報を入力して送信
4. 成功ページが表示されることを確認
5. メールボックスにデモアカウント情報が届くことを確認

### 2. デモ環境ログイン

1. メールに記載されたURLにアクセス
2. デモアカウントでログイン
3. デモバナーが表示されることを確認
4. サンプルデータ（20工具）が表示されることを確認

### 3. 機能制限の確認

1. CSVエクスポートボタンが無効化されていることを確認
2. 工具登録で20個を超えると制限されることを確認

### 4. KPIダッシュボード確認

1. 管理者アカウントでログイン
2. `/admin/demo-analytics` にアクセス
3. デモ申請一覧とKPIが表示されることを確認

---

## 🔧 トラブルシューティング

### メールが送信されない

**症状:** 資料請求後にメールが届かない

**確認項目:**
1. `RESEND_API_KEY` が正しく設定されているか確認
2. Resendのダッシュボードでメール送信ログを確認
3. サーバーログで `Failed to send email` エラーを確認

**解決策:**
- Resend APIキーを再生成して設定し直す
- Resendのドメイン認証を確認
- フリーメールアドレスで送信先を試す

### デモアカウントが作成されない

**症状:** 資料請求後にアカウントが作成されない

**確認項目:**
1. マイグレーションが正しく実行されているか確認
2. Supabase Authでユーザーが作成されているか確認
3. `demo_requests` テーブルにレコードが登録されているか確認

**解決策:**
```sql
-- demo_requests テーブルを確認
SELECT * FROM demo_requests ORDER BY created_at DESC LIMIT 10;

-- エラー状態のレコードを確認
SELECT * FROM demo_requests WHERE status = 'pending';
```

### Cronが動作しない

**症状:** 期限切れアカウントが削除されない

**確認項目:**
1. `CRON_SECRET` が設定されているか確認
2. Vercel Cronログを確認

**解決策:**
- Vercelダッシュボード → Cron → Logsで実行ログを確認
- 手動実行: `curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://ijthywxu.zairoku.com/api/cron/cleanup-demos`

### 重複申請エラー

**症状:** 24時間以内の再申請でエラー

**原因:** 重複申請防止機能が動作している

**解決策:**
- 24時間待つ
- または、管理者が手動で該当レコードを削除

```sql
-- 重複レコードを削除
DELETE FROM demo_requests WHERE email = 'example@example.com' AND created_at < NOW() - INTERVAL '1 hour';
```

---

## 📊 KPI指標の見方

### ファネル分析

```
資料請求数: 100件
  ↓
ログイン率: 60% (60件がログイン)
  ↓
アクティブ率: 30% (30件が3回以上ログイン)
  ↓
コンバージョン率: 5% (5件が契約)
```

### 改善目標

- **ログイン率 60%以上**: メール件名・内容を改善
- **アクティブ率 30%以上**: オンボーディング改善、サンプルデータ充実
- **コンバージョン率 5%以上**: 営業フォローのタイミング最適化

---

## 🎯 次のステップ

### Phase 2（オプション機能）

1. **PDFカタログダウンロード機能**
   - PDF資料の作成
   - ダウンロードリンクの実装

2. **メールナーチャリング**
   - Day 2: 活用事例メール
   - Day 4: FAQ メール
   - Day 6: 期限前リマインド
   - Day 7: 特別オファー

3. **リードスコアリング**
   - 行動ベースのスコア付け
   - 高スコアユーザーへの営業アラート

4. **A/Bテスト**
   - フォーム項目の最適化
   - メール件名のテスト
   - CTAボタンのテスト

### Phase 3（高度な分析）

1. **Google Analytics 4連携**
   - イベントトラッキング
   - コンバージョン設定

2. **ヒートマップ分析**
   - フォーム離脱ポイント特定
   - ボタンクリック率分析

3. **自動レポート**
   - 週次KPIレポート
   - Slack通知

---

## 📝 メンテナンス

### 定期確認項目

#### 毎日
- [ ] Cronジョブの実行ログ確認
- [ ] 新規デモ申請の確認

#### 毎週
- [ ] KPI ダッシュボードでトレンド確認
- [ ] 高アクティブユーザーへのフォロー

#### 毎月
- [ ] コンバージョン率の分析
- [ ] フォーム項目の見直し
- [ ] メールテンプレートの改善

---

## 🔐 セキュリティチェックリスト

- [x] 環境変数に秘密情報を保存
- [x] RLSポリシーで管理者のみアクセス可能
- [x] Cron実行は認証トークン必須
- [x] 重複申請防止（24時間制限）
- [x] IPアドレス記録
- [x] パスワードはハッシュ化して保存
- [x] デモデータと本番データは完全分離

---

## 📞 サポート

問題が解決しない場合は、以下の情報を含めて報告してください：

1. エラーメッセージ
2. 再現手順
3. サーバーログ（Vercel Dashboard → Logs）
4. Supabaseログ（Supabase Dashboard → Logs）

---

**実装完了日:** 2025年1月8日
**バージョン:** 1.0.0
**ドキュメント更新日:** 2025年1月8日
