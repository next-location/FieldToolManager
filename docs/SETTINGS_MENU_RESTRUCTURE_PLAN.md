# 設定・管理メニュー再構成 実装計画書

## 📋 概要

設定・管理メニューの10項目を4つのカテゴリーにグループ化し、ユーザビリティを向上させる実装計画です。

### 現在の問題点
- 10個の設定項目が並列に並んでおり、認知負荷が高い
- 利用頻度の差が考慮されていない（初期設定と日常運用が混在）
- 個人設定と組織設定が同じ階層に混在

### 改善目標
- 4つのカテゴリーに整理して認知負荷を軽減
- タブUIを活用した論理的なグループ化
- 既存機能を一切壊さない安全な実装

## 🎯 新構成

```
設定・管理
├─ 組織管理
│  └─ タブ: [組織情報] [自社拠点] [スタッフ管理] [業務運用ルール]
│
├─ 機能設定（DXパック契約時のみ表示）
│  ├─ 勤怠管理
│  │  └─ タブ: [基本設定] [勤務パターン] [アラート・通知] [出退勤アラート] [タブレット端末]
│  │
│  └─ 作業報告書設定（単独ページ）
│
├─ マイアカウント（単独ページ）
│
└─ データ管理
   └─ タブ: [データエクスポート] [監査ログ]
```

## 📊 設定項目の振り分け表

| 現在の項目 | 現在のパス | 新構成での配置 |
|------------|------------|----------------|
| 組織情報設定 | `/organization` | 組織管理 > 組織情報タブ |
| 自社拠点管理 | `/settings/locations` | 組織管理 > 自社拠点タブ |
| アカウント設定 | `/settings` | マイアカウント（単独） |
| スタッフ管理 | `/staff` | 組織管理 > スタッフ管理タブ |
| 運用設定 | `/settings/organization` | 組織管理 > 業務運用ルールタブ |
| データエクスポート | `/settings/data-export` | データ管理 > データエクスポートタブ |
| 勤怠管理設定 | `/attendance/settings` | 機能設定 > 勤怠管理 > 既存4タブ |
| 作業報告書設定 | `/work-reports/settings` | 機能設定 > 作業報告書設定 |
| タブレット端末管理 | `/attendance/terminals` | 機能設定 > 勤怠管理 > タブレット端末タブ |
| 監査ログ | `/admin/audit-logs` | データ管理 > 監査ログタブ |

## 🔒 実装の基本方針

### 絶対に守るべき制約
1. **現状の設定項目が絶対に欠けてはならない**
2. **現状正常に動いている機能が動かなくなってはならない**
3. **他の現状動いている項目に不具合等の悪影響を及ぼしてはならない**
4. **デザインは現状のスタイルを基本的に利用する**

### 実装方針
1. **既存機能は一切変更しない** - 新しいコンテナページを作り、既存ページを呼び出す
2. **段階的移行** - 新旧並行稼働後、問題なければ切り替え
3. **ロールバック可能** - いつでも元に戻せる実装
4. **既存スタイルの継承** - 現在使用中のCSSクラスをそのまま活用

## 📅 実装フェーズ

### フェーズ1: 新規コンテナページの作成（既存に影響なし）

#### 1-1. 組織管理ページ（新規）
- **ファイルパス**: `/app/(authenticated)/settings/organization-management/page.tsx`
- **実装内容**:
  - タブUIコンポーネント作成（既存の勤怠管理設定のタブスタイルを流用）
  - 既存ページをimportして表示
  - URLは変更せず、既存ページを内部的に呼び出す

#### 1-2. 機能設定ページ（新規）
- **ファイルパス**: `/app/(authenticated)/settings/feature-settings/page.tsx`
- **実装内容**:
  - 勤怠管理と作業報告書へのナビゲーション
  - カード形式でリンク表示

#### 1-3. データ管理ページ（新規）
- **ファイルパス**: `/app/(authenticated)/settings/data-management/page.tsx`
- **実装内容**:
  - タブUIでデータエクスポートと監査ログを表示
  - 既存ページコンポーネントを再利用

### フェーズ2: 既存コンポーネントの再利用設定

#### 2-1. 各設定ページのコンポーネント化
- 既存ページのロジックはそのまま維持
- Server Componentの場合はClient Componentでラップ
- props経由でデータ受け渡し

#### 2-2. 勤怠管理設定の拡張
- `AttendanceSettingsUnified.tsx`に5番目のタブ「タブレット端末」を追加
- 既存の4タブは一切変更しない
- タブレット端末管理の内容を新タブに統合

### フェーズ3: サイドメニューの切り替え準備（競合回避）

#### 3-1. フィーチャーフラグの実装
```tsx
// lib/feature-flags.ts を新規作成
export const useNewSettingsMenu = () => {
  // 環境変数またはローカルストレージで制御
  if (typeof window !== 'undefined') {
    return localStorage.getItem('useNewSettingsMenu') === 'true'
  }
  return process.env.NEXT_PUBLIC_USE_NEW_SETTINGS_MENU === 'true'
}
```

#### 3-2. サイドメニューの条件分岐実装
```tsx
// components/Sidebar.tsx を修正
import { useNewSettingsMenu } from '@/lib/feature-flags'

// レンダリング部分（どちらか一方のみ表示で競合回避）
{useNewSettingsMenu() ? (
  // 新メニュー構造
  <div>
    <h3>設定・管理</h3>
    <Link href="/settings/organization-management">組織管理</Link>
    <Link href="/settings/feature-settings">機能設定</Link>
    <Link href="/settings">マイアカウント</Link>
    <Link href="/settings/data-management">データ管理</Link>
  </div>
) : (
  // 既存メニュー構造（現状のまま）
  <div>
    <h3>設定・管理</h3>
    <Link href="/organization">組織情報設定</Link>
    <Link href="/settings/locations">自社拠点管理</Link>
    {/* ... 既存の10項目 */}
  </div>
)}
```

#### 3-3. 権限チェックの維持
- 各メニュー項目の権限チェックはそのまま維持
- Admin限定、DXパック限定などの条件も継承

### フェーズ4: テスト期間（競合なしの安全な方法）

#### 4-1. 段階的テスト手順
1. **開発環境でのテスト（Day 4）**
   - フィーチャーフラグをONにして新メニューをテスト
   - フラグをOFFにして旧メニューが正常に動作することを確認
   - 同時に表示されないことで競合を完全に回避

2. **選択的ユーザーテスト（Day 5）**
   - 特定の管理者アカウントのみフラグをON
   - localStorage経由で個別に切り替え
   ```javascript
   // ブラウザコンソールで実行
   localStorage.setItem('useNewSettingsMenu', 'true')  // 新メニューに切り替え
   localStorage.setItem('useNewSettingsMenu', 'false') // 旧メニューに戻す
   ```

3. **全ユーザーへの段階展開（Day 6）**
   - 問題がなければ環境変数で全体切り替え
   - 問題があれば即座にフラグをOFFに

#### 4-2. 競合回避のメリット
- **URL競合なし**: 新旧メニューが同時に存在しないため、ルーティング競合が発生しない
- **状態管理の混乱なし**: 一度に1つのメニューのみアクティブ
- **デバッグが容易**: 問題が発生した場合、どちらのメニューが原因か明確
- **ユーザー体験の一貫性**: ユーザーは混乱することなく、一貫したUIを使用

#### 4-3. 動作確認チェックリスト
- [ ] 各設定項目が正常に表示される
- [ ] 設定変更が正しく保存される
- [ ] 権限チェックが正常に機能する
- [ ] モバイル表示が崩れていない
- [ ] パフォーマンスが劣化していない
- [ ] エラーログが発生していない
- [ ] 既存のURLアクセスが正常に動作する

### フェーズ5: 切り替え

#### 5-1. 旧メニューの非表示化
- サイドメニューから旧構造をコメントアウト
- 新構造のみ表示

#### 5-2. リダイレクト設定（必要に応じて）
- 旧URLから新URLへのリダイレクト設定
- ブックマークされている場合の対応

## 🎨 デザイン仕様

### タブUIのスタイル（既存を流用）
```tsx
// 既存の勤怠管理設定のタブスタイル
const tabActiveClass = "bg-blue-600 text-white"
const tabInactiveClass = "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
const tabBaseClass = "px-4 py-2 rounded-md text-sm font-medium transition-colors"
```

### カード表示のスタイル（既存を流用）
```tsx
// 既存の運用設定ページのカードスタイル
const cardClass = "bg-white overflow-hidden shadow rounded-lg"
const cardHeaderClass = "px-5 py-4 border-b border-gray-200"
const cardBodyClass = "px-5 py-4"
```

### レスポンシブ対応
- モバイル: タブは横スクロール可能に
- タブレット: 2列表示
- デスクトップ: フル幅表示

## 🔧 実装サンプル

### 組織管理ページの実装例
```tsx
// /app/(authenticated)/settings/organization-management/page.tsx
'use client'

import { useState } from 'react'
import { requireAuth } from '@/lib/auth/page-auth'

// タブ定義
const tabs = [
  { id: 'info', label: '組織情報', path: '/organization' },
  { id: 'locations', label: '自社拠点', path: '/settings/locations' },
  { id: 'staff', label: 'スタッフ管理', path: '/staff' },
  { id: 'operation', label: '業務運用ルール', path: '/settings/organization' }
]

export default function OrganizationManagementPage() {
  const [activeTab, setActiveTab] = useState('info')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      {/* タブナビゲーション */}
      <div className="mb-6">
        <div className="flex space-x-2 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* タブコンテンツ */}
      <div>
        {/* 各タブの内容を動的に表示 */}
      </div>
    </div>
  )
}
```

## ⚠️ リスク管理

### 想定リスクと対策

| リスク | 影響度 | 対策 |
|--------|--------|------|
| 既存機能が動かなくなる | 高 | 既存ページは変更せず、コンテナから呼び出すのみ |
| URLが変わって困る | 中 | 既存URLはそのまま維持、必要に応じてリダイレクト |
| スタイルが崩れる | 中 | 既存のCSSクラスをそのまま使用 |
| 権限チェック漏れ | 高 | 既存ページの権限チェックがそのまま機能 |
| ロールバックできない | 高 | フィーチャーフラグでいつでも切り替え可能 |
| 新旧メニューの競合 | 高 | フィーチャーフラグで一度に1つのみ表示 |
| パフォーマンス劣化 | 中 | 遅延読み込みとメモ化で対策 |

### 緊急時の対応

1. **即座のロールバック手順**
   - サイドメニューで旧構造を有効化
   - 新構造を無効化
   - キャッシュクリア

2. **問題発生時の連絡体制**
   - 開発チームへの即時通知
   - ユーザーへの告知方法

## 📈 成功指標

### 定量的指標
- ページ読み込み時間: 現状と同等以下
- エラー率: 0.1%以下
- 設定完了率: 現状と同等以上

### 定性的指標
- ユーザーから「わかりやすくなった」というフィードバック
- サポート問い合わせの減少
- 新規ユーザーの設定完了時間短縮

## 🚀 実装スケジュール

| フェーズ | 期間 | 内容 | ステータス |
|---------|------|------|-----------|
| フェーズ1 | Day 1 | 新規コンテナページ作成 | ✅ 完了 |
| フェーズ2 | Day 2 | 既存コンポーネント整理 | ✅ 完了 |
| フェーズ3 | Day 3 | サイドメニュー更新・並行稼働開始 | ✅ 完了 |
| フェーズ4 | Day 4-5 | テスト期間 | 🔄 準備完了 |
| フェーズ5 | Day 6 | 最終切り替え | ⏳ 未着手 |

## 📋 実装進捗詳細

### ✅ フェーズ1: 新規コンテナページの作成（完了）

- [x] **1-1. 組織管理ページ** (`/app/(authenticated)/settings/organization-management/page.tsx`)
  - タブUI実装
  - 権限チェック実装
  - 4つのタブへのナビゲーション機能

- [x] **1-2. 機能設定ページ** (`/app/(authenticated)/settings/feature-settings/page.tsx`)
  - DXパックチェック実装
  - カード形式のUI実装
  - 勤怠管理・作業報告書へのリンク

- [x] **1-3. データ管理ページ** (`/app/(authenticated)/settings/data-management/page.tsx`)
  - タブUI実装
  - データエクスポート・監査ログへのナビゲーション

### ✅ フェーズ2: 既存コンポーネントの統合（完了）

- [x] **2-1. 勤怠管理設定の拡張**
  - `AttendanceSettingsUnified.tsx`に5番目のタブ「タブレット端末」を追加
  - `AttendanceTerminalsTab.tsx`コンポーネント作成
  - `TerminalsTable`コンポーネントの再利用
  - 既存の4タブは無変更で維持

### ✅ フェーズ3: フィーチャーフラグとサイドメニュー（完了）

- [x] **3-1. フィーチャーフラグの実装**
  - `lib/feature-flags.ts`作成
  - `useNewSettingsMenu()`関数実装
  - デバッグ用関数（`enableNewSettingsMenu()`, `disableNewSettingsMenu()`）実装

- [x] **3-2. サイドメニューの条件分岐**
  - `components/Sidebar.tsx`にフィーチャーフラグ統合
  - 新旧メニュー構造の排他的表示実装
  - 既存メニュー構造を完全保持

### 🔄 フェーズ4: テスト期間（準備完了）

**テスト方法:**
```javascript
// ブラウザコンソールで実行
enableNewSettingsMenu()  // 新メニューに切り替え
location.reload()

disableNewSettingsMenu() // 旧メニューに戻す
location.reload()
```

**動作確認項目:**
- [ ] 新メニューが正しく表示される
- [ ] 組織管理ページの4つのタブが機能する
- [ ] 機能設定ページから勤怠管理・作業報告書にアクセスできる
- [ ] 勤怠管理設定に5つのタブ（タブレット端末含む）が表示される
- [ ] データ管理ページの2つのタブが機能する
- [ ] フィーチャーフラグで新旧切り替えができる
- [ ] 既存機能が正常に動作する
- [ ] モバイル表示が正常
- [ ] 権限チェックが機能する

### ⏳ フェーズ5: 最終切り替え（未着手）

本番環境への適用は、フェーズ4のテストが完了してから実施します。

## 📝 実装後の保守

### ドキュメント更新
- ユーザーマニュアルの更新
- 開発者向けドキュメントの更新
- CHANGELOGへの記載

### モニタリング
- エラー率の監視
- パフォーマンスメトリクスの確認
- ユーザーフィードバックの収集

## 🔍 競合回避の仕組み

### なぜ競合が起きないか

1. **フィーチャーフラグによる排他制御**
   - 新旧メニューは同時に表示されない
   - 常にどちらか一方のみがアクティブ

2. **独立したURLパス**
   - 新メニュー: `/settings/organization-management`など
   - 旧メニュー: `/organization`など
   - パスが異なるため、ルーティング競合なし

3. **既存ページの非破壊的利用**
   - 既存ページのコードは一切変更しない
   - 新ページから既存コンポーネントをimportするのみ

4. **段階的なテスト**
   - 個別アカウントでテスト可能
   - 問題があれば即座に旧メニューに戻せる

## ✅ 承認事項

この実装計画を進めるにあたり、以下の点について承認を得る必要があります：

1. フィーチャーフラグによる切り替え方式の採用
2. 新規ページの作成（3ページ）
3. 既存コンポーネントの再利用方針
4. 段階的テスト期間（3日間）の設定

---

**最終更新日**: 2026-01-28
**作成者**: Claude AI Assistant
**承認者**: （未承認）
**ステータス**: 実装完了（テスト待ち）
**実装完了日**: 2026-01-28