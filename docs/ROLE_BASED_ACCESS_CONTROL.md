# 役割別アクセス制御（RBAC）仕様書

## 目次

1. [概要](#1-概要)
2. [ユーザー役割定義](#2-ユーザー役割定義)
3. [全機能一覧と開発フェーズ](#3-全機能一覧と開発フェーズ)
4. [役割別アクセス権限マトリクス](#4-役割別アクセス権限マトリクス)
5. [画面別アクセス制御](#5-画面別アクセス制御)
6. [API エンドポイント権限](#6-api-エンドポイント権限)
7. [実装ガイドライン](#7-実装ガイドライン)
8. [セキュリティ考慮事項](#8-セキュリティ考慮事項)

---

## 1. 概要

### 1.1 目的

Field Tool Manager システムにおいて、ユーザーの役割（Role）に基づいて機能へのアクセスを制御し、セキュリティと業務効率を両立させる。

### 1.2 基本原則

- **最小権限の原則**: 各役割は業務遂行に必要最小限の権限のみを持つ
- **職務分離**: 重要な操作は複数の役割による承認を必要とする
- **監査可能性**: すべてのアクセスと操作はログに記録される

### 1.3 権限レベル

各機能に対して以下の権限レベルを定義：

- **None (×)**: アクセス不可
- **View (R)**: 閲覧のみ
- **Limited (L)**: 制限付き操作（自分のデータのみ等）
- **Edit (E)**: 編集可能
- **Full (F)**: フル権限（作成・編集・削除）
- **Admin (A)**: 管理者権限（設定変更含む）

---

## 2. ユーザー役割定義

### 2.1 役割一覧

#### 顧客向けアプリケーション（app.fieldtool.com）

| 役割ID | 役割名 | 説明 | 主な利用者 |
|--------|--------|------|------------|
| `staff` | 現場スタッフ | 道具の持出・返却を行う現場作業員 | 現場作業員、協力業者 |
| `leader` | リーダー/管理職 | チーム管理とレポート確認を行う管理者 | 現場監督、チームリーダー、部門長 |
| `admin` | システム管理者 | 組織全体の管理を行う管理者 | IT管理者、経営層 |

#### SaaS管理画面（admin.fieldtool.com）※完全分離

| 役割ID | 役割名 | 説明 | 主な利用者 |
|--------|--------|------|------------|
| `super_admin` | スーパー管理者 | SaaS全体を管理する開発者 | サービス提供者（あなた） |

### 2.2 役割の詳細

#### staff（現場スタッフ）
- **主要業務**: QRコードスキャン、道具の持出・返却
- **アクセス範囲**: 自分の操作履歴、基本的な道具情報
- **制限事項**: 他人のデータ閲覧不可、システム設定変更不可

#### leader（リーダー/管理職）
- **主要業務**: チーム管理、在庫管理、レポート生成
- **アクセス範囲**: チーム全体のデータ、詳細なレポート
- **制限事項**: システム設定、請求管理は不可

#### admin（システム管理者）
- **主要業務**: ユーザー管理、組織設定、機能設定
- **アクセス範囲**: 組織内の全データ、システム設定
- **制限事項**: 他組織のデータアクセス不可

#### super_admin（スーパー管理者）※完全分離システム
- **アクセスURL**: admin.fieldtool.com（顧客向けとは完全分離）
- **主要業務**: 顧客管理、請求管理、システム保守
- **アクセス範囲**: 全組織、全データ、全設定
- **認証方式**: 別認証システム（2FA必須、IP制限推奨）
- **制限事項**: なし（最高権限）

---

## 3. 全機能一覧と開発フェーズ

### 3.1 基本機能（Phase 1-2: 初期リリース）

| 機能ID | 機能名 | 説明 | 画面/API |
|--------|--------|------|----------|
| F001 | ログイン/ログアウト | 認証機能 | 画面・API |
| F002 | パスワード変更 | 自分のパスワード変更 | 画面・API |
| F003 | プロフィール編集 | 自分の情報編集 | 画面・API |
| F004 | ダッシュボード表示 | ホーム画面 | 画面 |
| F005 | QRコードスキャン | 道具QR読み取り | 画面・API |
| F006 | 道具持出登録 | チェックアウト | API |
| F007 | 道具返却登録 | チェックイン | API |
| F008 | 道具検索 | 道具の検索・一覧 | 画面・API |
| F009 | 道具詳細表示 | 道具情報閲覧 | 画面・API |
| F010 | 道具登録 | 新規道具追加 | 画面・API |
| F011 | 道具編集 | 道具情報更新 | 画面・API |
| F012 | 道具削除 | 道具の削除 | API |
| F013 | 在庫確認 | 在庫状況表示 | 画面・API |
| F014 | 所在確認 | 道具の現在位置 | 画面・API |
| F015 | 移動履歴表示 | 移動記録閲覧 | 画面・API |
| F016 | QRコード生成 | QRラベル作成 | 画面・API |
| F017 | QRコード印刷 | ラベル印刷 | 画面 |

### 3.2 拡張機能（Phase 3: 3ヶ月後）

| 機能ID | 機能名 | 説明 | 画面/API |
|--------|--------|------|----------|
| F018 | カテゴリ管理 | 道具カテゴリ設定 | 画面・API |
| F019 | 場所管理 | 現場・倉庫登録 | 画面・API |
| F020 | ユーザー一覧 | ユーザー表示 | 画面・API |
| F021 | ユーザー登録 | 新規ユーザー追加 | 画面・API |
| F022 | ユーザー編集 | ユーザー情報更新 | 画面・API |
| F023 | ユーザー削除 | ユーザー無効化 | API |
| F024 | 役割変更 | ユーザー権限設定 | 画面・API |
| F025 | チーム管理 | チーム作成・編集 | 画面・API |
| F026 | 基本レポート | 在庫・利用レポート | 画面・API |
| F027 | 詳細レポート | 分析レポート | 画面・API |
| F028 | レポートエクスポート | Excel/PDF出力 | API |
| F029 | 在庫アラート設定 | 最小在庫設定 | 画面・API |
| F030 | 通知設定 | メール通知設定 | 画面・API |
| F031 | 一括インポート | CSV一括登録 | 画面・API |
| F032 | 一括エクスポート | データ出力 | API |
| F033 | カスタムフィールド定義 | 追加項目設定 | 画面・API |
| F034 | カスタムフィールド編集 | 追加項目値編集 | 画面・API |

### 3.3 管理機能（Phase 4: 6ヶ月後）

| 機能ID | 機能名 | 説明 | 画面/API |
|--------|--------|------|----------|
| F035 | 組織設定 | 組織情報管理 | 画面・API |
| F036 | セキュリティ設定 | パスワードポリシー等 | 画面・API |
| F037 | 監査ログ閲覧 | 操作履歴確認 | 画面・API |
| F038 | 監査ログエクスポート | ログ出力 | API |
| F039 | API キー管理 | API認証設定 | 画面・API |
| F040 | Webhook設定 | 外部連携設定 | 画面・API |
| F041 | バックアップ実行 | データバックアップ | API |
| F042 | リストア実行 | データ復元 | API |
| F043 | 機能フラグ表示 | 有効機能一覧 | 画面・API |
| F044 | 機能フラグ変更 | 機能ON/OFF | API |
| F045 | 利用統計表示 | 利用状況分析 | 画面・API |
| F046 | システムヘルス | システム状態 | 画面・API |

### 3.4 SaaS管理機能（Phase 4: スーパー管理者専用）

| 機能ID | 機能名 | 説明 | 画面/API |
|--------|--------|------|----------|
| F047 | 顧客組織一覧 | 全顧客表示 | 画面・API |
| F048 | 顧客組織登録 | 新規顧客追加 | 画面・API |
| F049 | 顧客組織編集 | 顧客情報更新 | 画面・API |
| F050 | 顧客組織停止 | サービス停止 | API |
| F051 | 契約管理 | 契約情報管理 | 画面・API |
| F052 | プラン変更 | 料金プラン変更 | 画面・API |
| F053 | 請求書発行 | 月次請求書作成 | 画面・API |
| F054 | 入金管理 | 支払い記録 | 画面・API |
| F055 | 請求書一覧 | 請求履歴 | 画面・API |
| F056 | 売上レポート | 収益分析 | 画面・API |
| F057 | 顧客別機能設定 | 機能カスタマイズ | 画面・API |
| F058 | システム全体監視 | 全組織監視 | 画面・API |
| F059 | エラーログ確認 | システムエラー | 画面・API |
| F060 | データベース管理 | DB保守 | API |

### 3.5 高度な機能（Phase 5: 将来実装）

| 機能ID | 機能名 | 説明 | 画面/API |
|--------|--------|------|----------|
| F061 | 予約管理 | 道具予約機能 | 画面・API |
| F062 | メンテナンス管理 | 点検・修理記録 | 画面・API |
| F063 | 校正管理 | 校正期限管理 | 画面・API |
| F064 | 減価償却計算 | 資産管理 | 画面・API |
| F065 | レンタル管理 | 外部レンタル品 | 画面・API |
| F066 | コスト分析 | 原価管理 | 画面・API |
| F067 | AI需要予測 | 在庫最適化 | 画面・API |
| F068 | モバイルアプリ | ネイティブアプリ | アプリ |
| F069 | オフライン対応 | オフライン機能 | 画面・API |
| F070 | 多言語対応 | 国際化 | 画面 |
| F071 | Slack連携 | Slack通知 | API |
| F072 | Teams連携 | Teams通知 | API |
| F073 | カレンダー連携 | スケジュール同期 | API |
| F074 | 外部API提供 | サードパーティ連携 | API |
| F075 | ダッシュボードカスタマイズ | ウィジェット配置 | 画面・API |

---

## 4. 役割別アクセス権限マトリクス

### 4.1 基本機能権限（顧客向けアプリケーション）

| 機能ID | 機能名 | staff | leader | admin |
|--------|--------|-------|--------|-------|
| F001 | ログイン/ログアウト | F | F | F |
| F002 | パスワード変更 | L | L | L |
| F003 | プロフィール編集 | L | L | L |
| F004 | ダッシュボード表示 | L | F | F |
| F005 | QRコードスキャン | F | F | F |
| F006 | 道具持出登録 | F | F | F |
| F007 | 道具返却登録 | F | F | F |
| F008 | 道具検索 | R | F | F |
| F009 | 道具詳細表示 | R | F | F |
| F010 | 道具登録 | × | F | F |
| F011 | 道具編集 | × | E | F |
| F012 | 道具削除 | × | × | F |
| F013 | 在庫確認 | R | F | F |
| F014 | 所在確認 | R | F | F |
| F015 | 移動履歴表示 | L | F | F |
| F016 | QRコード生成 | × | F | F |
| F017 | QRコード印刷 | × | F | F |

### 4.2 拡張機能権限

| 機能ID | 機能名 | staff | leader | admin | super_admin |
|--------|--------|-------|--------|-------|-------------|
| F018 | カテゴリ管理 | × | R | F | F |
| F019 | 場所管理 | × | R | F | F |
| F020 | ユーザー一覧 | × | R | F | F |
| F021 | ユーザー登録 | × | × | F | F |
| F022 | ユーザー編集 | × | × | F | F |
| F023 | ユーザー削除 | × | × | F | F |
| F024 | 役割変更 | × | × | F | F |
| F025 | チーム管理 | × | F | F | F |
| F026 | 基本レポート | × | F | F | F |
| F027 | 詳細レポート | × | F | F | F |
| F028 | レポートエクスポート | × | F | F | F |
| F029 | 在庫アラート設定 | × | E | F | F |
| F030 | 通知設定 | L | F | F | F |
| F031 | 一括インポート | × | F | F | F |
| F032 | 一括エクスポート | × | F | F | F |
| F033 | カスタムフィールド定義 | × | × | F | F |
| F034 | カスタムフィールド編集 | × | E | F | F |

### 4.3 管理機能権限

| 機能ID | 機能名 | staff | leader | admin | super_admin |
|--------|--------|-------|--------|-------|-------------|
| F035 | 組織設定 | × | × | F | F |
| F036 | セキュリティ設定 | × | × | F | F |
| F037 | 監査ログ閲覧 | × | × | F | F |
| F038 | 監査ログエクスポート | × | × | F | F |
| F039 | API キー管理 | × | × | F | F |
| F040 | Webhook設定 | × | × | F | F |
| F041 | バックアップ実行 | × | × | F | F |
| F042 | リストア実行 | × | × | A | F |
| F043 | 機能フラグ表示 | × | × | R | F |
| F044 | 機能フラグ変更 | × | × | × | F |
| F045 | 利用統計表示 | × | R | F | F |
| F046 | システムヘルス | × | × | R | F |

### 4.4 SaaS管理機能（admin.fieldtool.com 専用）

**※これらの機能は完全に分離されたSaaS管理画面でのみ利用可能**

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| F047 | 顧客組織一覧 | 全顧客組織の管理 |
| F048 | 顧客組織登録 | 新規顧客の追加 |
| F049 | 顧客組織編集 | 顧客情報の編集 |
| F050 | 顧客組織停止 | アカウント停止処理 |
| F051 | 契約管理 | 契約内容の管理 |
| F052 | プラン変更 | 料金プランの変更 |
| F053 | 請求書発行 | 月次請求書の発行 |
| F054 | 入金管理 | 入金確認と記録 |
| F055 | 請求書一覧 | 請求履歴の確認 |
| F056 | 売上レポート | 売上分析レポート |
| F057 | 顧客別機能設定 | 機能の有効/無効設定 |
| F058 | システム全体監視 | インフラ監視 |
| F059 | エラーログ確認 | 全システムのエラー確認 |
| F060 | データベース管理 | DB保守・最適化 |

---

## 5. 画面別アクセス制御

### 5.1 役割別メインナビゲーション

#### staff（現場スタッフ）
```
📱 モバイル最適化レイアウト
├── 🏠 ホーム（簡易ダッシュボード）
├── 📷 QRスキャン ★メイン機能
├── 🔍 道具検索
├── 📋 自分の履歴
└── 👤 プロフィール
```

#### leader（リーダー/管理職）
```
💻 タブレット/PC最適化レイアウト
├── 📊 ダッシュボード（詳細）
├── 📦 道具管理
│   ├── 一覧・検索
│   ├── 登録・編集
│   ├── カテゴリ管理
│   └── QRコード管理
├── 📍 在庫・所在管理
│   ├── 在庫状況
│   ├── 所在マップ
│   └── アラート設定
├── 👥 チーム管理
│   ├── メンバー一覧
│   └── 移動履歴
├── 📈 レポート
│   ├── 在庫レポート
│   ├── 利用分析
│   └── エクスポート
└── ⚙️ 設定
```

#### admin（システム管理者）
```
💻 PC最適化レイアウト
├── 🎛️ 管理ダッシュボード
├── 📦 道具管理（フル機能）
├── 📍 在庫・所在管理
├── 👥 ユーザー管理
│   ├── ユーザー一覧
│   ├── ユーザー登録
│   ├── 役割管理
│   └── アクセス権限
├── 🏢 組織管理
│   ├── 組織設定
│   ├── セキュリティ設定
│   └── 機能フラグ
├── 📈 レポート・分析
├── 📋 監査ログ
├── 🔧 システム設定
│   ├── API管理
│   ├── Webhook
│   └── バックアップ
└── ❓ ヘルプ・サポート
```

### 5.3 SaaS管理画面（admin.fieldtool.com）※完全分離

#### super_admin専用管理コンソール
```
💻 SaaS管理ダッシュボード
├── 🏢 顧客管理
│   ├── 組織一覧（検索・フィルター付）
│   ├── 新規顧客登録
│   ├── 顧客詳細・編集
│   └── アカウント停止/再開
├── 📄 契約管理
│   ├── 契約一覧
│   ├── 契約新規作成
│   ├── プラン変更
│   └── 契約更新/解約
├── 💰 請求・入金管理
│   ├── 請求書発行
│   ├── 請求書一覧
│   ├── 入金記録
│   └── 未払い管理
├── 📊 分析・レポート
│   ├── 売上分析
│   ├── 顧客利用統計
│   ├── MRR/チャーン率
│   └── エクスポート
├── 🎚️ 機能・設定管理
│   ├── 顧客別機能設定
│   ├── システム全体設定
│   └── メンテナンスモード
├── 🔍 監視・保守
│   ├── システムヘルス
│   ├── エラーログ
│   ├── パフォーマンス監視
│   └── アラート設定
└── 🗄️ データベース管理
    ├── バックアップ
    ├── データ移行
    └── 最適化
```

### 5.4 条件付き表示コンポーネント

```typescript
// 役割によるコンポーネント表示制御
interface RoleGateProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

// 使用例
<RoleGate allowedRoles={['leader', 'admin']}>
  <ReportSection />
</RoleGate>

<RoleGate allowedRoles={['admin', 'super_admin']}>
  <SystemSettings />
</RoleGate>
```

---

## 6. API エンドポイント権限

### 6.1 顧客向けアプリケーション API（app.fieldtool.com）

#### 認証・基本API

| エンドポイント | メソッド | staff | leader | admin |
|---------------|----------|-------|--------|-------|
| `/api/auth/login` | POST | ✓ | ✓ | ✓ |
| `/api/auth/logout` | POST | ✓ | ✓ | ✓ |
| `/api/auth/refresh` | POST | ✓ | ✓ | ✓ |
| `/api/users/me` | GET | ✓ | ✓ | ✓ |
| `/api/users/me` | PATCH | ✓ | ✓ | ✓ |
| `/api/users/me/password` | PUT | ✓ | ✓ | ✓ |

#### 道具管理API

| エンドポイント | メソッド | staff | leader | admin |
|---------------|----------|-------|--------|-------|
| `/api/tools` | GET | R | ✓ | ✓ |
| `/api/tools` | POST | × | ✓ | ✓ |
| `/api/tools/:id` | GET | R | ✓ | ✓ |
| `/api/tools/:id` | PUT | × | ✓ | ✓ |
| `/api/tools/:id` | DELETE | × | × | ✓ |
| `/api/tools/:id/checkout` | POST | ✓ | ✓ | ✓ |
| `/api/tools/:id/checkin` | POST | ✓ | ✓ | ✓ |
| `/api/tools/:id/qrcode` | GET | × | ✓ | ✓ |
| `/api/tools/import` | POST | × | ✓ | ✓ |
| `/api/tools/export` | GET | × | ✓ | ✓ |

#### ユーザー管理API

| エンドポイント | メソッド | staff | leader | admin |
|---------------|----------|-------|--------|-------|
| `/api/users` | GET | × | R | ✓ |
| `/api/users` | POST | × | × | ✓ |
| `/api/users/:id` | GET | × | R | ✓ |
| `/api/users/:id` | PUT | × | × | ✓ |
| `/api/users/:id` | DELETE | × | × | ✓ |
| `/api/users/:id/role` | PUT | × | × | ✓ |

#### レポートAPI

| エンドポイント | メソッド | staff | leader | admin |
|---------------|----------|-------|--------|-------|
| `/api/reports/inventory` | GET | × | ✓ | ✓ |
| `/api/reports/movement` | GET | L | ✓ | ✓ |
| `/api/reports/usage` | GET | × | ✓ | ✓ |
| `/api/reports/custom` | POST | × | ✓ | ✓ |

#### 管理API

| エンドポイント | メソッド | staff | leader | admin |
|---------------|----------|-------|--------|-------|
| `/api/organization` | GET | × | × | ✓ |
| `/api/organization` | PUT | × | × | ✓ |
| `/api/organization/features` | GET | × | × | R |
| `/api/audit-logs` | GET | × | × | ✓ |
| `/api/backups` | POST | × | × | ✓ |

### 6.2 SaaS管理アプリケーション API（admin.fieldtool.com）

**※これらのAPIは完全に分離されたSaaS管理画面専用で、顧客向けアプリケーションからはアクセス不可**

| エンドポイント | メソッド | 説明 | 認証要件 |
|---------------|----------|------|----------|
| `/api/auth/admin-login` | POST | 管理者ログイン | 2FA必須 |
| `/api/auth/admin-logout` | POST | 管理者ログアウト | - |
| `/api/auth/verify-2fa` | POST | 2FA認証 | - |
| `/api/organizations` | GET | 全顧客組織一覧 | super_admin |
| `/api/organizations` | POST | 新規顧客登録 | super_admin |
| `/api/organizations/:id` | GET | 顧客詳細 | super_admin |
| `/api/organizations/:id` | PUT | 顧客情報更新 | super_admin |
| `/api/organizations/:id/suspend` | POST | サービス停止 | super_admin |
| `/api/organizations/:id/resume` | POST | サービス再開 | super_admin |
| `/api/contracts` | GET | 契約一覧 | super_admin |
| `/api/contracts` | POST | 契約作成 | super_admin |
| `/api/contracts/:id` | PUT | 契約更新 | super_admin |
| `/api/invoices` | GET | 請求書一覧 | super_admin |
| `/api/invoices` | POST | 請求書発行 | super_admin |
| `/api/payments` | GET | 入金一覧 | super_admin |
| `/api/payments` | POST | 入金記録 | super_admin |
| `/api/system/health` | GET | システムヘルス | super_admin |
| `/api/system/logs` | GET | システムログ | super_admin |
| `/api/system/metrics` | GET | システムメトリクス | super_admin |
| `/api/system/backup` | POST | バックアップ実行 | super_admin |

---

## 7. 実装ガイドライン

### 7.1 ミドルウェア実装

#### 顧客向けアプリケーション（app.fieldtool.com）

```typescript
// middleware.ts - 顧客向けアプリケーション
import { NextRequest, NextResponse } from 'next/server';
import { getUserRole } from '@/lib/auth';

// ルート別の必要権限定義（super_admin除外）
const routePermissions = {
  '/admin': ['admin'],
  '/manager': ['leader', 'admin'],
  '/reports': ['leader', 'admin'],
  '/settings/organization': ['admin'],
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const userRole = await getUserRole(request);

  // super_adminのアクセスを拒否（間違ったURLへのアクセス防止）
  if (userRole === 'super_admin') {
    return NextResponse.redirect('https://admin.fieldtool.com');
  }

  // 権限チェック
  for (const [route, allowedRoles] of Object.entries(routePermissions)) {
    if (pathname.startsWith(route)) {
      if (!allowedRoles.includes(userRole)) {
        // アクセス拒否
        if (!userRole) {
          return NextResponse.redirect(new URL('/login', request.url));
        }
        return NextResponse.redirect(new URL('/unauthorized', request.url));
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
```

#### SaaS管理画面（admin.fieldtool.com）

```typescript
// middleware.ts - SaaS管理画面
import { NextRequest, NextResponse } from 'next/server';
import { getSuperAdminSession } from '@/lib/admin-auth';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ログインページとAPIはスキップ
  if (pathname === '/login' || pathname.startsWith('/api/auth')) {
    return NextResponse.next();
  }

  const session = await getSuperAdminSession(request);

  // 未認証の場合
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2FA未完了の場合
  if (!session.twoFactorVerified && pathname !== '/2fa-verify') {
    return NextResponse.redirect(new URL('/2fa-verify', request.url));
  }

  // super_admin以外のアクセスを拒否
  if (session.user.role !== 'super_admin') {
    return NextResponse.redirect('https://app.fieldtool.com');
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

### 7.2 API権限チェック

#### 顧客向けアプリケーション

```typescript
// lib/api-auth.ts - 顧客向け
export function requireRole(...allowedRoles: UserRole[]) {
  return async (req: NextRequest) => {
    const session = await getSession(req);

    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // super_adminは顧客向けAPIにアクセスできない
    if (session.user.role === 'super_admin') {
      return NextResponse.json(
        { error: 'Invalid application access' },
        { status: 403 }
      );
    }

    if (!allowedRoles.includes(session.user.role)) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      );
    }

    return null; // 権限OK
  };
}

// 使用例
export async function GET(req: NextRequest) {
  // leader以上の権限が必要（super_admin除外）
  const authError = await requireRole('leader', 'admin')(req);
  if (authError) return authError;

  // 処理続行...
}
```

#### SaaS管理画面

```typescript
// lib/admin-api-auth.ts - SaaS管理画面
export async function requireSuperAdmin(req: NextRequest) {
  const session = await getSuperAdminSession(req);

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (!session.twoFactorVerified) {
    return NextResponse.json(
      { error: '2FA verification required' },
      { status: 401 }
    );
  }

  if (session.user.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Super admin access required' },
      { status: 403 }
    );
  }

  // IP制限チェック（オプション）
  const clientIp = req.headers.get('x-forwarded-for') || req.ip;
  if (!isAllowedIp(clientIp)) {
    return NextResponse.json(
      { error: 'IP address not allowed' },
      { status: 403 }
    );
  }

  return null; // 権限OK
}

// 使用例
export async function GET(req: NextRequest) {
  const authError = await requireSuperAdmin(req);
  if (authError) return authError;

  // SaaS管理処理続行...
}
```

### 7.3 フロントエンド権限制御

```typescript
// hooks/useRole.ts - 顧客向けアプリケーション
export function useRole() {
  const { user } = useAuth();

  const hasRole = (...roles: UserRole[]) => {
    return roles.includes(user?.role);
  };

  const canAccess = (feature: string) => {
    const permissions = featurePermissions[feature];
    return permissions?.includes(user?.role);
  };

  return {
    role: user?.role,
    hasRole,
    canAccess,
    isStaff: user?.role === 'staff',
    isLeader: user?.role === 'leader',
    isAdmin: user?.role === 'admin',
    // super_adminは顧客向けアプリケーションには存在しない
  };
}

// 使用例
function ToolManagement() {
  const { canAccess, isLeader } = useRole();

  if (!canAccess('tool_management')) {
    return <AccessDenied />;
  }

  return (
    <div>
      <ToolList />
      {isLeader && <AddToolButton />}
    </div>
  );
}
```

### 7.4 データベースレベルの制御（RLS）

#### 顧客向けアプリケーション用RLSポリシー

```sql
-- Row Level Security ポリシー（顧客向け）

-- staffは自分の移動履歴のみ参照可能
CREATE POLICY "staff_own_movements" ON tool_movements
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('leader', 'admin')
      AND organization_id = tool_movements.organization_id
    )
  );

-- leaderは自組織のデータのみアクセス可能
CREATE POLICY "leader_org_data" ON tools
  FOR ALL
  TO authenticated
  USING (
    organization_id = (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('leader', 'admin')
    )
  );

-- adminは自組織の全データにアクセス可能
CREATE POLICY "admin_org_access" ON organizations
  FOR ALL
  TO authenticated
  USING (
    id = (SELECT organization_id FROM users WHERE id = auth.uid())
    AND
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
```

#### SaaS管理画面用アクセス制御

```sql
-- super_admin専用のデータベース接続
-- 別のデータベースロールまたは接続文字列を使用

-- super_adminは全組織・全データにアクセス可能
-- RLSを使用せず、アプリケーションレベルで制御
-- または専用のサービスアカウントを使用

-- 例: サービスアカウント用の設定
CREATE ROLE super_admin_service WITH LOGIN PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO super_admin_service;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO super_admin_service;

-- 顧客データへの読み取り専用ビューを作成することも可能
CREATE OR REPLACE VIEW admin_organizations_view AS
SELECT
  o.*,
  COUNT(DISTINCT u.id) as user_count,
  COUNT(DISTINCT t.id) as tool_count
FROM organizations o
LEFT JOIN users u ON u.organization_id = o.id
LEFT JOIN tools t ON t.organization_id = o.id
GROUP BY o.id;
```

---

## 8. セキュリティ考慮事項

### 8.1 基本原則

1. **Defense in Depth（多層防御）**
   - フロントエンド、API、データベースの各層で権限チェック
   - 単一の層の失敗が全体のセキュリティを損なわない

2. **Fail Secure（安全側に倒す）**
   - 権限が不明な場合はアクセス拒否
   - エラー時は最小権限を適用

3. **最小権限の原則**
   - 各役割は必要最小限の権限のみ保有
   - 時限的な権限昇格は避ける

### 8.2 実装上の注意点

#### クライアントサイドの権限チェックは信用しない
```typescript
// ❌ 悪い例：クライアントのみでチェック
function DeleteButton({ toolId }) {
  const { isAdmin } = useRole();
  if (!isAdmin) return null;

  const handleDelete = () => {
    // 直接削除APIを呼ぶ（危険）
    fetch(`/api/tools/${toolId}`, { method: 'DELETE' });
  };
}

// ✅ 良い例：サーバーサイドでも必ずチェック
// API側
export async function DELETE(req: NextRequest) {
  const authError = await requireRole('admin', 'super_admin')(req);
  if (authError) return authError;

  // 削除処理
}
```

#### 権限昇格攻撃への対策
```typescript
// ❌ 悪い例：ユーザーからの role を信用
const updateUser = async (userId: string, data: any) => {
  await db.users.update({
    where: { id: userId },
    data: data, // roleが含まれる可能性
  });
};

// ✅ 良い例：権限変更は別APIで管理者のみ
const updateUserRole = async (userId: string, newRole: UserRole) => {
  // 管理者権限チェック
  if (!isAdmin(currentUser)) {
    throw new ForbiddenError();
  }

  // 適切な検証後に更新
  await db.users.update({
    where: { id: userId },
    data: { role: newRole },
  });
};
```

### 8.3 監査とログ

#### 重要操作のログ記録
```typescript
const auditLog = async (action: string, details: any) => {
  await db.auditLogs.create({
    data: {
      userId: getCurrentUserId(),
      action,
      details,
      ipAddress: getClientIp(),
      userAgent: getUserAgent(),
      timestamp: new Date(),
    },
  });
};

// 使用例
const deleteToolWithAudit = async (toolId: string) => {
  const tool = await getToolById(toolId);

  // 削除実行
  await deleteTool(toolId);

  // 監査ログ記録
  await auditLog('TOOL_DELETED', {
    toolId,
    toolName: tool.name,
    reason: 'User requested deletion',
  });
};
```

### 8.4 セッション管理

#### 顧客向けアプリケーション

```typescript
// session-config.ts - 顧客向け
export const sessionConfig = {
  // 役割別のセッションタイムアウト
  sessionTimeout: {
    staff: 8 * 60 * 60,        // 8時間（作業時間中）
    leader: 12 * 60 * 60,       // 12時間
    admin: 4 * 60 * 60,         // 4時間（セキュリティ重視）
  },

  // アイドルタイムアウト
  idleTimeout: {
    staff: 60 * 60,             // 1時間
    leader: 30 * 60,            // 30分
    admin: 15 * 60,             // 15分
  },
};
```

#### SaaS管理画面

```typescript
// admin-session-config.ts - SaaS管理画面
export const adminSessionConfig = {
  // super_admin専用設定
  sessionTimeout: 2 * 60 * 60,    // 2時間（最も厳格）
  idleTimeout: 10 * 60,           // 10分

  // 追加セキュリティ設定
  requireTwoFactor: true,         // 2FA必須
  ipWhitelist: process.env.ADMIN_IP_WHITELIST?.split(',') || [],
  maxFailedAttempts: 3,           // ログイン試行回数制限
  lockoutDuration: 30 * 60,       // 30分のロックアウト

  // セッション固定化攻撃対策
  regenerateSessionOnLogin: true,

  // セキュリティヘッダー
  securityHeaders: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Content-Security-Policy': "default-src 'self'",
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  },
};
```

---

## まとめ

本RBAC仕様により、Field Tool Managerシステムは以下を実現します：

### 顧客向けアプリケーション（app.fieldtool.com）
1. **明確な職務分離**: staff/leader/adminの3つの役割で適切な権限管理
2. **段階的な機能提供**: 顧客のニーズと契約に応じた機能制御
3. **セキュアな実装**: 多層防御による堅牢なアクセス制御
4. **組織単位のデータ分離**: RLSによる確実なマルチテナント実装

### SaaS管理画面（admin.fieldtool.com）
1. **完全な分離**: super_admin専用の独立したアプリケーション
2. **強化されたセキュリティ**: 2FA必須、IP制限、厳格なセッション管理
3. **全顧客データ管理**: 組織横断的な管理機能
4. **監査とコンプライアンス**: 詳細な操作ログと追跡機能

### アーキテクチャの利点
- **セキュリティ**: 攻撃対象領域の最小化、権限昇格リスクの排除
- **スケーラビリティ**: 独立したデプロイメント、リソース管理
- **開発効率**: 明確な責務分離、独立した開発サイクル
- **ユーザビリティ**: 役割に特化したUI/UX

開発時は常に本仕様書を参照し、適切な権限制御と分離アーキテクチャを維持してください。