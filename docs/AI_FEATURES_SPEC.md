# AI機能仕様書

## 1. 概要

Field Tool Manager のAI機能は、建築・現場系企業の業務効率化と意思決定支援を目的とした先進的な機能群です。
これらの機能は、Phase 6以降の実装を予定しており、Claude API、GPT-4 API、Gemini APIを活用します。

## 2. AI機能一覧

### 2.1 需要予測・在庫最適化

#### 機能概要
過去の使用履歴と工事計画から、道具・資材の需要を予測し、最適な在庫レベルを提案

#### 技術要件
- **使用API**: Claude API または GPT-4 API
- **必要データ**:
  - 過去の道具使用履歴（tool_usage_histories）
  - 工事スケジュール（projects）
  - 季節変動データ
  - 道具の故障・メンテナンス履歴

#### 出力内容
- 30日/60日/90日先の需要予測
- 推奨在庫数量
- 発注タイミングアラート
- 季節要因を考慮した在庫調整提案

### 2.2 工事原価予測

#### 機能概要
類似工事の実績データから、新規工事の原価を高精度で予測

#### 技術要件
- **使用API**: Gemini API（数値解析に強い）
- **必要データ**:
  - 過去の工事実績（project_costs）
  - 工事規模・種類・地域データ
  - 材料価格トレンド
  - 人件費データ

#### 出力内容
- 予想原価と信頼区間
- 原価項目別の内訳予測
- リスク要因の特定
- 類似工事との比較分析

### 2.3 作業効率分析・改善提案

#### 機能概要
作業報告書データから作業パターンを分析し、効率改善ポイントを自動提案

#### 技術要件
- **使用API**: Claude API（テキスト分析と提案生成）
- **必要データ**:
  - 作業報告書（work_reports）
  - 作業時間データ
  - 作業員スキルレベル
  - 使用道具・機材データ

#### 出力内容
- ボトルネック工程の特定
- 作業手順の最適化提案
- 人員配置の改善案
- 道具配置の最適化提案

### 2.4 異常検知・アラート

#### 機能概要
通常パターンから逸脱した異常な動きを検知し、早期にアラート

#### 技術要件
- **使用API**: GPT-4 API（パターン認識）
- **必要データ**:
  - リアルタイム使用状況
  - 過去の正常パターン
  - 工事進捗データ
  - 在庫変動データ

#### 検知対象
- 異常な在庫減少
- 不正な道具移動パターン
- 予想外の原価増加
- 作業効率の急激な低下

### 2.5 自然言語での検索・問い合わせ

#### 機能概要
自然な日本語で質問し、必要な情報を即座に取得

#### 技術要件
- **使用API**: Claude API（日本語理解に優秀）
- **必要データ**:
  - 全データベーステーブル
  - メタデータ定義

#### 対応例
- 「先月最も使用頻度の高かった道具は？」
- 「○○工事の原価率は？」
- 「来月の資金繰り予測を教えて」
- 「在庫が少ない道具のリストを表示」

### 2.6 レポート自動生成

#### 機能概要
月次報告書や工事完了報告書を自動生成

#### 技術要件
- **使用API**: Claude API（文章生成）
- **必要データ**:
  - 各種集計データ
  - KPI実績
  - 前期比較データ

#### 生成レポート
- 月次経営レポート
- 工事収支報告書
- 在庫状況レポート
- 作業効率分析レポート

### 2.7 キャッシュフロー予測

#### 機能概要
請求・支払いサイクルと工事計画から資金繰りを予測

#### 技術要件
- **使用API**: Gemini API（時系列予測）
- **必要データ**:
  - 請求書データ（billing_invoices）
  - 支払予定（purchase_orders）
  - 入金履歴（payment_records）
  - 工事スケジュール

#### 出力内容
- 30日/60日/90日先の資金予測
- 資金ショートリスクアラート
- 最適な支払いタイミング提案
- 借入必要額の算出

### 2.8 見積精度向上支援

#### 機能概要
過去の見積と実績の差異を学習し、見積精度を向上

#### 技術要件
- **使用API**: GPT-4 API
- **必要データ**:
  - 見積データ（estimates）
  - 実績原価データ
  - 差異分析データ

#### 機能内容
- 見積項目の妥当性チェック
- 類似案件からの単価提案
- リスク項目の自動追加
- 利益率の最適化提案

## 3. 実装計画

### Phase 1: 基盤構築（2025年Q2予定）
- AI API連携基盤の構築
- データパイプラインの整備
- セキュリティ対策の実装

### Phase 2: 基本AI機能（2025年Q3予定）
- 需要予測・在庫最適化
- 異常検知・アラート
- 自然言語検索

### Phase 3: 高度AI機能（2025年Q4予定）
- 工事原価予測
- 作業効率分析
- キャッシュフロー予測

### Phase 4: 完全統合（2026年Q1予定）
- レポート自動生成
- 見積精度向上支援
- 全機能の統合ダッシュボード

## 4. API利用料金見込み

### 月額費用概算（100社利用想定）

| API | 用途 | 月間リクエスト数 | 単価 | 月額費用 |
|-----|------|-----------------|------|----------|
| Claude API | テキスト分析・生成 | 50,000 | $0.003/1K tokens | $500 |
| GPT-4 API | パターン認識・予測 | 30,000 | $0.03/1K tokens | $900 |
| Gemini API | 数値解析・予測 | 20,000 | $0.002/1K tokens | $200 |
| **合計** | | | | **$1,600** |

### ROI試算
- AI機能による効率化効果: 20-30%の業務時間削減
- 在庫最適化による削減: 在庫コストの15-20%削減
- 原価予測精度向上: 5-10%の利益率改善

## 5. データ要件

### 必要な追加テーブル

```sql
-- AI予測結果保存用
CREATE TABLE ai_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  prediction_type TEXT NOT NULL, -- 'demand', 'cost', 'cashflow'等
  target_date DATE NOT NULL,
  prediction_data JSONB NOT NULL,
  confidence_level DECIMAL(3,2), -- 0.00-1.00
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  model_version TEXT NOT NULL
);

-- AI学習用の集計データ
CREATE TABLE ai_training_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  data_type TEXT NOT NULL,
  aggregated_data JSONB NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- AIアラート履歴
CREATE TABLE ai_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL, -- 'info', 'warning', 'critical'
  message TEXT NOT NULL,
  details JSONB,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  read_at TIMESTAMPTZ
);
```

## 6. セキュリティ考慮事項

### データプライバシー
- 各組織のデータは完全に分離
- AI学習に使用するデータは匿名化
- APIキーの安全な管理（環境変数・シークレット管理）

### アクセス制御
- AI機能は管理者権限のみアクセス可能
- API利用量の制限とモニタリング
- 異常なアクセスパターンの検知

### データ保護
- AI予測結果の暗号化保存
- 定期的なバックアップ
- GDPR/個人情報保護法準拠

## 7. UI/UX設計方針

### ダッシュボード
- AIインサイトウィジェット
- 予測グラフの視覚化
- アラートの優先度表示

### 対話型インターフェース
- チャット形式の問い合わせ
- 音声入力対応（将来）
- 多言語対応（将来）

## 8. パフォーマンス要件

- API応答時間: 3秒以内（95パーセンタイル）
- バッチ処理: 夜間実行で翌朝までに完了
- リアルタイム予測: 5秒以内に結果表示

## 9. 将来の拡張性

### 機能拡張
- 画像認識による道具識別
- IoTセンサー連携
- ARでの作業支援

### 連携拡張
- BIMソフトウェア連携
- 会計ソフト自動連携
- 気象データ連携

## 10. 導入効果測定

### KPI
- 在庫回転率の改善率
- 原価予測精度
- 作業効率向上率
- ユーザー満足度

### 効果測定方法
- A/Bテスト実施
- 定期的なユーザーフィードバック
- ROI分析レポート

---

*このドキュメントは、Field Tool ManagerのAI機能に関する仕様を定義しています。*
*実装時期や詳細仕様は、ユーザーフィードバックと技術動向により調整される可能性があります。*