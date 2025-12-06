# 作業報告書機能 仕様書

最終更新: 2025-12-06

## 目次
1. [概要](#1-概要)
2. [設計方針](#2-設計方針)
3. [データベース設計](#3-データベース設計)
4. [機能仕様](#4-機能仕様)
5. [画面設計](#5-画面設計)
6. [実装フェーズ](#6-実装フェーズ)

---

## 1. 概要

### 1.1 目的

現場作業者が日々の作業内容を記録・報告するための機能。
業種による違いに対応しつつ、シンプルで使いやすいUIを提供する。

### 1.2 対象ユーザー

- **作成者**: staff, leader（現場作業者）
- **承認者**: leader, admin（管理者）
- **閲覧者**: 全ロール

### 1.3 主な用途

- 日報作成
- 作業実績の記録
- 顧客への作業報告
- 工程管理
- トラブル記録

---

## 2. 設計方針

### 2.1 ハイブリッド方式

**コア項目（必須） + よく使う項目（オプション） + カスタムフィールド（自由）**

```
┌─────────────────────────────────────┐
│  コア項目（全業種共通・必須）         │
│  - 作業日、現場、作業者、作業内容   │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  よく使う項目（ON/OFF可能）          │
│  - 作業箇所、進捗率、使用道具 等    │
└─────────────────────────────────────┘
           ↓
┌─────────────────────────────────────┐
│  カスタムフィールド（完全自由）      │
│  - 業種特有の項目を自由定義         │
└─────────────────────────────────────┘
```

### 2.2 段階的実装

#### Phase 1: MVP（コア機能）
- コア項目のみ
- シンプルなフォーム
- 基本的な一覧・詳細表示
- PDF出力

#### Phase 2: 拡張機能
- よく使う項目の追加
- 写真アップロード
- 資料（図面等）アップロード
- 組織設定でのON/OFF

#### Phase 3: カスタマイズ
- カスタムフィールド定義UI
- 動的フォーム生成
- テンプレート機能

#### Phase 4: 高度な機能
- 承認フロー
- 過去データコピー
- 月次/週次集計レポート

---

## 3. データベース設計

### 3.1 work_reports テーブル

```sql
CREATE TABLE work_reports (
  -- ID
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- コア項目（必須）
  site_id UUID NOT NULL REFERENCES sites(id) ON DELETE RESTRICT,
  report_date DATE NOT NULL,
  weather TEXT, -- 晴れ、曇り、雨、雪
  description TEXT NOT NULL, -- 作業内容

  -- 作業時間
  work_start_time TIME,
  work_end_time TIME,
  break_minutes INTEGER DEFAULT 0, -- 休憩時間（分）

  -- 作業者情報（JSONB配列）
  workers JSONB NOT NULL DEFAULT '[]',
  -- [{ user_id: UUID, name: string, work_hours: number }]

  -- よく使う項目（オプション）
  work_location TEXT, -- 作業箇所（例: 2階リビング）
  progress_rate INTEGER CHECK (progress_rate >= 0 AND progress_rate <= 100), -- 進捗率 0-100%
  materials_used TEXT[], -- 使用材料
  tools_used UUID[], -- 使用道具（tool_items.id参照）

  -- 安全・品質
  safety_incidents BOOLEAN DEFAULT false, -- 安全上の事故の有無
  safety_incident_details TEXT, -- 事故詳細
  quality_issues BOOLEAN DEFAULT false, -- 品質問題の有無
  quality_issue_details TEXT, -- 品質問題詳細

  -- 顧客対応
  client_contact BOOLEAN DEFAULT false, -- 顧客対応の有無
  client_contact_details TEXT, -- 対応内容

  -- 次回作業
  next_tasks TEXT, -- 次回作業予定

  -- カスタムフィールド（JSONB）
  custom_fields JSONB DEFAULT '{}',

  -- 承認フロー
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
  rejection_reason TEXT,

  -- メタデータ
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,

  -- インデックス用
  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_site FOREIGN KEY (site_id) REFERENCES sites(id),
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(id)
);

-- インデックス
CREATE INDEX idx_work_reports_organization ON work_reports(organization_id);
CREATE INDEX idx_work_reports_site ON work_reports(site_id);
CREATE INDEX idx_work_reports_date ON work_reports(report_date DESC);
CREATE INDEX idx_work_reports_status ON work_reports(status);
CREATE INDEX idx_work_reports_created_by ON work_reports(created_by);
CREATE INDEX idx_work_reports_deleted_at ON work_reports(deleted_at);

-- 複合インデックス
CREATE INDEX idx_work_reports_org_date ON work_reports(organization_id, report_date DESC);
CREATE INDEX idx_work_reports_site_date ON work_reports(site_id, report_date DESC);
```

### 3.2 work_report_photos テーブル

```sql
CREATE TABLE work_report_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_report_id UUID NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,

  -- 写真情報
  photo_url TEXT NOT NULL, -- Supabase Storage URL
  photo_type TEXT NOT NULL CHECK (photo_type IN ('before', 'during', 'after', 'issue', 'other')),
  caption TEXT, -- 説明文

  -- 位置情報（オプション）
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- メタデータ
  file_size BIGINT, -- バイト数
  mime_type TEXT,

  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_work_report FOREIGN KEY (work_report_id) REFERENCES work_reports(id)
);

-- インデックス
CREATE INDEX idx_work_report_photos_report ON work_report_photos(work_report_id);
CREATE INDEX idx_work_report_photos_type ON work_report_photos(photo_type);
```

### 3.3 work_report_attachments テーブル

```sql
CREATE TABLE work_report_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  work_report_id UUID NOT NULL REFERENCES work_reports(id) ON DELETE CASCADE,

  -- ファイル情報
  file_url TEXT NOT NULL, -- Supabase Storage URL
  file_name TEXT NOT NULL, -- 元のファイル名
  file_type TEXT NOT NULL CHECK (file_type IN ('drawing', 'specification', 'manual', 'other')),
  description TEXT, -- ファイル説明

  -- メタデータ
  file_size BIGINT, -- バイト数
  mime_type TEXT, -- application/pdf, image/jpeg, etc.

  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
  CONSTRAINT fk_work_report FOREIGN KEY (work_report_id) REFERENCES work_reports(id)
);

-- インデックス
CREATE INDEX idx_work_report_attachments_report ON work_report_attachments(work_report_id);
CREATE INDEX idx_work_report_attachments_type ON work_report_attachments(file_type);
```

### 3.4 organization_report_settings テーブル

```sql
CREATE TABLE organization_report_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,

  -- よく使う項目のON/OFF
  enable_work_location BOOLEAN DEFAULT true,
  enable_progress_rate BOOLEAN DEFAULT true,
  enable_materials_used BOOLEAN DEFAULT true,
  enable_tools_used BOOLEAN DEFAULT true,
  enable_safety_incidents BOOLEAN DEFAULT true,
  enable_quality_issues BOOLEAN DEFAULT false,
  enable_client_contact BOOLEAN DEFAULT true,
  enable_next_tasks BOOLEAN DEFAULT true,

  -- 写真・添付ファイル
  enable_photos BOOLEAN DEFAULT true,
  max_photos INTEGER DEFAULT 10,
  enable_attachments BOOLEAN DEFAULT true,
  max_attachments INTEGER DEFAULT 5,
  max_file_size_mb INTEGER DEFAULT 10,

  -- 承認フロー
  require_approval BOOLEAN DEFAULT false,
  approval_required_roles TEXT[] DEFAULT ARRAY['leader', 'admin'], -- 承認可能なロール

  -- カスタムフィールド定義
  custom_field_definitions JSONB DEFAULT '[]',
  -- [{ name, type, options, required, unit }]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- インデックス
CREATE INDEX idx_org_report_settings_org ON organization_report_settings(organization_id);
```

### 3.5 RLS ポリシー

```sql
-- work_reports
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;

-- 自組織のデータのみ閲覧可能
CREATE POLICY "Users can view own organization reports"
ON work_reports FOR SELECT
USING (organization_id = get_organization_id());

-- 自組織のデータのみ作成可能
CREATE POLICY "Users can create own organization reports"
ON work_reports FOR INSERT
WITH CHECK (organization_id = get_organization_id());

-- 作成者本人または管理者のみ編集可能（draft状態のみ）
CREATE POLICY "Users can update own reports or admins can update all"
ON work_reports FOR UPDATE
USING (
  organization_id = get_organization_id() AND
  status = 'draft' AND
  (created_by = auth.uid() OR
   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'leader')))
);

-- 作成者本人または管理者のみ削除可能
CREATE POLICY "Users can delete own reports or admins can delete all"
ON work_reports FOR DELETE
USING (
  organization_id = get_organization_id() AND
  (created_by = auth.uid() OR
   EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'))
);

-- work_report_photos, work_report_attachments も同様のRLS設定
```

---

## 4. 機能仕様

### 4.1 作業報告書作成

#### 4.1.1 必須項目
- **作業日**: カレンダー入力
- **現場**: ドロップダウン（sites テーブルから）
- **作業者**: 複数選択（users テーブルから）
- **作業内容**: テキストエリア（自由記述）

#### 4.1.2 よく使う項目（組織設定でON/OFF）
- **天候**: 選択（晴れ/曇り/雨/雪）
- **作業時間**: 開始時刻・終了時刻、休憩時間
- **作業箇所**: テキスト入力
- **進捗率**: スライダー（0-100%）
- **使用材料**: 複数行テキスト
- **使用道具**: QRスキャンまたはドロップダウン
- **安全上の事故**: チェックボックス + 詳細
- **品質問題**: チェックボックス + 詳細
- **顧客対応**: チェックボックス + 詳細
- **次回作業予定**: テキストエリア

#### 4.1.3 写真アップロード
- **作業前写真**: 複数枚
- **作業中写真**: 複数枚
- **作業後写真**: 複数枚
- **問題箇所写真**: 複数枚
- 各写真に説明文を追加可能

#### 4.1.4 資料アップロード
- **図面**: PDF, 画像
- **仕様書**: PDF, Word, Excel
- **マニュアル**: PDF
- **その他**: 各種ファイル
- ファイルサイズ制限: 組織設定で指定（デフォルト10MB）

#### 4.1.5 カスタムフィールド
- 組織ごとに定義
- フィールドタイプ:
  - テキスト
  - 数値
  - 選択（ドロップダウン）
  - チェックボックス
  - 日付
  - 時刻

### 4.2 作業報告書一覧

#### 4.2.1 表示項目
- 作業日
- 現場名
- 作業者名
- ステータス（下書き/提出済み/承認済み/却下）
- 作成日時

#### 4.2.2 フィルター
- 期間（日付範囲）
- 現場
- 作業者
- ステータス

#### 4.2.3 ソート
- 作業日（昇順/降順）
- 作成日（昇順/降順）

#### 4.2.4 アクション
- 詳細表示
- 編集（draft状態のみ）
- 削除（作成者または管理者のみ）
- PDF出力

### 4.3 作業報告書詳細

#### 4.3.1 表示内容
- 全項目の表示
- 写真ギャラリー
- 添付ファイル一覧
- 承認フロー履歴

#### 4.3.2 アクション
- 編集
- 提出（承認フロー有効時）
- 承認/却下（承認者のみ）
- PDF出力
- 削除

### 4.4 承認フロー

#### 4.4.1 ステータス遷移
```
draft（下書き）
  ↓ 提出
submitted（提出済み）
  ↓ 承認        ↓ 却下
approved（承認済み） rejected（却下）
  ↓ 再提出
submitted（提出済み）
```

#### 4.4.2 承認権限
- leader: 自現場の報告書を承認可能
- admin: 全報告書を承認可能

### 4.5 PDF出力（表形式テンプレート）

#### 4.5.1 基本仕様
- **サイズ**: A4（210mm × 297mm）
- **フォント**: Noto Sans JP（日本語対応）
- **ライブラリ**: jsPDF + jspdf-autotable

#### 4.5.2 テンプレート種類
将来的に3種類のテンプレートを用意予定：
1. **標準版（Standard）**: 基本的な表形式レイアウト ← まず実装
2. **詳細版（Detailed）**: より詳細な情報を含む
3. **簡易版（Simple）**: シンプルな一覧形式

#### 4.5.3 標準版テンプレートレイアウト

**ヘッダー部分**:
```
┌─────────────────────────────────────────────────────┐
│                    作業報告書                        │
├─────────────────────────────────────────────────────┤
│ 作成日: 2025年12月5日                                 │
├──────────────────────┬──────────────────────────────┤
│ 【取引先情報】        │ 【自社情報】                  │
│ 社名: ○○建設株式会社  │ 社名: A建設工業株式会社       │
│ 住所: 東京都...       │ 〒123-4567                   │
│ 現場名: 新宿オフィス... │ 住所: 東京都...             │
│                      │ TEL: 03-1234-5678            │
│                      │ FAX: 03-1234-5679（任意）     │
│                      │ 担当者: 山田太郎              │
│                      │ [角印画像]（右上に配置）      │
└──────────────────────┴──────────────────────────────┘
```

**本文部分（表形式）**:
```
┌─────────────────────────────────────────────────────┐
│ 【作業内容】                                          │
├────┬──────┬────┬────┬────┬─────────────────┤
│日付 │天気   │作業員│工数 │進捗│ 作業内容          │
├────┼──────┼────┼────┼────┼─────────────────┤
│12/5 │晴れ   │山田  │8h  │60% │基礎工事を実施...  │
│     │      │佐藤  │8h  │    │                  │
└────┴──────┴────┴────┴────┴─────────────────┘

┌─────────────────────────────────────────────────────┐
│ 【使用資材】                                          │
├─────────────────────────────────────────────────────┤
│ コンクリート 5m³、鉄筋 D13 100本                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 【使用道具】                                          │
├─────────────────────────────────────────────────────┤
│ 電動ドリル、サンダー、水平器                          │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 【備考】                                             │
├─────────────────────────────────────────────────────┤
│ 特記事項があればここに記載                            │
└─────────────────────────────────────────────────────┘
```

**フッター部分**:
```
┌─────────────────────────────────────────────────────┐
│ 作成者: 山田太郎                    ページ: 1/2      │
│ 作成日時: 2025年12月5日 14:30                        │
└─────────────────────────────────────────────────────┘
```

#### 4.5.4 必要なデータ

**取引先情報**:
- 社名（現場に紐づく取引先名）
- 住所
- 現場名

**自社情報**:
- 社名（organizations.name）
- 郵便番号（organizations.postal_code）
- 住所（organizations.address）
- 電話番号（organizations.phone）
- FAX（organizations.fax）※オプション
- 担当者名（作成者の名前）
- 角印画像（organizations.company_seal_url）※将来実装

#### 4.5.5 出力オプション
- 単一報告書
- 期間指定一括出力（将来実装）

#### 4.5.6 実装計画

**Phase 1: データベース準備**
1. organizationsテーブルに企業情報カラム追加
   - postal_code TEXT
   - address TEXT
   - phone TEXT
   - fax TEXT
   - company_seal_url TEXT（角印URL、将来実装）

**Phase 2: 標準版テンプレート実装**
1. jspdf-autotableを使用した表形式PDF生成
2. ヘッダー部分（タイトル、作成日、取引先情報、自社情報）
3. 本文部分（作業内容テーブル、使用資材、使用道具、備考）
4. フッター部分（作成者、作成日時、ページ番号）

**Phase 3: テンプレート選択機能**
1. sitesテーブルに default_report_template カラム追加
2. 3種類のテンプレート実装（標準版、詳細版、簡易版）
3. 現場設定でテンプレート選択UI

**Phase 4: 角印機能**
1. 角印画像アップロード機能
2. 角印自動生成機能（Canvas API使用）
3. PDFへの角印埋め込み

---

## 5. 画面設計

### 5.1 作業報告書一覧ページ (`/work-reports`)

```
┌─────────────────────────────────────────────┐
│ 作業報告書                           [新規作成] │
├─────────────────────────────────────────────┤
│ 🔍 検索・フィルター                            │
│ 期間: [____] ～ [____]  現場: [全て▼]        │
│ 作業者: [全て▼]  ステータス: [全て▼]          │
├─────────────────────────────────────────────┤
│ 📋 報告書一覧                                 │
│ ┌───────────────────────────────────────┐   │
│ │ 2025-12-05 | A建設現場 | 山田太郎        │   │
│ │ [下書き] [編集] [削除]                    │   │
│ └───────────────────────────────────────┘   │
│ ┌───────────────────────────────────────┐   │
│ │ 2025-12-04 | B塗装現場 | 佐藤次郎        │   │
│ │ [承認済み] [詳細] [PDF]                  │   │
│ └───────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 5.2 作業報告書作成/編集ページ (`/work-reports/new`)

```
┌─────────────────────────────────────────────┐
│ 作業報告書作成                                │
├─────────────────────────────────────────────┤
│ 📅 基本情報                                   │
│ 作業日: [2025-12-05]                         │
│ 現場: [A建設現場 ▼]                          │
│ 作業者: [☑ 山田太郎 ☑ 鈴木花子]              │
│ 天候: [○ 晴れ ○ 曇り ○ 雨 ○ 雪]             │
│                                              │
│ ⏰ 作業時間                                   │
│ 開始: [09:00]  終了: [17:00]  休憩: [60]分   │
│                                              │
│ 📝 作業内容                                   │
│ ┌───────────────────────────────────────┐   │
│ │ 2階リビングの内装工事を実施...            │   │
│ │                                          │   │
│ └───────────────────────────────────────┘   │
│                                              │
│ 📍 作業詳細（オプション）                      │
│ 作業箇所: [2階リビング]                       │
│ 進捗率: [━━━━━●────] 60%                     │
│                                              │
│ 📷 写真添付                                   │
│ [作業前] [+] [作業中] [+] [作業後] [+]        │
│                                              │
│ 📎 資料添付                                   │
│ [図面をアップロード] [+]                       │
│                                              │
│ [下書き保存] [提出]                           │
└─────────────────────────────────────────────┘
```

### 5.3 作業報告書詳細ページ (`/work-reports/[id]`)

```
┌─────────────────────────────────────────────┐
│ 作業報告書 - 2025-12-05                [編集] │
├─────────────────────────────────────────────┤
│ 現場: A建設現場                               │
│ 作業者: 山田太郎、鈴木花子                     │
│ 天候: 晴れ                                    │
│ 作業時間: 09:00 - 17:00 (休憩60分)            │
│                                              │
│ 作業内容:                                     │
│ 2階リビングの内装工事を実施...                │
│                                              │
│ 📷 写真 (6枚)                                 │
│ [写真1] [写真2] [写真3] ...                   │
│                                              │
│ 📎 添付資料 (2件)                             │
│ 📄 図面_A-001.pdf                            │
│ 📄 仕様書.xlsx                               │
│                                              │
│ ステータス: 承認済み                          │
│ 承認者: 田中部長 (2025-12-05 18:00)          │
│                                              │
│ [PDF出力] [削除]                              │
└─────────────────────────────────────────────┘
```

---

## 6. 実装フェーズ

### Phase 1: MVP（1週間）✅ 優先度: 最高

#### タスク
1. データベーススキーマ設計
2. マイグレーションファイル作成
3. TypeScript型定義作成
4. 作業報告書作成画面（コア項目のみ）
5. 作業報告書一覧画面
6. 作業報告書詳細画面
7. 基本的なPDF出力

#### 実装内容
- コア項目のみ（作業日、現場、作業者、作業内容、天候、作業時間）
- シンプルなCRUD操作
- 基本的な一覧・詳細表示
- シンプルなPDF出力

---

### Phase 2: 拡張機能（1週間）

#### タスク
1. よく使う項目の追加実装
2. 写真アップロード機能（Supabase Storage）
3. 資料アップロード機能
4. 組織設定画面（項目のON/OFF）
5. フィルター・検索機能強化

#### 実装内容
- 作業箇所、進捗率、使用材料、使用道具
- 写真アップロード（最大10枚）
- 図面・資料アップロード（最大5ファイル）
- 組織ごとの表示項目カスタマイズ

---

### Phase 3: カスタマイズ（1週間）

#### タスク
1. カスタムフィールド定義UI
2. 動的フォーム生成
3. カスタムフィールドのPDF出力対応
4. テンプレート機能

#### 実装内容
- 管理画面でカスタムフィールド定義
- 業種別テンプレート
- 過去データのコピー機能

---

### Phase 4: 高度な機能（1週間）

#### タスク
1. 承認フロー実装
2. 承認通知機能
3. 月次/週次レポート集計
4. ダッシュボード統合

#### 実装内容
- 提出・承認・却下フロー
- メール/アプリ内通知
- 集計レポート（現場別、作業者別）
- ダッシュボードでの最近の報告表示

---

## 7. 技術スタック

### 7.1 バックエンド
- **データベース**: PostgreSQL (Supabase)
- **ストレージ**: Supabase Storage
- **認証**: Supabase Auth

### 7.2 フロントエンド
- **フレームワーク**: Next.js 15 (App Router)
- **言語**: TypeScript
- **スタイル**: Tailwind CSS
- **フォーム**: React Hook Form
- **PDF生成**: @react-pdf/renderer or jsPDF

### 7.3 ファイルアップロード
- **サポート形式**:
  - 画像: JPEG, PNG, HEIC
  - ドキュメント: PDF, DOC, DOCX, XLS, XLSX
  - 図面: PDF, DWG, DXF
- **最大サイズ**: 10MB/ファイル（組織設定で変更可能）
- **保存先**: Supabase Storage (`work-report-photos/`, `work-report-attachments/`)

---

## 8. セキュリティ

### 8.1 アクセス制御
- RLS による組織データ分離
- 作成者本人または管理者のみ編集・削除可能
- 承認フロー有効時は提出後の編集不可

### 8.2 ファイルアップロード
- ファイルタイプ検証
- ファイルサイズ制限
- ウイルススキャン（将来的に検討）

### 8.3 監査ログ
- 作成・編集・削除・承認・却下の履歴記録
- audit_logs テーブルに記録

---

## 9. パフォーマンス

### 9.1 最適化
- 画像の自動リサイズ・圧縮
- サムネイル生成
- ページネーション（一覧表示）
- 遅延ロード（画像・添付ファイル）

### 9.2 キャッシング
- 現場一覧のキャッシュ
- 作業者一覧のキャッシュ

---

## 10. 将来的な拡張

### 10.1 AI機能
- 作業内容の自動要約
- 写真からのテキスト抽出
- 異常検知（進捗遅れ、安全問題頻発等）

### 10.2 外部連携
- 会計ソフトとの連携
- 勤怠管理システムとの連携
- 工程管理システムとの連携

### 10.3 モバイルアプリ
- ネイティブアプリ化
- オフライン対応
- カメラ直接起動

---

## 11. PDF生成の共通ヘルパー関数

### 11.1 概要

複数の作業報告書テンプレートに対応するため、PDF生成の共通ロジックをヘルパー関数として実装しています。

### 11.2 実装ファイル

**`lib/pdf/helpers.ts`**

### 11.3 提供される関数

#### 11.3.1 `drawCompanyName()`

自社名を描画する関数。会社名が長い場合（指定した最大幅を超える場合）、会社種別を自動的に改行して小さいフォントで表示します。

**サポートされる会社種別**:
- 株式会社
- 有限会社
- 合同会社
- 合資会社
- 合名会社
- 一般社団法人
- 一般財団法人
- 公益社団法人
- 公益財団法人

**パラメータ**:
```typescript
drawCompanyName(
  doc: jsPDF,              // jsPDFインスタンス
  companyName: string,     // 会社名
  x: number,               // X座標
  startY: number,          // 開始Y座標
  maxWidth: number = 50,   // 最大幅（mm）。これを超える場合に改行
  mainFontSize: number = 9, // メイン部分のフォントサイズ
  companyTypeFontSize: number = 7 // 会社種別のフォントサイズ
): number // 次の描画開始Y座標を返す
```

**使用例**:
```typescript
companyInfoY = drawCompanyName(doc, organization.name, companyInfoX, companyInfoY, 50, 9, 7)
```

#### 11.3.2 `getTableConfig()`

autoTableの共通スタイル設定を返す関数。ページブレーク制御、線の色、フォント設定などを統一します。

**テーブルタイプ**:
- `'info'`: 作業日・作業人数等の情報テーブル（改ページ避ける）
- `'list'`: 作業員リスト等のテーブル（ヘッダー避ける、行は自動）
- `'content'`: 作業内容・使用資材等の長文テーブル（自動改ページ）
- `'remarks'`: 特記事項・備考等の固定高さテーブル（改ページ避ける）

**パラメータ**:
```typescript
getTableConfig(options: {
  type: 'info' | 'list' | 'content' | 'remarks',
  customStyles?: Partial<UserConfig['styles']>,
  customHeadStyles?: Partial<UserConfig['headStyles']>,
  customConfig?: Partial<UserConfig>
}): Partial<UserConfig>
```

**使用例**:
```typescript
autoTable(doc, {
  ...getTableConfig({ type: 'info' }),
  startY: yPos,
  body: [[...]],
  columnStyles: { ... }
})
```

### 11.4 ページブレーク制御の詳細

各テーブルタイプごとに適切なページブレーク設定が自動的に適用されます:

| タイプ | pageBreak | rowPageBreak | 用途 |
|--------|-----------|--------------|------|
| info | avoid | avoid | 小さなテーブル全体を1ページに収める |
| list | avoid | auto | ヘッダーと最初の行を一緒に配置、行が多い場合は自動改ページ |
| content | auto | auto | 長文が入力された場合、自然に次ページに続く |
| remarks | avoid | avoid | 最後のセクションを1ページに収める |

### 11.5 新しいテンプレートの実装方法

新しい作業報告書テンプレートを作成する際は、以下のヘルパー関数を使用してください:

```typescript
import { drawCompanyName, getTableConfig } from '@/lib/pdf/helpers'

// 自社名の描画
companyInfoY = drawCompanyName(doc, organization.name, x, y, 50, 9, 7)

// テーブルの作成
autoTable(doc, {
  ...getTableConfig({ type: 'info' }), // または 'list', 'content', 'remarks'
  startY: yPos,
  // 以下、テーブル固有の設定
  head: [['ヘッダー']],
  body: [['本文']],
  columnStyles: { ... }
})
```

これにより、すべてのテンプレートで一貫したスタイルとページブレーク動作を保証できます。

---

---

## 7. 個人印鑑機能（シャチハタ風）

### 7.1 概要

作業報告書PDFに捺印するための個人印鑑を自動生成する機能。

### 7.2 データベース設計

**usersテーブルへの追加カラム**:
- `personal_seal_data TEXT` - Base64エンコードされたSVG印鑑画像データ

### 7.3 印鑑生成ロジック

**共通ヘルパー関数**: `lib/personal-seal/generate-seal.ts`

```typescript
generatePersonalSeal(surname: string, size?: number): string
```

**仕様**:
- 入力: 苗字（1〜4文字）
- 出力: Base64エンコードされたSVG Data URL
- デザイン: 円形、赤色（#CC0000）、縦書き
- フォント: Noto Serif JP
- サイズ: デフォルト120px（可変）

### 7.4 アカウント設定UI

**場所**: `/settings` （アカウント設定ページ）

**機能**:
1. 苗字入力フィールド（1〜4文字）
2. 「印鑑を生成」ボタン
3. プレビュー表示（生成後）
4. 「印鑑を削除」ボタン

**APIエンドポイント**:
- `PUT /api/users/personal-seal` - 印鑑生成・保存
- `DELETE /api/users/personal-seal` - 印鑑削除

### 7.5 PDF表示

**表示箇所**:
- **担当印**: 作成者（created_by）の印鑑
- **承認印**: 承認者（approved_by）の印鑑

**表示条件**:
- 担当印: 常に表示（印鑑データがある場合）
- 承認印: 承認済み（approved）ステータスの場合のみ表示

**実装**: `app/api/work-reports/[id]/pdf/route.ts`
- 作成者と承認者の印鑑データを取得
- jsPDFの`addImage()`でSVG画像を担当印・承認印ボックス内に配置

### 7.6 注意事項

- 印鑑データはBase64エンコードされたSVG形式で保存
- 他のPDFテンプレート（将来実装）でも同じ印鑑データを再利用可能
- 印鑑生成ヘルパー関数は共通化されており、他の機能でも利用可能

---

## 8. カスタムフィールド機能（Phase 2実装完了）

### 8.1 概要

管理者が自由に項目を追加できる柔軟なカスタムフィールド機能。組織全体または現場ごとに独自の入力項目を定義可能。

### 8.2 データベース設計

#### work_report_custom_fields テーブル

**カラム**:
- `id UUID` - 主キー
- `organization_id UUID` - 組織ID（必須）
- `site_id UUID` - 現場ID（NULL=組織全体、指定=現場固有）
- `field_key TEXT` - フィールド識別子（例: custom_weather）
- `field_label TEXT` - 表示名（例: 天気）
- `field_type TEXT` - フィールドタイプ
  - `text` - テキスト（1行）
  - `textarea` - テキスト（複数行）
  - `number` - 数値
  - `date` - 日付
  - `select` - 選択肢（ドロップダウン）
  - `checkbox` - チェックボックス
- `field_options JSONB` - 選択肢配列（select/checkboxのみ）
- `display_order INTEGER` - 表示順序
- `is_required BOOLEAN` - 必須フラグ
- `placeholder TEXT` - プレースホルダー
- `help_text TEXT` - ヘルプテキスト

**ユニーク制約**: `(organization_id, site_id, field_key)`

#### work_reports.custom_fields_data JSONB

カスタムフィールドの値を保存（スキーマレス設計）

**例**:
```json
{
  "custom_weather": "晴れ",
  "custom_equipment_count": 5,
  "custom_safety_check": ["ヘルメット", "安全帯", "保護メガネ"]
}
```

### 8.3 API仕様

#### GET /api/work-reports/custom-fields?site_id=xxx
- カスタムフィールド定義一覧取得
- 組織全体 + 現場固有フィールドを返す

#### POST /api/work-reports/custom-fields
- カスタムフィールド定義作成
- 権限: admin/super_adminのみ

#### PUT /api/work-reports/custom-fields/[id]
- カスタムフィールド定義更新
- 権限: admin/super_adminのみ

#### DELETE /api/work-reports/custom-fields/[id]
- カスタムフィールド定義削除
- 権限: admin/super_adminのみ

### 8.4 管理UI

**場所**: `/work-reports/settings` （作業報告書設定ページ）

**機能**:
1. カスタムフィールド一覧表示
   - フィールド名、タイプ、必須/任意、選択肢
2. 新規フィールド追加フォーム
   - フィールドキー、ラベル、タイプ選択
   - select/checkboxの場合は選択肢入力（カンマ区切り）
   - プレースホルダー、ヘルプテキスト、必須フラグ
3. フィールド削除機能

**コンポーネント**: `CustomFieldsManager.tsx`

### 8.5 動的フォーム生成

**場所**: `/work-reports/new` （作業報告書作成ページ）

**機能**:
1. カスタムフィールド定義を取得
2. フィールドタイプに応じた入力コンポーネントを動的生成
3. バリデーション（必須フィールド）
4. データをJSONB形式でcustom_fields_dataに保存

**コンポーネント**: `CustomFieldInput.tsx`

### 8.6 PDF表示

**ヘルパー関数**: `lib/pdf/helpers.ts` の `drawCustomFields()`

**仕様**:
- カスタムフィールドがある場合、特記事項・備考の後に自動表示
- テーブル形式（2列: 項目名 | 値）
- 改ページ設定: `type: 'content'` （自動改ページ許可）
- チェックボックス値は「,」区切りで表示
- 日付はYYYY-MM-DD形式

**実装**: `app/api/work-reports/[id]/pdf/route.ts`
```typescript
// カスタムフィールド定義を取得
const { data: customFieldDefinitions } = await supabase
  .from('work_report_custom_fields')
  .select('*')
  .eq('organization_id', userData.organization_id)
  .or(`site_id.eq.${report.site_id},site_id.is.null`)
  .order('display_order', { ascending: true })

// PDF描画
if (customFieldDefinitions && customFieldDefinitions.length > 0) {
  yPos = drawCustomFields(
    doc,
    autoTable,
    customFieldDefinitions,
    report.custom_fields_data || {},
    yPos
  )
}
```

### 8.7 技術仕様

- **データ保存**: JSONB（柔軟なスキーマレス設計）
- **スコープ**: 組織全体（site_id=NULL）または現場固有（site_id指定）
- **権限**: 設定はadmin/super_adminのみ、入力は全ユーザー
- **改ページ対応**: PDF生成時にgetTableConfig()の改ページ設定を使用

### 8.8 注意事項

- カスタムフィールドのfield_keyは変更不可（データ整合性のため）
- 既存データへの影響を避けるため、削除は慎重に行う
- 大量のカスタムフィールド（50個以上）はPDF表示が長くなるため注意
- チェックボックスタイプは配列で保存されるため、検索時は適切にJSONBクエリを使用

---

## まとめ

本仕様書では、ハイブリッド方式による柔軟かつ使いやすい作業報告書機能を定義しました。

### 重要ポイント
1. ✅ 業種による違いに対応（カスタムフィールド機能実装完了）
2. ✅ シンプルで使いやすいUI（コア項目のみでも使える）
3. ✅ 段階的実装（MVPから高度な機能まで）
4. ✅ 写真・資料の充実したサポート
5. ✅ 承認フローによる品質管理
6. ✅ PDF生成の共通ヘルパー関数による保守性向上
7. ✅ 個人印鑑の自動生成機能（シャチハタ風）
8. ✅ カスタムフィールド機能（動的フォーム・PDF反映）

この設計により、建築業をはじめ様々な現場系業種に対応できる汎用的な作業報告書システムを構築できます。
