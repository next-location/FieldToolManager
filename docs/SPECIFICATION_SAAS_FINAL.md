# 道具管理システム 最終仕様書（SaaS型マルチテナント版）

## 目次
1. [システム概要](#1-システム概要)
2. [対象業種と汎用性](#2-対象業種と汎用性)
3. [SaaS型アーキテクチャ](#3-saas型アーキテクチャ)
4. [セキュリティ設計](#4-セキュリティ設計)
5. [データモデル](#5-データモデル)
6. [画面設計](#6-画面設計)
7. [QRスキャン機能](#7-qrスキャン機能)
8. [拡張性機能](#8-拡張性機能)
9. [技術仕様](#9-技術仕様)
10. [課金・プラン管理](#10-課金プラン管理)
11. [管理者機能](#11-管理者機能)
12. [導入・運用](#12-導入運用)
13. [開発ロードマップ](#13-開発ロードマップ)

---

## 1. システム概要

### 1.1 ビジネスモデル

本システムは**現場系業種に特化したマルチテナントSaaS型**の道具管理システムです。

```
【提供形態】
マルチテナントSaaS
- 複数企業が1つの統合システムを共有利用
- 企業ごとに完全にデータ分離（Row Level Security）
- サブドメインで企業を識別
- 月額課金制

【サービス提供者】
あなた（開発者）が統一環境を運用・管理

【顧客企業】
各企業は独自のサブドメインでアクセス
例:
- a-kensetsu.tool-manager.com（A建設株式会社）
- b-tosou.tool-manager.com（B塗装工業）
- c-denki.tool-manager.com（C電気工事）
```

---

### 1.2 課題と解決策

#### 顧客企業の課題
- 道具の数量・所在が不明確（現場 vs 会社倉庫）
- 20名程度のスタッフによる複雑な道具移動の管理困難
- アナログ管理によるDX化の遅れ
- 高価な工具の紛失リスク

#### 解決策
全道具に**一意のUUID + QRコード**を付与し、スマホでスキャンするだけで**リアルタイムな在庫・所在管理**を実現

---

## 2. 対象業種と汎用性

### 2.1 ターゲット業種

**現場系業種に特化**

| 業種 | 主な道具 | 特有ニーズ |
|------|---------|-----------|
| **建築** | 電動工具、手工具、測定器 | 重機管理、大型現場 |
| **土木** | 重機、測量機器、安全用具 | レンタル品管理 |
| **内装** | 電動工具、仕上げ工具、足場 | 細かい工具多数 |
| **電気工事** | 測定器、配線工具、テスター | 校正記録、絶縁工具 |
| **塗装** | スプレーガン、養生材、ハケ | 消耗品が多い |
| **設備** | 配管工具、溶接機、計測器 | 定期点検記録 |

---

### 2.2 現場系共通の要件

#### 共通する作業環境
- ✅ 屋外作業が多い（雨天・日光下）
- ✅ 手袋着用での操作
- ✅ 複数現場の掛け持ち
- ✅ 会社↔現場の道具移動
- ✅ スマホでの操作が中心

#### 共通する管理ニーズ
- ✅ 個別管理（高価な工具）
- ✅ 数量管理（消耗品）
- ✅ レンタル品管理
- ✅ 修理・点検記録
- ✅ 減価償却管理

---

### 2.3 必要な拡張性（現場系特化）

```
基本設計: 建築業をベースに設計

拡張ポイント:
1. カスタムフィールド（JSONB）
   - 校正日、レンタル返却期限、減価償却率等

2. カテゴリーのカスタマイズ
   - 企業ごとに独自カテゴリー定義可能
   - デフォルト: 電動工具、手工具、測定器、安全用具、消耗品

3. 数量管理
   - 高価な工具: 1個1QRコード（個別管理）
   - 消耗品: まとめて数量管理

4. ステータスの柔軟性
   - 基本: 正常、修理中、故障、廃棄済み
   - 追加可能: 校正済み、レンタル中、返却期限あり等
```

**結論**:
- 医療・飲食等の異業種対応は不要
- 現場系業種の多様性に対応できる**適度な拡張性**を確保
- 複雑すぎず、シンプルで使いやすい設計

---

## 3. SaaS型アーキテクチャ

### 3.1 システム構成図

```
┌─────────────────────────────────────────────────────┐
│           SaaS統合プラットフォーム                  │
│        （あなたが運用する単一環境）                 │
├─────────────────────────────────────────────────────┤
│  【フロントエンド】                                 │
│  Next.js 14 (App Router) + TypeScript               │
│  ホスティング: Vercel                               │
│                                                     │
│  【バックエンド・データベース】                     │
│  Supabase PostgreSQL                                │
│  - マルチテナント対応（organization_id分離）       │
│  - Row Level Security (RLS)                         │
│  - Realtime Subscriptions                           │
│  - 監査ログ（Audit Log）                           │
│                                                     │
│  【認証】                                           │
│  Supabase Auth (JWT)                                │
│                                                     │
│  【ストレージ】                                     │
│  Supabase Storage（画像・PDF）                      │
│                                                     │
│  【決済・課金】                                     │
│  Stripe                                             │
│  - サブスクリプション管理                           │
│  - 請求書自動発行                                   │
│  - Webhook連携                                      │
│                                                     │
│  【セキュリティ】                                   │
│  Upstash Redis（レート制限）                        │
└─────────────────────────────────────────────────────┘
                    ↓ サブドメイン振り分け
    ┌─────────────┬─────────────┬─────────────┐
    │  企業A      │  企業B      │  企業C      │
    │ a-kensetsu. │ b-tosou.    │ c-denki.    │
    │ tool-mgr.com│ tool-mgr.com│ tool-mgr.com│
    └─────────────┴─────────────┴─────────────┘
```

---

### 3.2 データ分離の仕組み

#### マルチテナント設計の核心
```sql
-- 全テーブルに organization_id を持たせる
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  tool_code TEXT NOT NULL,  -- 表示用ID
  name TEXT,
  ...
);

-- Row Level Security で自動的にフィルタリング
ALTER TABLE tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tools_isolation"
  ON tools FOR ALL
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );
```

**結果**:
- ユーザーは自分の企業のデータしか見えない・操作できない
- アプリケーションコードで organization_id を意識不要
- データベースレベルで完全分離

---

## 4. セキュリティ設計

### 4.1 QRコードのセキュリティ強化 ✨NEW

#### ❌ 従来の問題
```
QRコード内容: https://a-kensetsu.tool-manager.com/scan?id=A-0123

問題:
- IDが予測可能（A-0001, A-0002, A-0003...）
- 他企業のQRコードを推測して不正アクセス可能
- 連番攻撃のリスク
```

#### ✅ 改善後
```sql
-- tools テーブルに UUID を主キーとして使用
CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL,
  tool_code TEXT NOT NULL,  -- 表示用（A-0123）ユーザーには見やすい
  name TEXT,
  ...
);

-- QRコード内容（UUID使用）
https://a-kensetsu.tool-manager.com/scan?id=550e8400-e29b-41d4-a716-446655440000

メリット:
✅ ID推測不可能（36桁のランダム文字列）
✅ tool_code は表示用として残す（ユーザーにとって分かりやすい「A-0123」）
✅ RLS により他企業のUUIDは無効（二重の安全策）
✅ セキュリティと使いやすさの両立
```

---

### 4.2 監査ログ（Audit Log）✨NEW

#### 目的
- 管理者権限の濫用防止
- セキュリティインシデントの追跡
- コンプライアンス対応
- データ変更履歴の記録

#### 実装
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES organizations(id),
  user_id UUID REFERENCES users(id),

  -- 操作情報
  action TEXT NOT NULL,  -- 'create', 'update', 'delete', 'view'
  table_name TEXT NOT NULL,
  record_id UUID,

  -- 変更内容
  old_value JSONB,
  new_value JSONB,

  -- コンテキスト情報
  ip_address INET,
  user_agent TEXT,
  reason TEXT,  -- トラブルシューティング等の理由

  created_at TIMESTAMP DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_audit_logs_org ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_logs_table ON audit_logs(table_name, record_id);
```

#### ログ記録対象
- ✅ 道具の作成・編集・削除
- ✅ ユーザーの作成・編集・削除
- ✅ プラン変更
- ✅ **システム管理者による顧客データアクセス（重要）**
- ✅ 重要な設定変更

---

### 4.3 論理削除（Soft Delete）✨NEW

#### ❌ 従来の問題
```sql
-- 物理削除
DELETE FROM tools WHERE id = 'xxx';

問題:
- 誤削除時に復元不可能
- 請求書等の法的保持義務があるデータも削除される
- 監査証跡が失われる
```

#### ✅ 改善後
```sql
-- 全テーブルに deleted_at カラム追加
ALTER TABLE tools ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP;
ALTER TABLE tool_movements ADD COLUMN deleted_at TIMESTAMP;

-- RLS ポリシーを更新（削除済みは非表示）
CREATE POLICY "tools_own_organization"
  ON tools FOR SELECT
  USING (
    organization_id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND deleted_at IS NULL  -- ← 追加
  );

-- 削除は論理削除に変更
UPDATE tools SET deleted_at = NOW() WHERE id = 'xxx';

-- 完全削除は管理者のみ（保持期間経過後）
DELETE FROM tools WHERE deleted_at < NOW() - INTERVAL '3 years';
```

**メリット**:
- 誤削除からの復元可能
- 監査証跡の保持
- 法的要件への対応

---

### 4.4 レート制限（Rate Limiting）✨NEW

#### 目的
- ブルートフォース攻撃防止
- DoS攻撃防止
- API濫用防止
- システム安定性の確保

#### 実装（Upstash Redis使用）
```typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// QRスキャン: 1ユーザーあたり 100回/分
export const scanRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
});

// ログイン試行: 5回/10分
export const loginRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '10 m'),
  analytics: true,
});

// API一般: 1000回/時間
export const apiRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(1000, '1 h'),
  analytics: true,
});
```

#### 使用例
```typescript
// app/api/scan/route.ts
export async function POST(request: Request) {
  const userId = await getUserId(request);

  // レート制限チェック
  const { success } = await scanRatelimit.limit(userId);

  if (!success) {
    return NextResponse.json(
      { error: 'スキャン回数の上限に達しました。しばらくお待ちください。' },
      { status: 429 }
    );
  }

  // 通常処理
  // ...
}
```

---

### 4.5 サブドメインのセキュリティ強化 ✨NEW

#### ❌ 従来の問題
```
サブドメイン: a-kensetsu.tool-manager.com

問題:
- 企業名から顧客を特定できる
- 競合他社が顧客リストを把握可能
- ブルートフォースで存在企業を探索可能
```

#### ✅ 改善案（オプション）
```
サブドメインにランダム要素を追加

従来: a-kensetsu.tool-manager.com
改善: a-kensetsu-x7k2.tool-manager.com

organizations テーブル:
- subdomain: "a-kensetsu-x7k2"（8桁ランダム文字列追加）
```

**判断**:
- MVP段階では従来方式でOK
- セキュリティ要求が高い企業向けにオプション提供

---

## 5. データモデル

### 5.1 マルチテナント対応ER図

```
Organization (組織・企業)
├── id (PK, UUID)
├── name "A建設株式会社"
├── subdomain "a-kensetsu" (UQ)
├── plan "basic" | "premium" | "enterprise"
├── stripe_customer_id
├── stripe_subscription_id
├── max_users 20
├── max_tools 500
├── is_active true
└── created_at

    ↓ 1:N

User (ユーザー)
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── email
├── name
├── role "admin" | "leader" | "staff"
├── deleted_at (論理削除) ✨NEW
└── created_at

Tool (道具) ✨UUID主キー化
├── id (PK, UUID) ← QRコードに使用 ✨NEW
├── organization_id (FK) ← 重要！
├── tool_code TEXT ← 表示用（A-0123）✨NEW
├── category_id (FK)
├── name
├── model_number
├── manufacturer
├── purchase_date
├── purchase_price
├── status "normal" | "repair" | "broken" | "disposed"
├── current_location_id (FK)
├── management_type "individual" | "quantity" ✨NEW
├── current_quantity INTEGER ✨NEW
├── unit TEXT ✨NEW
├── custom_fields JSONB ✨NEW
├── deleted_at (論理削除) ✨NEW
└── created_at

ToolMovement (移動履歴)
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── tool_id (FK → Tool.id UUID) ✨NEW
├── user_id (FK)
├── from_location_id (FK)
├── to_location_id (FK)
├── movement_type "checkout" | "checkin" | "transfer"
├── quantity INTEGER DEFAULT 1 ✨NEW
├── note
├── moved_at
├── deleted_at (論理削除) ✨NEW
└── created_at

Location (場所)
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── type "company" | "site"
├── name
├── address
├── manager_name
├── is_active
├── deleted_at (論理削除) ✨NEW
└── created_at

ToolCategory (道具カテゴリ) ✨カスタマイズ可能
├── id (PK, UUID)
├── organization_id (FK) ← 重要！
├── name
├── code_prefix "A" | "B" | "C" | "D" | ...
├── display_order INTEGER
├── is_active BOOLEAN
└── created_at

AuditLog (監査ログ) ✨NEW
├── id (PK, UUID)
├── organization_id (FK)
├── user_id (FK)
├── action TEXT
├── table_name TEXT
├── record_id UUID
├── old_value JSONB
├── new_value JSONB
├── ip_address INET
├── user_agent TEXT
├── reason TEXT
└── created_at

OrganizationFeatures (機能フラグ)
├── id (PK, UUID)
├── organization_id (FK)
├── feature_key TEXT
├── is_enabled BOOLEAN
└── config JSONB

CustomFieldDefinitions (カスタムフィールド定義) ✨NEW
├── id (PK, UUID)
├── organization_id (FK)
├── entity_type "tool" | "location"
├── field_key TEXT
├── field_label TEXT
├── field_type "text" | "number" | "date" | "select"
├── field_options JSONB
├── is_required BOOLEAN
├── display_order INTEGER
└── created_at
```

---

### 5.2 主要テーブル定義（TypeScript型）

#### Tool（道具マスタ）✨改善版
```typescript
interface Tool {
  // 基本情報
  id: string;                      // UUID ← QRコードに使用 ✨NEW
  organization_id: string;         // FK ← 重要！
  tool_code: string;               // "A-0123" 表示用ID ✨NEW
  category_id: string;             // FK
  name: string;                    // "ドライバーセット"
  model_number?: string;           // "XYZ-2000"
  manufacturer?: string;           // "マキタ"

  // 購入情報
  purchase_date?: Date;
  purchase_price?: number;         // 減価償却計算用

  // ステータス
  status: 'normal' | 'repair' | 'broken' | 'disposed';
  current_location_id: string;     // FK

  // 数量管理 ✨NEW
  management_type: 'individual' | 'quantity';
  current_quantity?: number;       // quantity の場合のみ使用
  unit?: string;                   // '個', '箱', 'kg', 'L'

  // カスタムフィールド ✨NEW
  custom_fields?: {
    [key: string]: any;
    // 例:
    // calibration_date?: string;  // 校正日
    // rental_due_date?: string;   // レンタル返却期限
    // depreciation_rate?: number; // 減価償却率
  };

  // メタデータ
  min_stock_alert?: number;
  photo_url?: string;
  manual_url?: string;

  // 論理削除 ✨NEW
  deleted_at?: Date;

  created_at: Date;
  updated_at: Date;
}
```

#### ToolMovement（移動履歴）✨改善版
```typescript
interface ToolMovement {
  id: string;                      // UUID
  organization_id: string;         // FK ← 重要！
  tool_id: string;                 // FK → Tool.id (UUID) ✨NEW
  user_id: string;                 // FK (実行者)
  from_location_id: string;        // FK (移動元)
  to_location_id: string;          // FK (移動先)
  movement_type: 'checkout' | 'checkin' | 'transfer';
  quantity: number;                // デフォルト1 ✨NEW
  note?: string;
  moved_at: Date;
  deleted_at?: Date;               // 論理削除 ✨NEW
  created_at: Date;
}
```

#### CustomFieldDefinition（カスタムフィールド定義）✨NEW
```typescript
interface CustomFieldDefinition {
  id: string;
  organization_id: string;
  entity_type: 'tool' | 'location';
  field_key: string;               // "calibration_date"
  field_label: string;             // "校正日"
  field_type: 'text' | 'number' | 'date' | 'select';
  field_options?: {
    choices?: Array<{ value: string; label: string }>;
    min?: number;
    max?: number;
  };
  is_required: boolean;
  display_order: number;
  created_at: Date;
}
```

---

## 6. 画面設計

### 6.1 ホーム（ダッシュボード）

#### レイアウト
```
┌─────────────────────────────────┐
│ [ヘッダー]                      │
│ A建設株式会社      [通知🔔 3]  │
│ プレミアムプラン                │
├─────────────────────────────────┤
│ 【在庫サマリー】                │
│ ┌───────┐ ┌───────┐ ┌───────┐ │
│ │ 総在庫 │ │現場中 │ │会社  │ │
│ │ 324個│ │ 187個│ │ 137個│ │
│ └───────┘ └───────┘ └───────┘ │
├─────────────────────────────────┤
│ 【要注意アラート】 🚨           │
│ ⚠️ 在庫不足 (3件)              │
│ ・ドライバーセット 残り2個      │
│ → 発注管理へ                   │
│                                 │
│ 🔧 長期未返却 (2件)            │
│ ・現場A: ハンマー (7日間)      │
│ → 詳細を見る                   │
│                                 │
│ 📅 校正期限切れ (1件) ✨NEW   │
│ ・テスター #B-0045 (期限超過)  │
│ → メンテナンス管理へ           │
├─────────────────────────────────┤
│ 【直近の移動履歴】（最新5件）   │
│ 🔵 10:30 田中太郎            │
│    ドライバーセット → 現場A     │
│ 🟢 09:15 佐藤花子            │
│    サンダー → 会社倉庫         │
└─────────────────────────────────┘
```

---

### 6.2 QRスキャン画面

#### ステップ2: スキャン実行
```
┌─────────────────────────────────┐
│ [×]                   [💡ライト]│
│                                 │
│    ┌─────────────────┐          │
│    │                 │          │
│    │  QRコード       │          │
│    │  読み取り枠     │          │
│    │                 │          │
│    └─────────────────┘          │
│                                 │
│  道具のQRコードを枠内に合わせる │
│                                 │
│ ┌─────────────────────────────┐│
│ │ 📷 カメラでスキャン         ││
│ └─────────────────────────────┘│
│ ┌─────────────────────────────┐│
│ │ ⌨️  手動でID入力            ││
│ │ (例: A-0123)                ││
│ └─────────────────────────────┘│
└─────────────────────────────────┘
```

**重要**:
- QRコードには UUID が格納（セキュリティ）
- 手動入力には tool_code を使用（使いやすさ）
- 内部的に tool_code から UUID に変換

---

### 6.3 道具詳細画面

```
┌─────────────────────────────────┐
│ [×]        道具詳細             │
├─────────────────────────────────┤
│ 🔧 ドライバーセット             │
│ ID: A-0123 ✨表示用            │
│ 管理番号: 550e...440000（内部） │
├─────────────────────────────────┤
│ 基本情報                        │
│ ・カテゴリー: 電動工具          │
│ ・型番: XYZ-2000                │
│ ・メーカー: マキタ              │
│ ・購入日: 2023/04/15            │
│ ・購入金額: ¥28,000             │
│ ・状態: 🟢 正常                │
├─────────────────────────────────┤
│ カスタム情報 ✨NEW             │
│ ・校正日: 2024/11/01            │
│ ・次回校正: 2025/11/01          │
├─────────────────────────────────┤
│ 現在の所在                      │
│ 📍 現場A（渋谷ビル改修）        │
│ 👤 田中太郎                     │
│ 🕐 2024/11/29 10:30             │
├─────────────────────────────────┤
│ 移動履歴（最新5件）             │
│ 11/29 会社→現場A                │
│ 11/25 現場B→会社                │
│ → すべての履歴を見る            │
├─────────────────────────────────┤
│ [スキャン][編集][故障報告]      │
└─────────────────────────────────┘
```

---

## 7. QRスキャン機能

### 7.1 QRコード設計 ✨改善版

#### QRコード内容フォーマット
```
https://a-kensetsu.tool-manager.com/scan?id=550e8400-e29b-41d4-a716-446655440000

構成:
- サブドメイン: a-kensetsu（企業識別）
- パス: /scan（スキャン画面へ遷移）
- パラメータ: id=UUID（道具のUUID） ✨セキュリティ強化
```

#### 仕様
- **サイズ**: 最小25mm × 25mm（読み取り距離10cm想定）
- **訂正レベル**: Level H（約30%復元可能）→ 汚れ・破損に強い
- **推奨印刷**: 耐水ラベル用紙、ラミネート加工
- **色**: 黒QRコード + 白背景（視認性最高）

#### 道具ID体系 ✨二重管理
```
【内部ID（UUID）】
- データベース主キー
- QRコードに格納
- 例: 550e8400-e29b-41d4-a716-446655440000
- 用途: セキュリティ、一意性保証

【表示用ID（tool_code）】
- ユーザーに表示
- 手動入力で使用
- 例: A-0123, B-0456, C-0789
- 命名規則: [カテゴリーコード]-[連番4桁]

カテゴリーコード（企業ごとにカスタマイズ可能）:
A: 電動工具
B: 手工具
C: 測定器
D: 安全用具
E: 消耗品
...
```

---

### 7.2 スキャン処理フロー

```typescript
// app/scan/page.tsx
async function handleQRScan(scannedValue: string) {
  // QRコードからUUIDを抽出
  const url = new URL(scannedValue);
  const toolId = url.searchParams.get('id'); // UUID

  // ツール情報取得（RLSで自動的に自社データのみ）
  const { data: tool, error } = await supabase
    .from('tools')
    .select('*')
    .eq('id', toolId)
    .single();

  if (error || !tool) {
    // エラーケース
    if (error?.code === 'PGRST116') {
      // データが見つからない = 他社のQRコードまたは存在しないID
      showError('このQRコードは登録されていません');
    }
    return;
  }

  // 成功: 移動登録画面へ
  navigateToMoveForm(tool);
}

// 手動入力の場合
async function handleManualInput(toolCode: string) {
  // tool_code で検索
  const { data: tool } = await supabase
    .from('tools')
    .select('*')
    .eq('tool_code', toolCode)  // A-0123 等
    .single();

  // 以下同じ処理
}
```

---

## 8. 拡張性機能

### 8.1 カスタムフィールド ✨NEW

#### 目的
現場系業種ごとの独自要件に対応

#### 実装方針
```sql
-- tools テーブルに JSONB カラム追加
ALTER TABLE tools ADD COLUMN custom_fields JSONB DEFAULT '{}';

-- カスタムフィールド定義テーブル
CREATE TABLE custom_field_definitions (
  id UUID PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  entity_type TEXT NOT NULL,  -- 'tool', 'location'
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL,  -- 'text', 'number', 'date', 'select'
  field_options JSONB,
  is_required BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,

  UNIQUE(organization_id, entity_type, field_key)
);
```

#### 使用例

**電気工事業向け**
```sql
INSERT INTO custom_field_definitions (organization_id, entity_type, field_key, field_label, field_type) VALUES
  ('org-denki', 'tool', 'calibration_date', '校正日', 'date'),
  ('org-denki', 'tool', 'next_calibration', '次回校正日', 'date'),
  ('org-denki', 'tool', 'calibration_certificate', '校正証明書番号', 'text');

-- 道具データ
INSERT INTO tools (name, custom_fields) VALUES
  ('デジタルテスター', '{
    "calibration_date": "2024-11-01",
    "next_calibration": "2025-11-01",
    "calibration_certificate": "CERT-2024-11-001"
  }');
```

**土木業向け**
```sql
INSERT INTO custom_field_definitions (organization_id, entity_type, field_key, field_label, field_type) VALUES
  ('org-doboku', 'tool', 'rental_company', 'レンタル会社', 'text'),
  ('org-doboku', 'tool', 'rental_due_date', '返却期限', 'date'),
  ('org-doboku', 'tool', 'rental_cost', 'レンタル料', 'number');
```

**塗装業向け**
```sql
INSERT INTO custom_field_definitions (organization_id, entity_type, field_key, field_label, field_type) VALUES
  ('org-tosou', 'tool', 'last_maintenance', '最終メンテナンス日', 'date'),
  ('org-tosou', 'tool', 'nozzle_size', 'ノズルサイズ', 'select');
```

---

### 8.2 数量管理機能 ✨NEW

#### 目的
消耗品の効率的な管理

#### 実装
```sql
-- tools テーブルに追加
ALTER TABLE tools ADD COLUMN management_type TEXT DEFAULT 'individual';
-- 'individual': 個別管理（1個1QRコード）
-- 'quantity': 数量管理（まとめて在庫数のみ）

ALTER TABLE tools ADD COLUMN current_quantity INTEGER;
ALTER TABLE tools ADD COLUMN unit TEXT DEFAULT '個';

-- 移動履歴に数量を追加
ALTER TABLE tool_movements ADD COLUMN quantity INTEGER DEFAULT 1;
```

#### 使用例
```typescript
// 個別管理の道具（高価な工具）
{
  name: 'ドライバーセット',
  management_type: 'individual',
  // QRコード1個1個に対応
}

// 数量管理の道具（消耗品）
{
  name: '養生テープ',
  management_type: 'quantity',
  current_quantity: 50,
  unit: '巻'
}

// スキャン時の処理
if (tool.management_type === 'quantity') {
  // 数量入力を求める
  const quantity = prompt('移動する数量を入力してください（単位: ' + tool.unit + '）');

  // 在庫更新
  await supabase
    .from('tools')
    .update({ current_quantity: tool.current_quantity - quantity })
    .eq('id', tool.id);
}
```

---

### 8.3 カテゴリーのカスタマイズ ✨NEW

#### 実装
```sql
-- tool_categories テーブルに organization_id を追加
ALTER TABLE tool_categories ADD COLUMN organization_id UUID REFERENCES organizations(id);

-- 企業ごとに独自カテゴリー定義
INSERT INTO tool_categories (organization_id, name, code_prefix) VALUES
  -- 建築業
  ('org-kensetsu', '電動工具', 'A'),
  ('org-kensetsu', '手工具', 'B'),
  ('org-kensetsu', '測定器', 'C'),
  ('org-kensetsu', '安全用具', 'D'),

  -- 電気工事業
  ('org-denki', '測定器', 'A'),
  ('org-denki', '配線工具', 'B'),
  ('org-denki', 'テスター類', 'C'),
  ('org-denki', '絶縁工具', 'D'),

  -- 塗装業
  ('org-tosou', '塗装機器', 'A'),
  ('org-tosou', '養生材', 'B'),
  ('org-tosou', 'ハケ・ローラー', 'C'),
  ('org-tosou', '保護具', 'D');
```

---

## 9. 技術仕様

### 9.1 技術スタック

```json
{
  "dependencies": {
    // フレームワーク
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",

    // UI
    "tailwindcss": "^3.4.0",
    "@headlessui/react": "^1.7.0",
    "lucide-react": "^0.300.0",

    // QRコード
    "html5-qrcode": "^2.3.8",
    "qrcode": "^1.5.3",

    // 状態管理
    "zustand": "^4.4.0",

    // フォーム
    "react-hook-form": "^7.48.0",
    "zod": "^3.22.0",

    // データフェッチ
    "@tanstack/react-query": "^5.0.0",

    // 日付
    "date-fns": "^2.30.0",

    // PWA
    "next-pwa": "^5.6.0",

    // データベース（Supabase）
    "@supabase/supabase-js": "^2.38.0",
    "@supabase/auth-helpers-nextjs": "^0.8.0",

    // 決済（Stripe）
    "stripe": "^14.0.0",
    "@stripe/stripe-js": "^2.0.0",

    // レート制限（Upstash Redis）✨NEW
    "@upstash/ratelimit": "^0.4.0",
    "@upstash/redis": "^1.25.0"
  }
}
```

---

### 9.2 インフラ構成とコスト

```
【フロントエンド】
Vercel Pro: $20/月
- Next.js デプロイ
- エッジネットワーク（CDN）
- 自動HTTPS、カスタムドメイン

【バックエンド・データベース】
Supabase:
- 無料プラン: $0/月（1-3社）
- Pro プラン: $25/月（4-10社）
- Team プラン: $599/月（50社以上）

【レート制限・キャッシュ】✨NEW
Upstash Redis:
- 無料プラン: $0/月（10,000リクエスト/日）
- Pro プラン: $10/月（100万リクエスト/月）

【決済】
Stripe:
- 初期費用: $0
- 手数料: 3.6% + ¥0/決済

【合計見積もり】
初期（1-3社）: $20/月（約¥3,000/月）
成長期（4-10社）: $55/月（約¥8,250/月）
スケール期（50社以上）: $629/月（約¥94,000/月）
```

---

### 9.3 PWA対応（オフライン機能）

#### 実装方針
```typescript
// Service Worker 実装
interface OfflineQueueItem {
  id: string;
  tool_id: string;  // UUID
  action: 'checkout' | 'checkin' | 'transfer';
  from_location: string;
  to_location: string;
  user_id: string;
  timestamp: Date;
  synced: boolean;
}

// フロー:
// 1. スキャンデータをIndexedDBに一時保存
// 2. オンライン復帰時に自動同期
// 3. 同期完了を通知
```

---

## 10. 課金・プラン管理

### 10.1 プラン体系

#### ベーシックプラン
```
月額: ¥25,000/月
- ユーザー数: 20名まで
- 道具登録数: 500個まで
- ストレージ: 1GB
- 機能:
  ✅ 道具マスタ管理
  ✅ QRスキャン（入出庫）
  ✅ 在庫・所在管理
  ✅ 移動履歴
  ✅ 低在庫アラート
  ✅ 基本レポート（CSV出力）
  ✅ カスタムカテゴリー（5個まで）
  ✅ メールサポート
```

#### プレミアムプラン
```
月額: ¥50,000/月
- ユーザー数: 50名まで
- 道具登録数: 無制限
- ストレージ: 5GB
- 機能:
  ✅ ベーシックプランの全機能
  ✅ 損耗・修理管理
  ✅ コスト分析
  ✅ 高度なレポート（グラフ化）
  ✅ カスタムフィールド（無制限）✨NEW
  ✅ カスタムカテゴリー（無制限）
  ✅ 数量管理機能 ✨NEW
  ✅ 監査ログ閲覧 ✨NEW
  ✅ 電話サポート
```

---

## 11. 管理者機能（あなた用）

### 11.1 管理画面（admin.tool-manager.com）

#### 顧客一覧
```
┌─────────────────────────────────────────────────────┐
│ 顧客管理                                            │
├───┬────────┬──────┬─────┬─────┬──────┬─────┤
│企業│サブ    │プラン│ユーザ│道具数│ステータス│MRR  │
├───┼────────┼──────┼─────┼─────┼──────┼─────┤
│A建設│a-kensetsu│Premium│18/20│324  │✅有効 │¥50K │
├───┼────────┼──────┼─────┼─────┼──────┼─────┤
│B塗装│b-tosou │Basic │12/20│189  │✅有効 │¥25K │
├───┼────────┼──────┼─────┼─────┼──────┼─────┤
│C電気│c-denki │Premium│25/50│567  │✅有効 │¥50K │
└───┴────────┴──────┴─────┴─────┴──────┴─────┘

【サマリー】
総顧客数: 28社
有効顧客: 25社
月間収益（MRR）: ¥750,000/月
年間予測（ARR）: ¥9,000,000/年
```

---

## 12. 導入・運用

### 12.1 初期導入ステップ（顧客企業向け）

#### フェーズ1: 準備（1-2週間）
1. 既存道具の棚卸し
2. カテゴリー分類とID付与ルール決定
3. QRコードラベル印刷・貼付
4. 現場マスタ登録
5. スタッフアカウント作成

#### フェーズ2: パイロット運用（2-4週間）
1. 1現場で試験運用
2. フィードバック収集
3. UI/UX改善

#### フェーズ3: 本格展開（1ヶ月〜）
1. 全現場へ展開
2. 運用ルール徹底教育
3. 定期棚卸し

---

## 13. 開発ロードマップ

### MVP（フェーズ1）- 0-3ヶ月

**セキュリティ基盤** ✨必須
- ✅ UUID によるQRコード生成
- ✅ Row Level Security (RLS)
- ✅ レート制限（Upstash Redis）
- ✅ 監査ログ
- ✅ 論理削除

**コア機能**
- ✅ マルチテナント基盤
- ✅ 道具マスタ管理
- ✅ QRスキャン（入出庫）
- ✅ 在庫・所在管理
- ✅ 移動履歴記録
- ✅ 低在庫アラート

**現場系特化の拡張性**
- ✅ カスタムフィールド（JSONB）
- ✅ カテゴリーカスタマイズ
- ✅ 数量管理機能

**目標**: 建築業3社の顧客獲得

---

### フェーズ2（+3ヶ月）

**プレミアム機能**
- 📊 ダッシュボードのグラフ化
- 🔧 損耗・修理管理
- 💰 コスト分析
- 📧 メール通知

**業種拡大**
- 電気工事業向けテンプレート
- 塗装業向けテンプレート
- 土木業向けテンプレート

**目標**: 10社（建築5、電気3、塗装2）

---

### フェーズ3（+6ヶ月）

**拡張機能（アドオン）**
- 📄 見積管理
- 💳 請求管理
- 📷 道具写真・マニュアル添付

**エンタープライズ機能**
- 🔌 API公開
- 📊 高度な分析

**目標**: 50社（多業種展開）

---

## まとめ

本システムは**現場系業種に特化したSaaS型マルチテナントアーキテクチャ**により、以下を実現します：

### セキュリティ面 ✨強化完了
1. ✅ UUID によるQRコード（推測不可能）
2. ✅ 監査ログ（管理者アクセスの追跡）
3. ✅ 論理削除（データ保護）
4. ✅ レート制限（攻撃防止）
5. ✅ Row Level Security（データベースレベル分離）

### 汎用性・拡張性面（現場系特化）
1. ✅ カスタムフィールド（業種特有の情報）
2. ✅ カテゴリーカスタマイズ（企業ごと）
3. ✅ 数量管理（消耗品対応）
4. ✅ 適度な拡張性（複雑すぎない）

### ビジネス面
1. ✅ ターゲット明確（現場系業種のみ）
2. ✅ 運用効率（1つの環境で全顧客管理）
3. ✅ 安定収益（月額課金）
4. ✅ 高利益率（インフラコスト低）

**成功の鍵**:
- セキュアで安心できるシステム
- 現場作業に最適化されたUI/UX
- 業種の多様性に対応できる適度な拡張性
- シンプルで使いやすい設計

このシステムにより、現場系業種の**DX化**と**業務効率の劇的な改善**を実現し、持続可能なSaaSビジネスを構築できます。
