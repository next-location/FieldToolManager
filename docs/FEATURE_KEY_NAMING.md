# 機能キー命名規則

## 概要

機能キー（feature_key）は、システム内で各機能を一意に識別し、アクセス制御を行うための識別子です。

## 命名規則

### 基本フォーマット

```
<カテゴリー>.<機能名>
```

**例**: `asset.tool_management`, `dx.attendance`

### カテゴリー一覧

#### 1. `asset` - 現場資産管理系
現場で使用する物理的な資産の管理機能

| 機能キー | 機能名 | 説明 |
|---------|--------|------|
| `asset.tool_management` | 道具マスタ管理 | 道具の登録・編集・削除 |
| `asset.tool_items` | 道具個別管理 | QRコード付き個別道具管理 |
| `asset.consumables` | 消耗品管理 | 消耗品の在庫・発注管理 |
| `asset.equipment` | 重機管理 | 重機の稼働状況・コスト管理 |
| `asset.tool_sets` | 道具セット管理 | 複数道具のセット管理 |
| `asset.qr_code` | QRコード機能 | QRコード生成・スキャン |
| `asset.qr_bulk` | QRコード一括生成 | 複数QRコードの一括生成 |
| `asset.inventory` | 棚卸し機能 | 在庫棚卸し実施 |
| `asset.movement_history` | 移動履歴管理 | 道具・消耗品の移動履歴 |
| `asset.alerts` | アラート機能 | 低在庫・メンテナンス通知 |
| `asset.analytics` | 資産分析 | 使用頻度・コスト分析 |

#### 2. `dx` - 業務効率化・DX系
デジタル化による業務効率化機能

| 機能キー | 機能名 | 説明 |
|---------|--------|------|
| `dx.attendance` | 勤怠管理 | 出退勤打刻・記録管理 |
| `dx.attendance_qr` | 勤怠QR発行 | Leader用QR発行機能 |
| `dx.attendance_alerts` | 勤怠アラート | 打刻漏れ通知 |
| `dx.work_reports` | 作業報告書 | 日報・作業報告書作成 |
| `dx.estimates` | 見積書 | 見積書作成・管理 |
| `dx.invoices` | 請求書 | 請求書・領収書作成 |
| `dx.purchase_orders` | 発注書 | 発注書作成・管理 |
| `dx.revenue` | 売上管理 | 売上・入金管理 |
| `dx.analytics` | 財務分析 | 売上分析・資金繰り予測 |
| `dx.approval` | 承認ワークフロー | 申請・承認プロセス |

#### 3. `master` - マスタ管理系
基本データの管理機能

| 機能キー | 機能名 | 説明 |
|---------|--------|------|
| `master.sites` | 現場マスタ | 現場情報の管理 |
| `master.staff` | スタッフ管理 | 従業員情報の管理 |
| `master.categories` | カテゴリー管理 | 道具カテゴリー管理 |
| `master.clients` | 取引先管理 | 顧客・仕入先管理 |
| `master.manufacturers` | メーカーマスタ | 道具メーカー管理 |

#### 4. `report` - レポート・分析系
データの可視化・分析機能

| 機能キー | 機能名 | 説明 |
|---------|--------|------|
| `report.usage` | 使用頻度分析 | 道具の使用状況分析 |
| `report.inventory_optimization` | 在庫最適化 | 適正在庫の提案 |
| `report.cost` | コストレポート | 各種コスト分析 |
| `report.csv_export` | CSVエクスポート | データの一括出力 |

#### 5. `integration` - 外部連携系
外部システムとの連携機能

| 機能キー | 機能名 | 説明 |
|---------|--------|------|
| `integration.accounting` | 会計ソフト連携 | 会計データのCSV出力 |
| `integration.api` | API連携 | 外部システムAPI |

## 命名のベストプラクティス

### ✅ 良い例

```
asset.tool_management       # カテゴリーが明確、機能が具体的
dx.attendance              # シンプルで理解しやすい
master.sites               # 複数形で統一
```

### ❌ 悪い例

```
tools                      # カテゴリーがない
asset.manage_tools         # 動詞形は避ける
AssetToolManagement        # キャメルケースは使わない
asset.tool-management      # ハイフンではなくアンダースコア
```

## 新機能追加時のガイドライン

### 1. 既存カテゴリーを確認
まず既存のカテゴリー（`asset`, `dx`, `master`, `report`, `integration`）に該当するか確認します。

### 2. カテゴリーの選択基準

- **asset**: 物理的な資産（道具、重機、消耗品）の管理
- **dx**: 業務プロセスのデジタル化（勤怠、報告書、帳票）
- **master**: 基本マスタデータ（現場、スタッフ、取引先）
- **report**: データ分析・可視化
- **integration**: 外部システム連携

### 3. 機能名の付け方

- **英語・小文字・アンダースコア区切り**で統一
- **名詞形**を使用（動詞は避ける）
- **簡潔で分かりやすい**名前
- **複数形**で統一（sites, tools, items）

### 4. 新カテゴリーの追加基準

既存カテゴリーに当てはまらない場合のみ、新カテゴリーを作成します。

**例**:
```
communication.chat         # 社内チャット機能（新カテゴリー）
safety.incident_report     # 安全管理・事故報告（新カテゴリー）
training.course            # 研修・教育（新カテゴリー）
```

## パッケージへの機能割り当て例

### 現場資産パック
```
asset.tool_management
asset.tool_items
asset.consumables
asset.equipment
asset.qr_code
asset.qr_bulk
asset.inventory
asset.movement_history
asset.alerts
master.sites
master.categories
```

### 現場DX業務効率化パック
```
dx.attendance
dx.attendance_qr
dx.work_reports
dx.estimates
dx.invoices
dx.revenue
dx.analytics
dx.approval
master.staff
master.clients
```

## 機能キーの使用例

### フロントエンド（メニュー制御）
```typescript
import { hasFeature } from '@/lib/features/client';

// ユーザーのパッケージに基づいて機能チェック
if (hasFeature(userPackages, 'asset.tool_management')) {
  // 道具管理メニューを表示
}
```

### バックエンド（API権限チェック）
```typescript
import { checkFeatureAccess } from '@/lib/features/server';

// 特定機能へのアクセス権限をチェック
const canAccess = await checkFeatureAccess(
  userId,
  'dx.work_reports'
);

if (!canAccess) {
  return NextResponse.json(
    { error: 'この機能へのアクセス権限がありません' },
    { status: 403 }
  );
}
```

## 注意事項

- 機能キーは**後方互換性**を保つため、一度設定したら変更しない
- 機能キーの削除は、既存契約への影響を確認してから実施
- 新機能追加時は、このドキュメントを必ず更新する

## 更新履歴

- 2025-12-12: 初版作成
