# 取引先マスタ実装タスク

> **Phase 10: 取引先マスタ機能実装**
> 見積書・請求書・売上管理・支払い管理の基盤となる取引先情報管理機能

---

## 📋 タスク概要

### 目的
顧客・仕入先・協力会社を一元管理し、見積書・請求書・作業報告書・売上管理・支払い管理などの将来的な機能拡張の基盤を構築する。

### スコープ
- 取引先マスタのCRUD機能
- 現場との紐付け
- 取引先別の統計情報表示
- CSV一括インポート/エクスポート

---

## ✅ 前提条件（完了済み）

- [x] データベーステーブル設計完了
- [x] マイグレーションファイル作成完了 ([20250105000010_create_clients_master.sql](../supabase/migrations/20250105000010_create_clients_master.sql))
- [x] TypeScript型定義作成完了 ([types/clients.ts](../types/clients.ts))
- [x] RLSポリシー設定完了
- [x] DATABASE_SCHEMA.md更新完了
- [x] MIGRATIONS.md更新完了
- [x] SPECIFICATION_SAAS_FINAL.md更新完了（画面設計追加）

---

## 📝 実装タスク一覧

### Phase 1: データベースとバックエンドAPI（Week 1）

#### 1.1 マイグレーション実行
- [ ] **Task 1.1.1**: ローカル環境でマイグレーション実行
  ```bash
  npx supabase db push
  ```
  - 確認項目:
    - `clients`テーブル作成確認
    - `client_code_sequences`テーブル作成確認
    - `sites.client_id`カラム追加確認
    - `generate_client_code()`関数動作確認
    - RLSポリシー適用確認

- [ ] **Task 1.1.2**: テストデータ投入
  ```sql
  -- 取引先テストデータ
  INSERT INTO clients (organization_id, code, name, client_type, ...) VALUES (...);
  ```
  - 顧客: 3件
  - 仕入先: 2件
  - 協力会社: 2件

#### 1.2 API実装
- [ ] **Task 1.2.1**: 取引先一覧取得API
  - ファイル: `app/api/clients/route.ts`
  - メソッド: `GET /api/clients`
  - クエリパラメータ:
    - `client_type`: 取引先分類フィルター
    - `is_active`: 有効/無効フィルター
    - `search`: 検索キーワード
    - `page`, `limit`: ページネーション
  - 実装内容:
    - Supabaseクエリ作成
    - RLS自動適用確認
    - ページネーション実装
    - レスポンス型定義

- [ ] **Task 1.2.2**: 取引先詳細取得API
  - ファイル: `app/api/clients/[id]/route.ts`
  - メソッド: `GET /api/clients/:id`
  - 実装内容:
    - IDによる取得
    - 関連現場の取得（LEFT JOIN sites）
    - 404エラーハンドリング

- [ ] **Task 1.2.3**: 取引先作成API
  - ファイル: `app/api/clients/route.ts`
  - メソッド: `POST /api/clients`
  - 実装内容:
    - バリデーション（zod使用）
    - `generate_client_code()`関数呼び出し
    - 重複チェック（name, code）
    - organization_id自動設定

- [ ] **Task 1.2.4**: 取引先更新API
  - ファイル: `app/api/clients/[id]/route.ts`
  - メソッド: `PATCH /api/clients/:id`
  - 実装内容:
    - バリデーション
    - 更新権限チェック（admin/leader）
    - updated_at自動更新（トリガー）

- [ ] **Task 1.2.5**: 取引先削除API（論理削除）
  - ファイル: `app/api/clients/[id]/route.ts`
  - メソッド: `DELETE /api/clients/:id`
  - 実装内容:
    - 論理削除（deleted_at設定）
    - 削除権限チェック（admin のみ）
    - 関連現場の確認（外部キー制約）

- [ ] **Task 1.2.6**: 取引先統計情報API
  - ファイル: `app/api/clients/stats/route.ts`
  - メソッド: `GET /api/clients/stats`
  - 実装内容:
    - 総取引先数
    - 分類別カウント
    - 総売掛金/買掛金
    - 平均評価

#### 1.3 Supabaseクエリヘルパー作成
- [ ] **Task 1.3.1**: クライアントクエリヘルパー
  - ファイル: `lib/supabase/queries/clients.ts`
  - 関数:
    - `getClients(filters)`
    - `getClientById(id)`
    - `createClient(data)`
    - `updateClient(id, data)`
    - `deleteClient(id)`
    - `getClientStats()`
    - `generateClientCode()`

---

### Phase 2: フロントエンド実装（Week 2-3）

#### 2.1 共通コンポーネント
- [ ] **Task 2.1.1**: ClientTypeSelect コンポーネント
  - ファイル: `components/clients/ClientTypeSelect.tsx`
  - 機能: 取引先分類選択（ラジオボタン or セレクトボックス）

- [ ] **Task 2.1.2**: PaymentMethodSelect コンポーネント
  - ファイル: `components/clients/PaymentMethodSelect.tsx`
  - 機能: 支払方法選択

- [ ] **Task 2.1.3**: BankAccountTypeSelect コンポーネント
  - ファイル: `components/clients/BankAccountTypeSelect.tsx`
  - 機能: 銀行口座種別選択

- [ ] **Task 2.1.4**: ClientCard コンポーネント
  - ファイル: `components/clients/ClientCard.tsx`
  - 機能: 取引先カード表示（一覧用）

#### 2.2 取引先一覧画面
- [ ] **Task 2.2.1**: 取引先一覧ページ作成
  - ファイル: `app/(authenticated)/clients/page.tsx`
  - 機能:
    - 取引先一覧表示
    - フィルター（分類、有効/無効）
    - 検索機能
    - ページネーション
    - 新規登録ボタン

- [ ] **Task 2.2.2**: 取引先一覧テーブルコンポーネント
  - ファイル: `app/(authenticated)/clients/ClientsTable.tsx`
  - 機能:
    - テーブル表示
    - ソート機能
    - 詳細・編集リンク

- [ ] **Task 2.2.3**: 取引先フィルターコンポーネント
  - ファイル: `app/(authenticated)/clients/ClientsFilter.tsx`
  - 機能:
    - 分類フィルター（すべて/顧客/仕入先/協力会社）
    - 有効/無効フィルター
    - 検索ボックス

#### 2.3 取引先詳細画面
- [ ] **Task 2.3.1**: 取引先詳細ページ作成
  - ファイル: `app/(authenticated)/clients/[id]/page.tsx`
  - 機能:
    - 取引先基本情報表示
    - 連絡先情報表示
    - 担当者情報表示
    - 取引条件表示
    - 銀行情報表示
    - 税務情報表示
    - 取引実績表示
    - 関連現場一覧
    - 編集ボタン

- [ ] **Task 2.3.2**: 取引先情報表示コンポーネント
  - ファイル: `app/(authenticated)/clients/[id]/ClientDetails.tsx`
  - 機能: 取引先詳細情報の表示

- [ ] **Task 2.3.3**: 関連現場一覧コンポーネント
  - ファイル: `app/(authenticated)/clients/[id]/RelatedSites.tsx`
  - 機能: 取引先に紐づく現場の一覧表示

#### 2.4 取引先登録・編集画面
- [ ] **Task 2.4.1**: 取引先登録ページ作成
  - ファイル: `app/(authenticated)/clients/new/page.tsx`
  - 機能:
    - 取引先登録フォーム
    - バリデーション
    - 自動コード生成
    - 保存処理

- [ ] **Task 2.4.2**: 取引先編集ページ作成
  - ファイル: `app/(authenticated)/clients/[id]/edit/page.tsx`
  - 機能:
    - 既存データ読み込み
    - 編集フォーム
    - 更新処理

- [ ] **Task 2.4.3**: 取引先フォームコンポーネント
  - ファイル: `app/(authenticated)/clients/ClientForm.tsx`
  - 機能:
    - 基本情報入力
    - 連絡先情報入力
    - 担当者情報入力
    - 取引条件入力
    - 銀行情報入力
    - 税務情報入力
    - メモ入力
    - react-hook-form使用
    - zodバリデーション

#### 2.5 現場登録画面の拡張
- [ ] **Task 2.5.1**: 現場フォームに取引先選択追加
  - ファイル: `app/(authenticated)/sites/SiteForm.tsx`
  - 機能:
    - 取引先セレクトボックス追加
    - 取引先情報のプレビュー
    - 新規取引先作成リンク

---

### Phase 3: 拡張機能（Week 4）

#### 3.1 CSV一括インポート/エクスポート
- [ ] **Task 3.1.1**: CSVエクスポート機能
  - ファイル: `app/api/clients/export/route.ts`
  - 機能:
    - 全取引先データをCSV形式でエクスポート
    - フィルター適用可能

- [ ] **Task 3.1.2**: CSVインポート機能
  - ファイル: `app/api/clients/import/route.ts`
  - 機能:
    - CSVファイルアップロード
    - データ検証
    - 一括登録
    - エラーハンドリング

- [ ] **Task 3.1.3**: インポート/エクスポートUI
  - ファイル: `app/(authenticated)/clients/ImportExportButtons.tsx`
  - 機能:
    - エクスポートボタン
    - インポートボタン
    - プログレス表示

#### 3.2 取引先統計ダッシュボード
- [ ] **Task 3.2.1**: 統計サマリーコンポーネント
  - ファイル: `app/(authenticated)/clients/ClientsStats.tsx`
  - 機能:
    - 総取引先数
    - 分類別カウント
    - 総売掛金/買掛金
    - 平均評価
    - グラフ表示（Chart.js）

---

### Phase 4: テストと最適化（Week 5）

#### 4.1 テスト
- [ ] **Task 4.1.1**: APIエンドポイントのテスト
  - ファイル: `__tests__/api/clients.test.ts`
  - テスト項目:
    - 取引先作成
    - 取引先取得
    - 取引先更新
    - 取引先削除
    - RLS動作確認

- [ ] **Task 4.1.2**: フォームバリデーションのテスト
  - ファイル: `__tests__/components/ClientForm.test.tsx`
  - テスト項目:
    - 必須項目チェック
    - メールアドレス形式チェック
    - 郵便番号形式チェック

- [ ] **Task 4.1.3**: E2Eテスト
  - ファイル: `e2e/clients.spec.ts`
  - テスト項目:
    - 取引先登録フロー
    - 取引先編集フロー
    - 取引先削除フロー
    - 検索・フィルター動作

#### 4.2 パフォーマンス最適化
- [ ] **Task 4.2.1**: インデックスの最適化確認
  - 確認項目:
    - organization_id, code, name のインデックス
    - クエリパフォーマンス測定

- [ ] **Task 4.2.2**: フロントエンドの最適化
  - 実装内容:
    - React.memoの適用
    - useMemoの使用
    - 不要な再レンダリング防止

---

### Phase 5: ドキュメントとマニュアル（Week 6）

#### 5.1 ユーザーマニュアル更新
- [ ] **Task 5.1.1**: 取引先マスタ操作マニュアル作成
  - ファイル: `docs/USER_MANUAL_CLIENT_MASTER.md`
  - 内容:
    - 取引先登録方法
    - 取引先編集方法
    - 取引先削除方法
    - CSV一括登録方法
    - 現場との紐付け方法

#### 5.2 開発者向けドキュメント
- [ ] **Task 5.2.1**: API仕様書作成
  - ファイル: `docs/API_CLIENTS.md`
  - 内容:
    - エンドポイント一覧
    - リクエスト/レスポンス例
    - エラーコード一覧

---

## 🎯 マイルストーン

| Week | マイルストーン | 成果物 |
|------|---------------|--------|
| Week 1 | バックエンドAPI完成 | APIエンドポイント、テストデータ |
| Week 2 | 基本画面完成 | 一覧、詳細、登録・編集画面 |
| Week 3 | 現場連携完成 | 現場フォームの拡張 |
| Week 4 | 拡張機能完成 | CSV機能、統計ダッシュボード |
| Week 5 | テスト完了 | テストコード、パフォーマンス最適化 |
| Week 6 | リリース準備完了 | ドキュメント、マニュアル |

---

## 📊 進捗管理

### チェックリスト

#### データベース・バックエンド
- [ ] マイグレーション実行
- [ ] API実装（6エンドポイント）
- [ ] クエリヘルパー作成
- [ ] バリデーション実装

#### フロントエンド
- [ ] 共通コンポーネント（4個）
- [ ] 一覧画面
- [ ] 詳細画面
- [ ] 登録・編集画面
- [ ] 現場フォーム拡張

#### 拡張機能
- [ ] CSV機能
- [ ] 統計ダッシュボード

#### テスト・品質保証
- [ ] APIテスト
- [ ] E2Eテスト
- [ ] パフォーマンス最適化

#### ドキュメント
- [ ] ユーザーマニュアル
- [ ] API仕様書

---

## 🔧 技術スタック

- **フレームワーク**: Next.js 14 (App Router)
- **言語**: TypeScript
- **データベース**: Supabase PostgreSQL
- **UIライブラリ**: Tailwind CSS, shadcn/ui
- **フォーム管理**: react-hook-form
- **バリデーション**: zod
- **テスト**: Jest, Playwright
- **状態管理**: React Query (TanStack Query)

---

## 📚 参考ドキュメント

- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - データベース設計
- [MIGRATIONS.md](./MIGRATIONS.md) - マイグレーション履歴
- [SPECIFICATION_SAAS_FINAL.md](./SPECIFICATION_SAAS_FINAL.md) - 画面設計（6.6 取引先マスタ画面）
- [types/clients.ts](../types/clients.ts) - TypeScript型定義
- [supabase/migrations/20250105000010_create_clients_master.sql](../supabase/migrations/20250105000010_create_clients_master.sql) - マイグレーションSQL

---

## 🎉 完了条件

以下がすべて満たされたら実装完了:

1. ✅ 取引先の登録・編集・削除ができる
2. ✅ 取引先一覧が表示され、検索・フィルターが動作する
3. ✅ 取引先詳細が表示される
4. ✅ 現場登録時に取引先を選択できる
5. ✅ CSV一括登録・エクスポートができる
6. ✅ 統計情報が表示される
7. ✅ すべてのテストがパスする
8. ✅ ユーザーマニュアルが完成している
9. ✅ RLSが正しく動作し、マルチテナント分離が保証されている
10. ✅ パフォーマンスが良好（一覧表示: <500ms）

---

## 📝 注意事項

### セキュリティ
- RLSポリシーが正しく適用されていることを必ず確認
- organization_idの自動設定を徹底
- 管理者権限チェックを忘れずに実装

### データ整合性
- 取引先削除時は現場との関連を確認
- 論理削除を使用（deleted_at）
- コード重複を防ぐ（UNIQUE制約）

### UX
- 入力フォームはステップ分割を検討
- エラーメッセージは日本語で分かりやすく
- 保存中はローディング表示
- 成功・失敗のトースト通知

### パフォーマンス
- 一覧表示は仮想スクロールを検討（データ量が多い場合）
- 画像は遅延読み込み
- APIレスポンスはキャッシュ活用（React Query）

---

## 🚀 次のステップ（将来実装）

取引先マスタが完成したら、以下の機能を実装可能:

1. **見積書作成機能** - 取引先情報を自動入力
2. **請求書発行機能** - 支払条件・銀行情報を使用
3. **作業報告書機能** - 報告先として取引先を指定
4. **売上管理機能** - 取引先別の売上集計
5. **支払い管理機能** - 仕入先・協力会社への支払い管理
6. **与信管理機能** - credit_limitで与信限度額を管理
7. **インボイス対応** - tax_registration_numberで適格請求書対応

---

**作成日**: 2025-12-05
**最終更新**: 2025-12-05
**ステータス**: 準備完了 ✅
