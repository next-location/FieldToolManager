# メニュー構成仕様書（機能パック対応版）

## 目次
1. [概要](#1-概要)
2. [機能パック定義](#2-機能パック定義)
3. [権限別・機能パック別メニュー構成](#3-権限別機能パック別メニュー構成)
4. [実装ガイドライン](#4-実装ガイドライン)

---

## 1. 概要

### 1.1 目的
Field Tool Managerのメニュー構成を権限別・機能パック別に最適化し、ユーザビリティを向上させる。

### 1.2 対象ロール
- **Staff（現場スタッフ）**: 現場作業員、協力業者
- **Leader（リーダー）**: 現場監督、チームリーダー
- **Manager（マネージャー）**: 部門長、中間管理職
- **Admin（管理者）**: IT管理者、経営層

### 1.3 権限設計の原則

```typescript
// 権限チェックロジック（Sidebar.tsxより）
const isAdmin = userRole === 'admin' || userRole === 'super_admin'
const isManagerOrAdmin = userRole === 'manager' || isAdmin
const isLeaderOrAbove = userRole === 'leader' || isManagerOrAdmin

// パッケージチェック
const hasAssetPackage = features.contract.packages.asset_management
const hasDxPackage = features.contract.packages.dx_efficiency
```

---

## 2. 機能パック定義

### 2.1 パッケージ一覧

| パック名 | 月額料金 | 含まれる機能 |
|---------|---------|-------------|
| **現場資産パック** | ¥18,000 | 道具管理、消耗品管理、重機管理、各種アラート、QR一括生成、棚卸し |
| **現場DX業務効率化パック** | ¥22,000 | 出退勤管理、作業報告書、見積・請求・領収書、売上管理、承認ワークフロー |
| **フル機能統合パック** | ¥32,000 | 全機能利用可能（割引適用） |

### 2.2 パッケージ制御の実装

```typescript
// メニュー表示制御
{hasAssetPackage && (
  <MenuItem>道具管理</MenuItem>
)}

{hasDxPackage && (
  <MenuItem>作業報告書</MenuItem>
)}

// 権限とパッケージの組み合わせ
{isAdmin && hasDxPackage && (
  <MenuItem>帳票管理</MenuItem>
)}
```

---

## 3. 権限別・機能パック別メニュー構成

### 3.1 Staff（現場スタッフ）

#### パッケージ不要（共通機能）
| パス | 機能名 | 備考 |
|------|--------|------|
| `/` | ダッシュボード | |
| `/scan` | QRスキャン | |
| `/manual` | マニュアル | |
| `/settings` | アカウント設定 | |

#### 現場資産パック必須
| パス | 機能名 | 権限 |
|------|--------|------|
| `/tools` | 道具一覧 | 閲覧のみ |
| `/consumables` | 消耗品一覧 | 閲覧・±100調整 |
| `/consumables/orders` | 消耗品発注管理 | ✅ |
| `/tool-sets` | 道具セット | 閲覧のみ |
| `/equipment` | 重機一覧 | 閲覧のみ |
| `/movements/bulk` | 道具一括移動 | ✅ |
| `/consumables/bulk-movement` | 消耗品一括移動 | ✅ |
| `/tool-sets/movement` | 道具セット移動 | ✅ |
| `/equipment/movement` | 重機移動 | ✅ |
| `/movements` | 移動履歴 | ✅ |

#### 現場DX業務効率化パック必須
| パス | 機能名 | 権限 |
|------|--------|------|
| `/work-reports` | 作業報告書一覧 | ✅ |
| `/work-reports/new` | 作業報告書作成 | ✅ |
| `/attendance/clock` | 出退勤 | ✅ |
| `/attendance/my-records` | 勤怠履歴 | ✅ |

---

### 3.2 Leader（リーダー）

#### パッケージ不要（Staff権限 + 追加機能）
| パス | 機能名 | 権限 | 備考 |
|------|--------|------|------|
| **（Staff権限の全機能）** | | | |
| `/sites` | 現場マスタ | 閲覧のみ | ⭐Leader以上 |

#### 現場資産パック必須
| パス | 機能名 | 権限 |
|------|--------|------|
| **（Staff権限の現場資産パック機能）** | | |

#### 現場DX業務効率化パック必須（Leader追加機能）
| パス | 機能名 | 権限 | 備考 |
|------|--------|------|------|
| **（Staff権限の現場DX機能）** | | | |
| `/attendance/records` | 勤怠一覧 | 自チームのみ | ⭐Leader以上 |
| `/attendance/qr/leader` | 出退勤QR発行 | ✅ | ⭐Leader以上 |
| `/attendance/alerts` | アラート通知 | 自チームのみ | ⭐Leader以上 |

---

### 3.3 Manager（マネージャー）

#### パッケージ不要（Leader権限 + 追加機能）
| パス | 機能名 | 権限 | 備考 |
|------|--------|------|------|
| **（Leader権限の全機能）** | | | |
| `/staff` | スタッフ管理 | leader/staffのみ編集可 | ⭐Manager以上 |

#### 現場資産パック必須（Manager追加機能）
| パス | 機能名 | 権限 | 備考 |
|------|--------|------|------|
| **（Leader権限の現場資産パック機能）** | | | |
| `/tools` | 道具管理 | 登録・編集 | ⭐削除不可 |
| `/consumables` | 消耗品管理 | 登録・編集・無制限調整 | ⭐削除不可 |
| `/tool-sets` | 道具セット管理 | 登録・編集 | ⭐削除不可 |
| `/equipment` | 重機管理 | 登録・編集 | ⭐削除不可 |
| `/sites` | 現場マスタ | 登録・編集 | ⭐削除不可 |
| `/analytics/cost` | コスト分析 | ✅ | ⭐Manager以上 |
| `/analytics/usage` | 使用頻度分析 | ✅ | ⭐Manager以上 |
| `/analytics/inventory` | 在庫最適化 | ✅ | ⭐Manager以上 |
| `/equipment/cost-report` | 重機コストレポート | ✅ | ⭐Manager以上 ※重機有効時 |
| `/equipment/analytics` | 重機稼働率分析 | ✅ | ⭐Manager以上 ※重機有効時 |

#### 現場DX業務効率化パック必須（Manager追加機能）
| パス | 機能名 | 権限 | 備考 |
|------|--------|------|------|
| **（Leader権限の現場DX機能）** | | | |
| `/attendance/records` | 勤怠一覧 | 全員 | ⭐Manager以上 |
| `/attendance/alerts` | アラート通知 | 全員 | ⭐Manager以上 |
| `/attendance/reports/monthly` | 月次勤怠レポート | ✅ | ⭐Manager以上 |

---

### 3.4 Admin（管理者）

#### パッケージ不要（Manager権限 + Admin専用機能）
| パス | 機能名 | 権限 | 備考 |
|------|--------|------|------|
| **（Manager権限の全機能）** | | | |
| `/organization` | 組織情報設定 | ✅ | ⭐Admin only |
| `/settings` | アカウント設定 | ✅ | |
| `/staff` | スタッフ管理 | 全権限 | ⭐Admin only |
| `/settings/organization` | 運用設定 | ✅ | ⭐Admin only |
| `/admin/audit-logs` | 監査ログ | ✅ | ⭐Admin only |
| `/analytics/financial` | 財務分析 | ✅ | ⭐Admin only（パッケージで機能制御） |

**財務分析の動作**:
- メニューは常に表示
- DXパックなし: タブ内で「パッケージが必要」メッセージ
- DXパックあり: 売上分析・資金繰り予測のデータを表示

#### 現場資産パック必須（Admin追加機能）
| パス | 機能名 | 備考 |
|------|--------|------|
| **（Manager権限の現場資産パック機能）** | |
| `/warehouse-locations` | 倉庫位置管理 | ⭐Admin only |
| `/master/tools-consumables` | 道具マスタ | ⭐Manager/Admin only ※カテゴリ管理含む |
| `/master/equipment-categories` | 重機カテゴリ管理 | ⭐Admin only ※重機有効時 |
| **削除権限** | 道具・消耗品・道具セット・重機・現場 | ⭐Admin only |

#### 現場DX業務効率化パック必須（Admin追加機能）
| パス | 機能名 | 備考 |
|------|--------|------|
| **（Manager権限の現場DX機能）** | |
| `/clients` | 取引先マスタ | ⭐Admin/Leader以上（閲覧）、Admin（編集） |
| `/suppliers` | **仕入先マスタ** | ⭐Admin/Leader以上（閲覧）、Admin（編集） |
| `/attendance/settings` | 出退勤設定 | ⭐Admin only |
| `/work-reports/settings` | 作業報告書設定 | ⭐Admin only |
| `/attendance/terminals` | タブレット端末管理 | ⭐Admin only |
| **帳票管理** | | ⭐Leader以上 |
| `/projects` | 工事管理 | Leader以上 |
| `/estimates` | 見積書一覧 | Leader以上（作成）、Manager以上（承認） |
| `/invoices` | 請求書一覧 | Leader以上（作成）、Manager以上（承認） |
| `/purchase-orders` | **発注書一覧** | **Leader以上（作成）、Admin（100万円以上承認）** |
| `/payments` | 入出金管理 | Manager以上 |
| **レポート・分析** | | ⭐Admin only |
| `/clients/stats` | 取引先統計・分析 | |
| `/analytics/financial` | 財務分析（売上・資金繰り） | DXパックで全機能利用可 |

**注意**: フル機能統合パックは、現場資産パック + 現場DX業務効率化パックの全機能が利用可能

---

## 4. 実装ガイドライン

### 4.1 メニュー追加時のチェックリスト

- [ ] 権限設定の確認（どのロールがアクセス可能か）
- [ ] パッケージ要件の確認（現場資産 / DX / 不要）
- [ ] Sidebar.tsxへの追加（パッケージ制御含む）
- [ ] ROLE_BASED_ACCESS_CONTROL.mdの更新
- [ ] このドキュメント（MENU_STRUCTURE.md）の更新
- [ ] モバイル表示の確認
- [ ] アイコンの選定
- [ ] 日本語表記の確認

### 4.2 権限・パッケージ実装パターン

```typescript
// パターン1: 権限のみ
{isAdmin && <MenuItem />}

// パターン2: パッケージのみ
{hasAssetPackage && <MenuItem />}

// パターン3: 権限 + パッケージ
{isManagerOrAdmin && hasAssetPackage && <MenuItem />}

// パターン4: 複数パッケージ
{(hasAssetPackage || hasDxPackage) && <MenuItem />}

// パターン5: Admin専用 + パッケージで機能制御（財務分析）
{isAdmin && (
  <Link href="/analytics/financial">
    財務分析
  </Link>
)}
// ページ内でDXパッケージの有無により表示内容を制御
```

### 4.3 メニュー階層のルール

1. **最大階層**: 2階層まで（3階層は避ける）
2. **グループ化**: 関連機能は同じグループに
3. **命名規則**: 動詞＋名詞（例：道具を管理、レポートを見る）
4. **並び順**: 利用頻度 > 重要度 > アルファベット順

### 4.4 パッケージ制御の実装場所

| 制御レベル | 実装場所 | 目的 |
|-----------|---------|------|
| **メニュー表示** | Sidebar.tsx | パッケージ未契約時はメニュー非表示 |
| **ページアクセス** | page.tsx (Server Component) | 直URL入力時の制御 |
| **機能制御** | Component内部 | パッケージに応じた機能の出し分け |

**例: 財務分析**
- メニュー: Admin権限で常に表示
- ページ: アクセス可能（Admin権限チェックのみ）
- 機能: タブ内でDXパッケージチェック（売上分析・資金繰り予測）

---

## 付録

### A. 実装済み機能数

| ロール | 基本機能 | 資産パック | DXパック | 合計 |
|--------|----------|-----------|---------|------|
| Staff | 4 | 10 | 4 | 18 |
| Leader | 4 | 10 | 7 | 21 |
| Manager | 5 | 15 | 8 | 28 |
| Admin | 7 | 19 | 16 | 42 |

### B. アイコン一覧

| アイコン | 用途 | パッケージ要件 |
|---------|------|--------------|
| 📊 | ダッシュボード | 不要 |
| 📷 | QRスキャン | 不要 |
| 🔧 | 道具管理 | 現場資産 |
| 🏗️ | 重機管理 | 現場資産 |
| 🔄 | 移動管理 | 現場資産 |
| ⏰ | 勤怠管理 | DX |
| 📝 | 作業報告書 | DX |
| 💰 | 帳票管理 | DX |
| 📈 | レポート・分析 | 資産 or DX |
| ⚙️ | 設定・管理 | 不要 |
| 📖 | マニュアル | 不要 |

### C. 今後の拡張予定

1. **パッケージのアップグレード促進UI**
   - 未契約機能へのアクセス時にプラン紹介
   - トライアル機能の提供

2. **利用状況に基づく最適化**
   - 使用頻度による自動並び替え
   - パッケージ利用率の可視化

3. **多言語対応**
   - 英語対応
   - ベトナム語対応（技能実習生向け）
