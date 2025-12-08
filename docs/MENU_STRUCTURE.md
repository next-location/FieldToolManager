# メニュー構成仕様書

## 目次
1. [概要](#1-概要)
2. [設計原則](#2-設計原則)
3. [権限別メニュー構成](#3-権限別メニュー構成)
4. [実装状況](#4-実装状況)
5. [ユーザビリティ設計](#5-ユーザビリティ設計)
6. [実装ガイドライン](#6-実装ガイドライン)

---

## 1. 概要

### 1.1 目的
Field Tool Managerのメニュー構成を権限別・使用シーン別に最適化し、ユーザビリティを向上させる。

### 1.2 対象ロール
- **Staff（現場スタッフ）**: 現場作業員、協力業者
- **Leader（リーダー）**: 現場監督、チームリーダー
- **Manager（マネージャー）**: 部門長、中間管理職
- **Admin（管理者）**: IT管理者、経営層

### 1.3 使用環境の特性
| ロール | 主な使用場所 | 主なデバイス | 使用頻度の高い時間帯 |
|--------|-------------|--------------|-------------------|
| Staff | 現場 | スマートフォン | 朝・夕の出退勤時、日中の作業中 |
| Leader | 現場・事務所 | スマホ・タブレット | 朝礼時、日中の管理業務 |
| Manager | 事務所 | PC・タブレット | 日中の分析・管理業務 |
| Admin | 事務所 | PC | 随時のシステム管理 |

---

## 2. 設計原則

### 2.1 ユーザビリティの原則

#### 現場利用者向け（Staff/Leader）
- **大きなタッチターゲット**: 最小44px、推奨56px
- **階層の浅さ**: 最大2階層まで
- **視認性**: 高コントラスト、大きな文字
- **操作性**: 手袋着用時でも操作可能
- **即座性**: よく使う機能へ1タップでアクセス

#### 事務所利用者向け（Manager/Admin）
- **情報密度**: 一画面に多くの情報を表示
- **分析機能**: グラフ・レポートへの素早いアクセス
- **効率性**: キーボードショートカット対応
- **マルチタスク**: 複数画面の同時操作

### 2.2 権限設計の原則

```typescript
// 権限チェックロジック（Sidebar.tsxより）
const isAdmin = userRole === 'admin' || userRole === 'super_admin'
const isManagerOrAdmin = userRole === 'manager' || isAdmin
const isLeaderOrAbove = userRole === 'leader' || isManagerOrAdmin
```

---

## 3. 権限別メニュー構成

### 3.1 Staff（現場スタッフ）

#### 使用シーン最適化版
```
━━━ 今すぐ使う（大きなボタン）━━━
📷 QRスキャン
⏰ 出退勤打刻

━━━ よく使う ━━━
📝 作業報告書
  ├ 新規作成
  └ 一覧（自分の）
🔄 道具を移動
  ├ 道具セット移動
  └ 移動履歴（今日の）

━━━ 確認する ━━━
📦 在庫を見る
  ├ 道具一覧
  └ 消耗品（在庫調整）
👤 マイページ
  ├ 今月の勤怠
  └ 設定

━━━ その他 ━━━
📊 ダッシュボード
📖 マニュアル
```

#### 実装済み機能一覧
| パス | 機能名 | 権限 | 備考 |
|------|--------|------|------|
| `/` | ダッシュボード | ✅ | |
| `/scan` | QRスキャン | ✅ | |
| `/tools` | 道具一覧 | 閲覧のみ | |
| `/consumables` | 消耗品一覧 | 閲覧・±100調整 | |
| `/consumables/orders` | 消耗品発注管理 | ✅ | |
| `/tool-sets` | 道具セット | 閲覧のみ | |
| `/equipment` | 重機一覧 | 閲覧のみ | |
| `/movements` | 移動履歴 | ✅ | |
| `/movements/bulk` | 道具一括移動 | ✅ | |
| `/consumables/bulk-movement` | 消耗品一括移動 | ✅ | |
| `/tool-sets/movement` | 道具セット移動 | ✅ | |
| `/equipment/movement` | 重機移動 | ✅ | |
| `/work-reports` | 作業報告書一覧 | ✅ | |
| `/work-reports/new` | 作業報告書作成 | ✅ | |
| `/attendance/clock` | 出退勤 | ✅ | |
| `/attendance/my-records` | 勤怠履歴 | ✅ | |
| `/manual` | マニュアル | ✅ | |
| `/settings` | アカウント設定 | ✅ | |

---

### 3.2 Leader（リーダー）

#### 使用シーン最適化版
```
━━━ 現場で使う（上部固定）━━━
📷 QRスキャン
📱 チームQR発行（朝礼用）
⏰ 出退勤

━━━ チーム管理（メイン）━━━
👥 今日のチーム
  ├ 勤怠状況（リアルタイム）
  ├ 作業報告（チーム分）
  └ アラート（遅刻・未打刻）
📋 現場を管理
  ├ 現場マスタ（確認）
  ├ 道具配置状況
  └ 移動履歴（チーム）

━━━ 在庫確認 ━━━
📦 道具・消耗品
  ├ 在庫状況
  ├ 消耗品調整（±100）
  └ 発注依頼

━━━ その他 ━━━
📊 ダッシュボード
📖 マニュアル
⚙️ 設定
```

#### Leader追加機能
| パス | 機能名 | 権限 | 備考 |
|------|--------|------|------|
| `/attendance/records` | 勤怠一覧 | 自チームのみ | ⭐Leader以上 |
| `/attendance/qr/leader` | 出退勤QR発行 | ✅ | ⭐Leader以上 |
| `/attendance/alerts` | アラート通知 | 自チームのみ | ⭐Leader以上 |
| `/sites` | 現場マスタ | 閲覧のみ | ⭐Leader以上 |

---

### 3.3 Manager（マネージャー）

#### 使用シーン最適化版
```
━━━ 経営分析（トップ）━━━
📊 経営ダッシュボード
📈 レポート・分析
  ├ 月次勤怠レポート
  ├ コスト分析
  ├ 在庫最適化
  └ 稼働率分析

━━━ 管理業務 ━━━
👥 人材管理
  ├ スタッフ管理（L/S編集）
  ├ 勤怠管理（全体）
  └ シフト調整
🛠 資産管理
  ├ 道具管理（登録・編集）
  ├ 重機管理（登録・編集）
  └ 棚卸し実施
📍 現場管理
  ├ 現場マスタ（編集）
  └ 工程管理

━━━ 日次確認 ━━━
📝 作業報告（承認待ち）
🔔 アラート（全社）

━━━ 現場確認用（サブ）━━━
📷 QRスキャン
🔄 移動履歴
```

#### Manager追加機能
| パス | 機能名 | 権限 | 備考 |
|------|--------|------|------|
| `/tools` | 道具管理 | 登録・編集 | ⭐削除不可 |
| `/consumables` | 消耗品管理 | 登録・編集・無制限調整 | ⭐削除不可 |
| `/tool-sets` | 道具セット管理 | 登録・編集 | ⭐削除不可 |
| `/equipment` | 重機管理 | 登録・編集 | ⭐削除不可 |
| `/sites` | 現場マスタ | 登録・編集 | ⭐削除不可 |
| `/staff` | スタッフ管理 | leader/staffのみ編集可 | ⭐admin編集不可 |
| `/attendance/records` | 勤怠一覧 | 全員 | |
| `/attendance/alerts` | アラート通知 | 全員 | |
| `/attendance/reports/monthly` | 月次勤怠レポート | ✅ | ⭐Manager以上 |
| `/analytics/cost` | コスト分析 | ✅ | ⭐Manager以上 |
| `/analytics/usage` | 使用頻度分析 | ✅ | ⭐Manager以上 |
| `/analytics/inventory` | 在庫最適化 | ✅ | ⭐Manager以上 |
| `/equipment/cost-report` | 重機コストレポート | ✅ | ⭐Manager以上 |
| `/equipment/analytics` | 重機稼働率分析 | ✅ | ⭐Manager以上 |

---

### 3.4 Admin（管理者）

#### 使用シーン最適化版
```
━━━ 経営管理 ━━━
📊 経営ダッシュボード
💰 帳票管理（NEW）
  ├ 請求・売上
  ├ 発注・支払
  └ 収支管理

━━━ システム管理 ━━━
⚙️ マスタ設定
  ├ 組織情報
  ├ 取引先マスタ
  ├ カテゴリ設定
  └ 運用ルール
👥 ユーザー管理
  ├ スタッフ管理（全権限）
  ├ 権限設定
  └ パスワードリセット
🔐 セキュリティ
  ├ 監査ログ
  └ アクセス制御

━━━ 運用監視 ━━━
📈 統計・分析
  ├ 全レポート
  └ KPI管理
🔔 システムアラート

━━━ 各種設定 ━━━
📝 機能設定
  ├ 作業報告書設定
  ├ 勤怠設定
  └ タブレット管理

━━━ 現場確認（必要時）━━━
🔍 クイック確認
  ├ QRスキャン
  ├ 移動履歴
  └ 作業報告
```

#### Admin専用機能
| パス | 機能名 | 備考 |
|------|--------|------|
| **削除権限** | | |
| `/tools` | 道具削除 | ⭐Admin only |
| `/consumables` | 消耗品削除 | ⭐Admin only |
| `/tool-sets` | 道具セット削除 | ⭐Admin only |
| `/equipment` | 重機削除 | ⭐Admin only |
| `/sites` | 現場削除 | ⭐Admin only |
| **マスタ管理** | | |
| `/clients` | 取引先マスタ | ⭐Admin only |
| `/warehouse-locations` | 倉庫位置管理 | ⭐Admin only |
| `/categories` | 道具カテゴリ管理 | ⭐Admin only |
| `/master/equipment-categories` | 重機カテゴリ管理 | ⭐Admin only |
| **スタッフ管理** | | |
| `/staff` | スタッフ管理（全権限） | ⭐Admin only |
| 権限変更 | 権限変更 | ⭐Admin only |
| パスワードリセット | パスワードリセット | ⭐Admin only |
| 変更履歴閲覧 | 変更履歴閲覧 | ⭐Admin only |
| **システム設定** | | |
| `/organization` | 組織情報設定 | ⭐Admin only |
| `/settings/organization` | 運用設定 | ⭐Admin only |
| `/attendance/settings` | 出退勤設定 | ⭐Admin only |
| `/work-reports/settings` | 作業報告書設定 | ⭐Admin only |
| `/attendance/terminals` | タブレット端末管理 | ⭐Admin only |
| `/admin/audit-logs` | 監査ログ | ⭐Admin only |
| **分析** | | |
| `/clients/stats` | 取引先統計・分析 | ⭐Admin only |
| **帳票管理（将来実装）** | | |
| 見積・請求管理 | 見積書・請求書・領収書 | ⭐Admin only |
| 発注・支払管理 | 発注書・支払管理・買掛金 | ⭐Admin only |
| 入金管理 | 入金登録・消込・売掛金 | ⭐Admin only |
| 工事管理 | 工事マスタ・収支・原価 | ⭐Admin only |
| 帳票設定 | 採番・テンプレート・税率 | ⭐Admin only |

---

## 4. 実装状況

### 4.1 現在の実装コード

#### Sidebar.tsx の権限制御
```typescript
// 権限チェック
const isAdmin = userRole === 'admin' || userRole === 'super_admin'
const isManagerOrAdmin = userRole === 'manager' || isAdmin
const isLeaderOrAbove = userRole === 'leader' || isManagerOrAdmin

// 条件付き表示の例
{isLeaderOrAbove && (
  <Link href="/attendance/qr/leader">
    <span>出退勤QR発行</span>
  </Link>
)}

{isManagerOrAdmin && (
  <Link href="/analytics/cost">
    <span>コスト分析</span>
  </Link>
)}

{isAdmin && (
  <Link href="/clients">
    <span>取引先マスタ</span>
  </Link>
)}
```

### 4.2 実装済み機能数

| ロール | 基本機能 | 追加機能 | 合計 | 帳票管理後 |
|--------|----------|----------|------|------------|
| Staff | 19 | 0 | 19 | 19 |
| Leader | 19 | 5 | 24 | 24 |
| Manager | 24 | 8 | 32 | 33（見積検討） |
| Admin | 32 | 13 | 45 | 60+ |

---

## 5. ユーザビリティ設計

### 5.1 デバイス別最適化

#### モバイル（Staff/Leader）
```scss
// タッチターゲットサイズ
.mobile-menu-item {
  min-height: 56px;  // 推奨サイズ
  padding: 16px;
  font-size: 16px;   // 最小フォントサイズ
}

// ボタン間隔
.mobile-button-spacing {
  margin-bottom: 12px;
}
```

#### デスクトップ（Manager/Admin）
```scss
// 情報密度の向上
.desktop-menu-item {
  padding: 8px 12px;
  font-size: 14px;
}

// ホバーエフェクト
.desktop-menu-item:hover {
  background-color: #f5f5f5;
}
```

### 5.2 時間帯別表示

```typescript
function getTimeBasedMenuPriority(userRole: string) {
  const hour = new Date().getHours();

  if (userRole === 'leader') {
    if (hour >= 7 && hour <= 9) {
      // 朝礼時間：QR発行を最優先
      return ['qr-leader', 'attendance', 'team-check'];
    } else if (hour >= 16 && hour <= 18) {
      // 夕方：レポート確認
      return ['reports', 'attendance-check', 'tomorrow-plan'];
    }
  }
  // デフォルト優先順位
  return defaultPriority[userRole];
}
```

### 5.3 利用頻度による最適化

```typescript
// 利用頻度の記録と表示順の調整
interface MenuUsageStats {
  menuId: string;
  count: number;
  lastUsed: Date;
}

function optimizeMenuOrder(
  baseMenu: MenuItem[],
  usageStats: MenuUsageStats[]
): MenuItem[] {
  // 利用頻度の高い上位3項目を抽出
  const frequent = usageStats
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  // よく使う項目を上部に配置
  return reorderMenu(baseMenu, frequent);
}
```

---

## 6. 実装ガイドライン

### 6.1 メニュー追加時のチェックリスト

- [ ] 権限設定の確認（どのロールがアクセス可能か）
- [ ] Sidebar.tsxへの追加
- [ ] PermissionMatrixModal.tsxへの追加
- [ ] ROLE_BASED_ACCESS_CONTROL.mdの更新
- [ ] このドキュメント（MENU_STRUCTURE.md）の更新
- [ ] モバイル表示の確認
- [ ] アイコンの選定
- [ ] 日本語表記の確認

### 6.2 権限実装パターン

```typescript
// パターン1: 単純な権限チェック
{isAdmin && <MenuItem />}

// パターン2: 複数権限
{isManagerOrAdmin && <MenuItem />}

// パターン3: 条件付き表示
{isLeader ? (
  <MenuItem label="自チーム" scope="team" />
) : isManagerOrAdmin ? (
  <MenuItem label="全体" scope="all" />
) : null}

// パターン4: 権限による機能制限
<MenuItem
  canEdit={isManagerOrAdmin}
  canDelete={isAdmin}
  canView={true}
/>
```

### 6.3 メニュー階層のルール

1. **最大階層**: 2階層まで（3階層は避ける）
2. **グループ化**: 関連機能は同じグループに
3. **命名規則**: 動詞＋名詞（例：道具を管理、レポートを見る）
4. **アイコン**: 各グループに統一感のあるアイコン
5. **並び順**: 利用頻度 > 重要度 > アルファベット順

### 6.4 パフォーマンス考慮事項

```typescript
// メニューの遅延読み込み
const LazyAdminMenu = lazy(() => import('./AdminMenu'));

// 権限による条件付きレンダリング
{isAdmin && (
  <Suspense fallback={<MenuSkeleton />}>
    <LazyAdminMenu />
  </Suspense>
)}
```

---

## 付録

### A. アイコン一覧

| アイコン | 用途 | 使用箇所 |
|---------|------|----------|
| 📊 | ダッシュボード | 全ロール |
| 📷 | QRスキャン | 全ロール |
| ⏰ | 勤怠 | 全ロール |
| 📝 | 作業報告書 | 全ロール |
| 🔧 | 道具管理 | 全ロール |
| 🔄 | 移動管理 | 全ロール |
| 👥 | チーム/スタッフ管理 | Leader以上 |
| 📈 | レポート・分析 | Manager以上 |
| 💰 | 帳票管理 | Admin |
| ⚙️ | 設定 | 権限による |
| 🔐 | セキュリティ | Admin |
| 📖 | マニュアル | 全ロール |

### B. 色設定

| ロール | テーマカラー | HEX | 用途 |
|--------|------------|-----|------|
| Staff | ブルー | #3B82F6 | ヘッダー、アクセント |
| Leader | イエロー | #F59E0B | バッジ、強調表示 |
| Manager | オレンジ | #F97316 | グラフ、アラート |
| Admin | レッド | #EF4444 | 重要操作、警告 |

### C. 今後の拡張予定

1. **AI による最適化**
   - 利用パターンの学習
   - 自動的なメニュー順序調整

2. **カスタマイズ機能**
   - ユーザー個別のメニュー配置
   - お気に入り機能

3. **ショートカット**
   - キーボードショートカット
   - ジェスチャー操作（モバイル）

4. **多言語対応**
   - 英語対応
   - ベトナム語対応（技能実習生向け）