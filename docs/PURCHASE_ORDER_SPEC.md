# 発注書管理機能仕様書

## 🚨 重要な修正方針（2025-12-17追加）

### 問題点
1. **仕入先マスタ(`suppliers`)と取引先マスタ(`clients`)の重複**
   - `suppliers`テーブルと`clients`テーブル（`client_type='supplier'`）が同じ目的で存在
   - データの二重管理により整合性の問題が発生
   - 取引先が「顧客兼仕入先」の場合に対応できない

2. **請求書の取引先フィルタリング不備**
   - 請求書作成時に全ての取引先が表示される
   - `client_type`によるフィルタリングが実装されていない

3. **承認フローの未実装**
   - 権限による承認フローが実装されていない
   - リーダーが作成した発注書も承認なしで確定される

### 修正方針

#### 1. 仕入先マスタを廃止し、取引先マスタに統合
- **`suppliers`テーブルを廃止**
- **`clients`テーブルの`client_type`を活用**
  - `customer`: 顧客のみ
  - `supplier`: 仕入先のみ
  - `partner`: 協力会社
  - `both`: 顧客兼仕入先
- **`purchase_orders.supplier_id`を`purchase_orders.client_id`に変更**し、`clients`テーブルを参照

#### 2. 各機能での取引先フィルタリング
- **見積書**: `client_type IN ('customer', 'both')` ✅ 実装済み
- **請求書**: `client_type IN ('customer', 'both')` ❌ 未実装 → 修正必要
- **発注書**: `client_type IN ('supplier', 'both')` ❌ 未実装 → 修正必要

#### 3. 承認フローの実装
- **スタッフ**: 発注書作成不可
- **リーダー**: 発注書作成可能、承認申請が必要、承認権限なし
- **マネージャー/管理者**: 発注書作成可能、他者の発注書を承認可能

#### 4. 削除権限
- **リーダー**: 下書きと差戻し状態のみ削除可能（提出後は削除不可）
- **マネージャー/管理者**: 下書き・承認申請中・差戻し状態を削除可能（承認済み以降は削除不可）

#### 5. UIの改善
- 発注明細をカード式UIに変更（見積書と同様のスタイル）
- 支払条件を取引先マスタから自動入力（編集可能）
- 工事の必要性を検討（任意項目として残す）

### マイグレーション計画

#### Phase 1: データベーススキーマ変更
1. `purchase_orders`テーブルに`client_id`カラムを追加
2. 既存の`supplier_id`データを`client_id`にマイグレーション
3. `suppliers`テーブルのデータを`clients`テーブルにマイグレーション（`client_type='supplier'`）
4. `purchase_orders.supplier_id`外部キー制約を削除
5. `purchase_orders.client_id`外部キー制約を追加（`clients`テーブル参照）
6. `suppliers`テーブルを削除

#### Phase 2: アプリケーション修正
1. 請求書作成の取引先フィルタリングを修正
2. 発注書作成の取引先フィルタリングを修正
3. 発注書UIをカード式に変更
4. 承認フローを実装
5. 支払条件の自動入力機能を実装

#### Phase 3: テストと検証
1. 既存データの整合性確認
2. 各機能のフィルタリング動作確認
3. 承認フローの動作確認

---

## 1. 概要

発注書管理機能は、企業が外部業者（仕入先・サプライヤー）に対して商品やサービスを発注する際の帳票を管理するシステムです。建設業や現場系企業において、材料の仕入れ、外注作業の依頼、機器の購入などを体系的に管理します。

### 1.1 目的
- 発注プロセスの可視化と標準化
- 承認フローの電子化による内部統制の強化
- 支出管理と原価管理の精度向上
- 仕入先との取引履歴の一元管理

### 1.2 位置づけ
- **請求書管理**：売上（自社→顧客）
- **発注書管理**：仕入・経費（自社→仕入先）
- **入出金管理**：両者の実際の資金移動を記録

## 2. 機能要件

### 2.1 基本機能

#### 2.1.1 発注書作成
- 仕入先マスタからの選択入力
- 工事・プロジェクト紐付け
- 明細行の追加・編集・削除
- 単価×数量の自動計算
- 消費税計算（10%/8%/非課税）
- 納期・納品場所の指定
- 支払条件の設定
- 添付ファイル機能（仕様書、図面など）

#### 2.1.2 発注書一覧
- ステータス別表示（下書き、承認待ち、承認済み、発注済み、納品済み、支払済み）
- 期間指定検索
- 仕入先検索
- 工事・プロジェクト検索
- 金額範囲検索
- 担当者フィルタ
- CSV出力機能

#### 2.1.3 発注書詳細
- 発注内容の表示
- ステータス履歴
- 承認履歴
- 関連書類（納品書、請求書）の紐付け
- 支払履歴
- コメント・メモ機能
- 印刷・PDF出力

### 2.2 ワークフロー

#### 2.2.1 承認フロー
```
下書き → 承認申請 → 承認/差戻し → 発注 → 納品 → 検収 → 支払
```

#### 2.2.2 権限設定
- **スタッフ**：発注書作成不可
- **リーダー**：発注書の作成・申請可能、承認権限なし
- **マネージャー**：発注書の作成・承認権限あり
- **管理者**：発注書の作成・承認権限あり、システム設定・マスタ管理

#### 2.2.3 削除権限
- **リーダー**：下書きと差戻し状態のみ削除可能（提出後は削除不可）
- **マネージャー/管理者**：下書き・承認申請中・差戻し状態を削除可能（承認済み以降は削除不可）

### 2.3 通知機能
- 承認依頼通知
- 承認完了通知
- 差戻し通知
- 納期アラート
- 支払期限アラート

## 3. データモデル

### 3.1 purchase_orders（発注書）【修正後】
```sql
CREATE TABLE purchase_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES clients(id), -- 変更: supplier_id → client_id
  project_id UUID REFERENCES projects(id),
  order_date DATE NOT NULL,
  delivery_date DATE,
  delivery_location TEXT,
  payment_terms VARCHAR(100),
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  notes TEXT,
  internal_memo TEXT, -- 追加: 社内メモ
  created_by UUID NOT NULL REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejected_by UUID REFERENCES users(id), -- 追加: 差戻し者
  rejected_at TIMESTAMP WITH TIME ZONE, -- 追加: 差戻し日時
  rejection_reason TEXT, -- 追加: 差戻し理由
  ordered_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE, -- 追加: 論理削除
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.2 purchase_order_items（発注明細）【修正後】
```sql
CREATE TABLE purchase_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL DEFAULT 'material', -- 追加: 種別（material, labor, equipment, other）
  item_name VARCHAR(200) NOT NULL,
  description TEXT, -- 仕様・規格
  quantity DECIMAL(10, 2) NOT NULL,
  unit VARCHAR(50),
  unit_price DECIMAL(12, 2) NOT NULL,
  tax_rate DECIMAL(5, 2) NOT NULL DEFAULT 10,
  amount DECIMAL(12, 2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3.3 suppliers（仕入先マスタ）【廃止】
```sql
-- このテーブルは廃止し、clientsテーブルに統合
-- client_type IN ('supplier', 'both') で仕入先を識別
```

### 3.4 clients（取引先マスタ）【既存】
```sql
-- 既存のテーブル
-- client_type の値:
--   'customer': 顧客のみ
--   'supplier': 仕入先のみ
--   'partner': 協力会社
--   'both': 顧客兼仕入先
```

### 3.4 purchase_order_history（発注書履歴）
```sql
CREATE TABLE purchase_order_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  action VARCHAR(50) NOT NULL,
  old_status VARCHAR(20),
  new_status VARCHAR(20),
  comment TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 4. API設計

### 4.1 発注書API
- `GET /api/purchase-orders` - 発注書一覧取得
- `GET /api/purchase-orders/:id` - 発注書詳細取得
- `POST /api/purchase-orders` - 発注書作成
- `PUT /api/purchase-orders/:id` - 発注書更新
- `DELETE /api/purchase-orders/:id` - 発注書削除
- `POST /api/purchase-orders/:id/submit` - 承認申請
- `POST /api/purchase-orders/:id/approve` - 承認
- `POST /api/purchase-orders/:id/reject` - 差戻し
- `POST /api/purchase-orders/:id/order` - 発注実行
- `POST /api/purchase-orders/:id/deliver` - 納品登録
- `GET /api/purchase-orders/:id/pdf` - PDF出力

### 4.2 仕入先API
- `GET /api/suppliers` - 仕入先一覧
- `GET /api/suppliers/:id` - 仕入先詳細
- `POST /api/suppliers` - 仕入先登録
- `PUT /api/suppliers/:id` - 仕入先更新
- `DELETE /api/suppliers/:id` - 仕入先削除

## 5. UI/UX設計

### 5.1 画面構成
1. **発注書一覧画面**
   - タブ切り替え（全て/下書き/承認待ち/発注済み/納品済み）
   - 検索・フィルタ機能
   - 一括操作（CSV出力、一括承認など）

2. **発注書作成・編集画面**
   - ウィザード形式での入力
   - 仕入先の検索・選択
   - 明細行の動的追加
   - リアルタイム金額計算
   - 下書き保存機能

3. **発注書詳細画面**
   - 発注内容の表示
   - アクションボタン（承認、差戻し、発注、PDF出力など）
   - タイムライン表示（履歴）
   - 関連ドキュメント

4. **仕入先管理画面**
   - 仕入先一覧
   - 新規登録・編集モーダル
   - 取引履歴表示

### 5.2 モバイル対応
- レスポンシブデザイン
- タッチ操作の最適化
- 現場での承認・確認作業

## 6. セキュリティ要件

### 6.1 アクセス制御
- Row Level Security (RLS) による組織単位のデータ分離
- ロールベースのアクセス制御（RBAC）
- 金額に応じた承認権限の制御

### 6.2 監査ログ
- 全ての変更操作の記録
- 承認・差戻しの理由記録
- アクセスログの保管

## 7. 統合要件

### 7.1 入出金管理との連携
- 発注書に基づく支払いの自動連携
- 支払済みステータスの自動更新
- 買掛金管理

### 7.2 工事・プロジェクト管理との連携
- 工事別の発注集計
- 予算対実績の管理
- 原価計算への反映

### 7.3 会計システム連携
- 仕訳データの出力
- 買掛金データの連携
- 支払データの同期

## 8. 実装フェーズ

### Phase 1: 基本機能（2週間）✅ 完了
- [x] データベース設計・マイグレーション
- [x] 仕入先マスタ管理
- [x] 発注書CRUD機能
- [x] PDF出力機能

### Phase 2: ワークフロー（1週間）✅ 完了
- [x] 承認フロー実装
- [x] 通知機能
- [x] 履歴管理

### Phase 3: 統合機能（1週間）✅ 完了
- [x] 入出金管理連携
- [x] 工事管理連携
- [x] ダッシュボード追加

### Phase 4: 高度な機能（1週間）✅ 完了
- [x] 一括操作機能（CSV出力、一括承認）
- [x] 分析レポート（月別推移、仕入先別・工事別ランキング）
- [x] カスタマイズ設定（承認金額閾値、発注番号プレフィックス）

## 9. 非機能要件

### 9.1 パフォーマンス
- 発注書一覧：1000件表示で3秒以内
- PDF生成：5秒以内
- 検索レスポンス：1秒以内

### 9.2 可用性
- 99.9%の稼働率
- 定期バックアップ
- 障害復旧手順の整備

### 9.3 拡張性
- マルチテナント対応
- カスタムフィールド対応
- API公開による外部連携

## 10. 今後の拡張予定

### 10.1 AI機能
- 発注推奨機能（過去データから予測）
- 異常検知（通常と異なる発注パターンの検出）
- 自動仕訳提案

### 10.2 外部連携
- EDI対応（電子発注）
- 仕入先ポータル
- 電子契約連携

### 10.3 モバイルアプリ
- ネイティブアプリ開発
- オフライン対応
- プッシュ通知

## 11. 注意事項

### 11.1 法的要件
- 下請法への対応
- インボイス制度対応
- 電子帳簿保存法対応

### 11.2 業界特有の要件
- 建設業法に基づく書類保管
- 労働安全衛生法への対応
- グリーン購入法への配慮

## 12. 参考資料
- 請求書管理機能仕様書（INVOICE_MANAGEMENT_SPEC.md）
- 入出金管理機能仕様書
- データベース設計書（DATABASE_SCHEMA.md）
- API設計ガイドライン