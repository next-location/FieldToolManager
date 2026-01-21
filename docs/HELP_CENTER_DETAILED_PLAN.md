# ヘルプセンター全面刷新 - 詳細実装計画書

**作成日**: 2026-01-22
**目的**: ヘルプセンター機能の完全な刷新と統合

---

## 📋 目次

1. [現状の詳細分析](#現状の詳細分析)
2. [画像リスト（ページ別・詳細版）](#画像リストページ別詳細版)
3. [実装計画（ステップバイステップ）](#実装計画ステップバイステップ)
4. [各ステップの詳細手順](#各ステップの詳細手順)
5. [移行後のクリーンアップ](#移行後のクリーンアップ)

---

## 現状の詳細分析

### 📁 現在のデータソース

#### 1. `content/manual/` - 現在表示中（不完全）

```
content/manual/
├── 00_public/          # 公開ページ用
│   ├── login/page.mdx  # ログイン方法
│   └── troubleshooting/page.mdx  # トラブルシューティング
└── 01_staff/           # スタッフ用（削除済み）
```

**問題点**:
- ❌ わずか2件のマニュアルのみ
- ❌ 充実したコンテンツ（66件）が未使用

#### 2. `docs/manual/` - 未使用（充実）

```
docs/manual/
├── *.md                # 43件の機能別マニュアル
├── scenarios/          # 23件のシチュエーション別マニュアル
│   ├── daily/          # 日常業務（3件）
│   ├── tool_operations/  # 道具管理（4件）
│   ├── document_flow/  # 書類作成（3件）
│   ├── admin_operations/  # 管理者向け（4件）
│   ├── security/       # セキュリティ（3件）
│   ├── mobile/         # モバイル（2件）
│   └── role_guides/    # 役割別（4件）
└── README.md           # マニュアル目次
```

**合計**: 66件の充実したマニュアル

#### 3. `docs/qa/` - 未使用（充実）

```
docs/qa/
├── staff/              # スタッフ向けQ&A（20件以上）
└── admin/              # 管理者向けQ&A（25件以上）
```

**合計**: 45件以上のQ&A

### 🌐 現在のページ構成

#### A. ログイン前（公開ページ）

**URL**: `https://zairoku.com/help/login`

**現在の実装**:
- `app/(public)/help/login/page.tsx` - ハードコードされたHTML
- `content/manual/00_public/login/page.mdx` - 未使用

**問題点**:
- ❌ MDXファイルと二重管理
- ❌ 更新が反映されない

#### B. ログイン後（認証済みページ）

**URL**: `https://サブドメイン.zairoku.com/manual`

**現在の実装**:
- `app/(authenticated)/manual/page.tsx` - 一覧ページ
- `app/(authenticated)/manual/[...slug]/page.tsx` - 詳細ページ
- `lib/manual/metadata.ts` - MDX読み込みロジック

**現在のデータソース**: `content/manual/`（2件のみ）

### 🎯 目指す姿

**統一されたデータソース**:
- `docs/manual/` → マニュアル66件
- `docs/qa/` → Q&A 45件以上

**すべてのページで同じデータを表示**:
- ログイン前ページ: `docs/manual/`から読み込み
- ログイン後ページ: `docs/manual/`から読み込み

---

## 画像リスト（ページ別・詳細版）

### 🔐 1. ログイン関連（6枚）✅

#### 画像1: login-screen-pc.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/login`
- **撮影内容**: ログイン画面全体（メールアドレス・パスワード入力フォーム）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/login/login-screen-pc.png`

#### 画像2: login-screen-mobile.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/login`
- **撮影内容**: モバイル版ログイン画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/login/login-screen-mobile.jpg`

#### 画像3: dashboard-after-login.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/`
- **撮影内容**: ログイン直後のダッシュボード画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/login/dashboard-after-login.png`

#### 画像4: dashboard-after-login-mobile.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/`
- **撮影内容**: モバイル版ダッシュボード
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/login/dashboard-after-login-mobile.jpg`

#### 画像5: password-forgot-form.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/auth/forgot-password`
- **撮影内容**: パスワードリセット申請画面（メールアドレス入力）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/login/password-forgot-form.png`

#### 画像6: password-reset-form.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/reset-password?token=...`
- **撮影内容**: 新しいパスワード設定画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/login/password-reset-form.png`

---

### 📱 2. QR関連（8枚）

#### 画像7: qr-scan-button.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/` (ホーム画面)
- **撮影内容**: ホーム画面でQRスキャンボタンが表示されている状態
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/qr/qr-scan-button.jpg`

#### 画像8: qr-scan-camera.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/` (QRスキャン画面)
- **撮影内容**: QRスキャンボタン押下後、カメラが起動した画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/qr/qr-scan-camera.jpg`

#### 画像9: qr-scan-success.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/` (QRスキャン成功画面)
- **撮影内容**: QRコードをスキャンした直後の成功メッセージ画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/qr/qr-scan-success.jpg`

#### 画像10: qr-code-sample-tool.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools` (道具詳細 > QR印刷プレビュー)
- **撮影内容**: 道具QRコードのサンプル（印刷プレビューまたはPDF）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/qr/qr-code-sample-tool.png`

#### 画像11: qr-code-sample-warehouse.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/warehouses` (倉庫詳細 > QR印刷プレビュー)
- **撮影内容**: 倉庫QRコードのサンプル（印刷プレビューまたはPDF）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/qr/qr-code-sample-warehouse.png`

#### 画像12: qr-scan-result-movement.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/` (QRスキャン後の移動登録画面)
- **撮影内容**: QRスキャン後の移動登録画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/qr/qr-scan-result-movement.jpg`

#### 画像13: camera-permission-ios.jpg
- **撮影デバイス**: スマホ (iPhone)
- **撮影URL**: `iPhone設定アプリ` (設定 > Safari > カメラ)
- **撮影内容**: iOSの設定画面でカメラ権限許可の設定箇所
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/qr/camera-permission-ios.jpg`

#### 画像14: camera-permission-android.jpg
- **撮影デバイス**: スマホ (Android)
- **撮影URL**: `Android設定アプリ` (設定 > アプリ > Chrome > 権限)
- **撮影内容**: Androidの設定画面でカメラ権限許可の設定箇所
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/qr/camera-permission-android.jpg`

---

### 🔧 3. 備品管理（8枚）

#### 画像15: tool-list.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools`
- **撮影内容**: 道具管理一覧ページ全体（テーブル表示）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/tools/tool-list.png`

#### 画像16: tool-register-button.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools`
- **撮影内容**: 道具一覧ページの「+ 新規登録」ボタンが見える状態
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/tools/tool-register-button.png`

#### 画像17: tool-register-form.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools/new`
- **撮影内容**: 道具登録フォーム（全項目表示）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/tools/tool-register-form.png`

#### 画像18: tool-edit.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools/[id]/edit`
- **撮影内容**: 既存道具の編集画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/tools/tool-edit.png`

#### 画像19: tool-detail.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools/[id]`
- **撮影内容**: 道具詳細モーダルまたはページ
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/tools/tool-detail.png`

#### 画像20: tool-movement-history.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools/[id]` (移動履歴タブ)
- **撮影内容**: 道具詳細内の「移動履歴」タブ
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/tools/tool-movement-history.png`

#### 画像21: tool-category-select.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools/new`
- **撮影内容**: カテゴリ選択ドロップダウンが開いた状態
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/tools/tool-category-select.png`

#### 画像22: tool-filter.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools`
- **撮影内容**: フィルターパネルが展開された状態
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/tools/tool-filter.png`

---

### 🖨️ 4. QR印刷（6枚）

#### 画像23: qr-print-settings.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools/[id]` (QR印刷モーダル)
- **撮影内容**: 道具詳細 > QRコード印刷ボタンをクリック後の設定画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/print/qr-print-settings.png`

#### 画像24: qr-size-selection.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/settings/organization`
- **撮影内容**: 運用設定 > 組織情報 > QRコード印刷サイズ設定画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/print/qr-size-selection.png`

#### 画像25: qr-bulk-print-select.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools/bulk-qr-print`
- **撮影内容**: 道具管理 > 道具QR一括印刷 > 道具選択画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/print/qr-bulk-print-select.png`

#### 画像26: qr-bulk-print-preview.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/tools/bulk-qr-print` (プレビュー)
- **撮影内容**: 一括印刷のプレビュー画面（A4レイアウト表示）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/print/qr-bulk-print-preview.png`

#### 画像27: qr-print-result-sample.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `実物撮影` (印刷したQRコードを撮影)
- **撮影内容**: 実際に印刷したQRコードの写真
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/print/qr-print-result-sample.jpg`

#### 画像28: qr-attached-tool.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `実物撮影` (現場で工具を撮影)
- **撮影内容**: 工具にQRコードを貼り付けた状態の写真
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/print/qr-attached-tool.jpg`

---

### ⏰ 5. 勤怠管理（7枚）

#### 画像29: attendance-home-button.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/` (ホーム画面)
- **撮影内容**: モバイルホーム画面で「出退勤」ボタンが見える状態
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/attendance/attendance-home-button.jpg`

#### 画像30: attendance-clock-in-before.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/attendance/clock`
- **撮影内容**: 出退勤ページ（出勤前、「出勤」ボタンが表示）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/attendance/attendance-clock-in-before.jpg`

#### 画像31: attendance-clock-in-success.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/attendance/clock` (出勤後)
- **撮影内容**: 出勤ボタンを押した直後の成功メッセージ
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/attendance/attendance-clock-in-success.jpg`

#### 画像32: attendance-clock-out-button.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/attendance/clock` (出勤済み)
- **撮影内容**: 出勤済み状態（「退勤」ボタンが表示）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/attendance/attendance-clock-out-button.jpg`

#### 画像33: attendance-clock-out-success.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/attendance/clock` (退勤後)
- **撮影内容**: 退勤ボタンを押した直後の成功メッセージ
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/attendance/attendance-clock-out-success.jpg`

#### 画像34: attendance-list-staff.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/attendance`
- **撮影内容**: 出退勤管理 > 自分の勤怠一覧画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/attendance/attendance-list-staff.png`

#### 画像35: attendance-qr-scan.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/` (QRスキャン)
- **撮影内容**: 出退勤QRコードをスキャンしている画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/attendance/attendance-qr-scan.jpg`

---

### 📋 6. 見積書（6枚）

#### 画像36: estimate-list.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/estimates`
- **撮影内容**: 書類管理 > 見積書一覧ページ全体
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/documents/estimate-list.png`

#### 画像37: estimate-create-button.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/estimates`
- **撮影内容**: 見積書一覧の「+ 新規見積書」ボタンが見える状態
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/documents/estimate-create-button.png`

#### 画像38: estimate-create-form-basic.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/estimates/new`
- **撮影内容**: 見積書作成フォーム（基本情報タブ）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/documents/estimate-create-form-basic.png`

#### 画像39: estimate-create-form-items.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/estimates/new` (明細タブ)
- **撮影内容**: 見積書作成フォーム（明細入力セクション）
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/documents/estimate-create-form-items.png`

#### 画像40: estimate-preview.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/estimates/[id]/preview`
- **撮影内容**: 見積書プレビュー画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/documents/estimate-preview.png`

#### 画像41: estimate-pdf-output.png
- **撮影デバイス**: PC
- **撮影URL**: `PDF表示画面` (見積書PDF出力後)
- **撮影内容**: PDF出力後のプレビュー
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/documents/estimate-pdf-output.png`

---

### 📄 7. 請求書（4枚）

#### 画像42: invoice-list.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/invoices`
- **撮影内容**: 書類管理 > 請求書一覧ページ
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/documents/invoice-list.png`

#### 画像43: invoice-create-from-estimate.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/estimates/[id]`
- **撮影内容**: 見積書詳細 > 「請求書に変換」ボタンが見える画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/documents/invoice-create-from-estimate.png`

#### 画像44: invoice-create-form.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/invoices/new`
- **撮影内容**: 請求書作成フォーム
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/documents/invoice-create-form.png`

#### 画像45: invoice-preview.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/invoices/[id]/preview`
- **撮影内容**: 請求書プレビュー画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/documents/invoice-preview.png`

---

### 👥 8. 従業員管理（5枚）

#### 画像46: staff-list.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/settings/staff`
- **撮影内容**: 設定 > スタッフ管理 > 一覧ページ
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/settings/staff-list.png`

#### 画像47: staff-add-button.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/settings/staff`
- **撮影内容**: スタッフ一覧の「+ スタッフを追加」ボタンが見える状態
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/settings/staff-add-button.png`

#### 画像48: staff-add-form.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/settings/staff/new`
- **撮影内容**: スタッフ追加フォーム
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/settings/staff-add-form.png`

#### 画像49: staff-detail.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/settings/staff/[id]`
- **撮影内容**: スタッフ詳細画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/settings/staff-detail.png`

#### 画像50: staff-edit.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/settings/staff/[id]/edit`
- **撮影内容**: スタッフ編集画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/settings/staff-edit.png`

---

### 📊 9. データエクスポート（4枚）

#### 画像51: data-export-page.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/settings/export`
- **撮影内容**: 設定 > データエクスポートページ全体
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/settings/data-export-page.png`

#### 画像52: data-export-button.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/settings/export`
- **撮影内容**: 「CSVエクスポート」ボタンのクローズアップ
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/settings/data-export-button.png`

#### 画像53: data-export-success.png
- **撮影デバイス**: PC
- **撮影URL**: `https://サブドメイン.zairoku.com/settings/export` (エクスポート後)
- **撮影内容**: エクスポート成功後の緑色メッセージ
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/settings/data-export-success.png`

#### 画像54: data-export-csv-sample.png
- **撮影デバイス**: PC
- **撮影URL**: `Excelアプリ` (エクスポートしたCSVを開く)
- **撮影内容**: エクスポートしたCSVファイルをExcelで開いた画面
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/settings/data-export-csv-sample.png`

---

### 📱 10. モバイル版（5枚）

#### 画像55: mobile-bottom-nav-asset.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/` (現場資産パック契約組織)
- **撮影内容**: 現場資産パック契約組織でモバイル画面下部ナビ
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/mobile/mobile-bottom-nav-asset.jpg`

#### 画像56: mobile-bottom-nav-dx.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/` (DX効率化パック契約組織)
- **撮影内容**: DX効率化パック契約組織でモバイル画面下部ナビ
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/mobile/mobile-bottom-nav-dx.jpg`

#### 画像57: mobile-sidebar-menu.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/` (サイドバー展開)
- **撮影内容**: 左上メニューアイコンをタップ後のサイドバー
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/mobile/mobile-sidebar-menu.jpg`

#### 画像58: mobile-home-shortcuts.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/`
- **撮影内容**: モバイルホーム画面のショートカットカード
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/mobile/mobile-home-shortcuts.jpg`

#### 画像59: mobile-notifications.jpg
- **撮影デバイス**: スマホ
- **撮影URL**: `https://サブドメイン.zairoku.com/` (通知パネル)
- **撮影内容**: 右上の通知アイコンをタップ後の通知一覧
- **保存先**: `/Users/youichiakashi/FieldToolManager/public/images/manual/mobile/mobile-notifications.jpg`

---

### 📊 画像リスト統計

**合計画像数**: 59枚

**デバイス別**:
- PC (PNG): 34枚
- スマホ (JPG): 25枚

**カテゴリ別**:
- 🔐 ログイン関連: 6枚
- 📱 QR関連: 8枚
- 🔧 備品管理: 8枚
- 🖨️ QR印刷: 6枚
- ⏰ 勤怠管理: 7枚
- 📋 見積書: 6枚
- 📄 請求書: 4枚
- 👥 従業員管理: 5枚
- 📊 データエクスポート: 4枚
- 📱 モバイル版: 5枚

**ディレクトリ別**:
- `/public/images/manual/login/`: 6枚
- `/public/images/manual/qr/`: 8枚
- `/public/images/manual/tools/`: 8枚
- `/public/images/manual/print/`: 6枚
- `/public/images/manual/attendance/`: 7枚
- `/public/images/manual/documents/`: 10枚
- `/public/images/manual/settings/`: 9枚
- `/public/images/manual/mobile/`: 5枚

---

## 実装計画（ステップバイステップ）

### 🎯 全体スケジュール

| ステップ | 内容 | 期間 | 依存関係 |
|---------|------|------|----------|
| Step 1 | Frontmatter一括追加 | 0.5日 | なし |
| Step 2 | データソース切り替え | 0.5日 | Step 1 |
| Step 3 | ログイン前ページ改修 | 1日 | Step 2 |
| Step 4 | 動作確認とテスト | 0.5日 | Step 3 |
| Step 5 | 画像撮影（優先度A） | 1-2日 | 並行可能 |
| Step 6 | デザイン刷新 | 2-3日 | Step 4 |
| Step 7 | 検索機能強化 | 1日 | Step 6 |
| Step 8 | 画像配置と最適化 | 1日 | Step 5, 7 |
| Step 9 | 最終テストと調整 | 1日 | Step 8 |
| Step 10 | クリーンアップ | 0.5日 | Step 9 |

**合計**: 8-10日

---

## 各ステップの詳細手順

### Step 1: Frontmatter一括追加（0.5日）

#### 目的
`docs/manual/`と`docs/qa/`の全MDファイルにFrontmatterを追加

#### 作業内容

**1-1. Frontmatter追加スクリプトの作成**

`scripts/add-frontmatter.js`:
```javascript
const fs = require('fs')
const path = require('path')

// マニュアルファイルのメタデータマッピング
const manualMetadata = {
  'login.md': {
    title: 'ログイン方法',
    description: 'ザイロクへのログイン手順を説明します',
    permission: 0,
    tags: ['ログイン', '基本操作'],
  },
  'qr_scan.md': {
    title: 'QRスキャン',
    description: 'QRコードを使った道具の持ち出し・返却',
    permission: 1,
    tags: ['QR', '道具管理', '基本操作'],
  },
  'tool_management.md': {
    title: '道具管理',
    description: '道具の登録・編集・削除、在庫管理',
    permission: 3,
    tags: ['道具管理', 'マスタ管理'],
  },
  // ... 他のファイルも同様に定義
}

// Q&Aファイルのメタデータマッピング
const qaMetadata = {
  'staff/login_issues.md': {
    title: 'ログインのトラブルシューティング',
    description: 'ログインできない場合の対処法',
    permission: 0,
    tags: ['ログイン', 'トラブルシューティング'],
  },
  // ... 他のファイルも同様に定義
}

function addFrontmatter(filePath, metadata, category) {
  const content = fs.readFileSync(filePath, 'utf8')

  // 既にFrontmatterがある場合はスキップ
  if (content.startsWith('---')) {
    console.log(`Skipped (already has frontmatter): ${filePath}`)
    return
  }

  const frontmatter = `---
title: "${metadata.title}"
description: "${metadata.description}"
permission: ${metadata.permission}
plans: ["basic"]
category: "${category}"
tags: ${JSON.stringify(metadata.tags)}
lastUpdated: "${new Date().toISOString().split('T')[0]}"
---

`

  const newContent = frontmatter + content
  fs.writeFileSync(filePath, newContent, 'utf8')
  console.log(`Added frontmatter: ${filePath}`)
}

// メイン処理
function main() {
  // docs/manual/のMDファイルを処理
  Object.keys(manualMetadata).forEach(file => {
    const filePath = path.join(__dirname, '..', 'docs', 'manual', file)
    if (fs.existsSync(filePath)) {
      addFrontmatter(filePath, manualMetadata[file], 'manual')
    }
  })

  // docs/qa/のMDファイルを処理
  Object.keys(qaMetadata).forEach(file => {
    const filePath = path.join(__dirname, '..', 'docs', 'qa', file)
    if (fs.existsSync(filePath)) {
      addFrontmatter(filePath, qaMetadata[file], 'qa')
    }
  })
}

main()
```

**1-2. スクリプトの実行**

```bash
# scriptsディレクトリ作成
mkdir -p scripts

# スクリプト作成
# （上記のコードをscripts/add-frontmatter.jsに保存）

# 実行
node scripts/add-frontmatter.js
```

**1-3. 確認**

```bash
# いくつかのファイルを確認
head -20 docs/manual/login.md
head -20 docs/manual/qr_scan.md
head -20 docs/qa/staff/login_issues.md
```

#### 成果物
- ✅ `docs/manual/`の全66件のMDファイルにFrontmatter追加
- ✅ `docs/qa/`の全45件以上のMDファイルにFrontmatter追加

---

### Step 2: データソース切り替え（0.5日）

#### 目的
`lib/manual/metadata.ts`を修正し、`docs/`からデータを読み込む

#### 作業内容

**2-1. metadata.tsの修正**

`lib/manual/metadata.ts`:
```typescript
// 変更前
const manualDir = path.join(process.cwd(), 'content', 'manual')
const qaDir = path.join(process.cwd(), 'content', 'qa')

// 変更後
const manualDir = path.join(process.cwd(), 'docs', 'manual')
const qaDir = path.join(process.cwd(), 'docs', 'qa')
```

**2-2. 動作確認**

```bash
# 開発サーバー起動
npm run dev

# ブラウザで確認
# http://localhost:3000/manual
```

**2-3. 確認項目**
- ✅ マニュアル一覧に66件表示されるか
- ✅ 各マニュアルが正しく表示されるか
- ✅ Q&A一覧に45件以上表示されるか

#### 成果物
- ✅ `lib/manual/metadata.ts`の修正完了
- ✅ ログイン後のヘルプセンターが正常動作

---

### Step 3: ログイン前ページ改修（1日）

#### 目的
`app/(public)/help/login/page.tsx`を動的にする

#### 作業内容

**3-1. 公開ページ用のメタデータ読み込み関数作成**

`lib/manual/public-metadata.ts`:
```typescript
import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import remarkGfm from 'remark-gfm'
import remarkHtml from 'remark-html'

export async function getPublicManualArticle(slug: string) {
  const filePath = path.join(process.cwd(), 'docs', 'manual', `${slug}.md`)

  if (!fs.existsSync(filePath)) {
    return null
  }

  const fileContents = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(fileContents)

  // MarkdownをHTMLに変換
  const result = await remark()
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .process(content)

  return {
    frontmatter: data,
    content: result.toString(),
  }
}
```

**3-2. ログインページの改修**

`app/(public)/help/login/page.tsx`:
```typescript
import Link from 'next/link'
import Image from 'next/image'
import { getPublicManualArticle } from '@/lib/manual/public-metadata'
import { notFound } from 'next/navigation'

export default async function HelpLoginPage() {
  const article = await getPublicManualArticle('login')

  if (!article) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src="/images/zairoku-logo.png"
                alt="ザイロク"
                width={120}
                height={30}
                className="h-8 w-auto"
              />
              <span className="text-sm text-gray-600">ヘルプセンター</span>
            </div>
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            >
              ログインページに戻る
            </Link>
          </div>
        </div>
      </header>

      {/* コンテンツ */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <article className="prose prose-blue max-w-none bg-white rounded-lg shadow-sm p-8">
          <div dangerouslySetInnerHTML={{ __html: article.content }} />
        </article>

        {/* フッター */}
        <div className="mt-8 text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg
              className="mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            ログインページに戻る
          </Link>
        </div>
      </main>
    </div>
  )
}
```

**3-3. 他の公開ページも同様に改修**

必要に応じて、`/help/troubleshooting`などのページも作成

#### 成果物
- ✅ `lib/manual/public-metadata.ts`の作成
- ✅ `app/(public)/help/login/page.tsx`の改修
- ✅ `docs/manual/login.md`から動的に読み込み

---

### Step 4: 動作確認とテスト（0.5日）

#### 確認項目

**4-1. ログイン前ページ**
- ✅ `/help/login`が正しく表示される
- ✅ `docs/manual/login.md`の内容が反映されている
- ✅ 画像パス（まだ画像がない場合は代替テキスト）が正しい

**4-2. ログイン後ページ**
- ✅ `/manual`に66件のマニュアルが表示される
- ✅ `/manual/login`などの詳細ページが正しく表示される
- ✅ Q&Aページに45件以上のQ&Aが表示される

**4-3. 権限チェック**
- ✅ Staff権限で表示されるマニュアルが正しい
- ✅ Manager権限で表示されるマニュアルが増える
- ✅ Admin権限ですべてのマニュアルが表示される

---

### Step 5: 画像撮影（1-2日）

#### 撮影環境の準備

**5-1. 開発環境**
- ✅ ローカル開発サーバー起動: `npm run dev`
- ✅ テストデータの準備（道具、スタッフ、見積書など）

**5-2. スクリーンショットツール**
- **PC**: ブラウザの開発者ツール（Cmd+Shift+P > Capture screenshot）
- **スマホ**: iPhoneシミュレータ、Android Emulator、または実機

**5-3. 撮影手順書の作成**

`scripts/screenshot-guide.md`に上記の詳細手順を記載

#### 優先度Aの画像撮影（30枚）

**第1優先（即座に必要）**:
1. login-screen-pc.png
2. login-screen-mobile.png
3. dashboard-after-login.png
4. qr-scan-camera.png
5. qr-scan-success.png
6. tool-list.png
7. tool-register-form.png
8. tool-movement-history.png
9. attendance-clock-in-before.png
10. attendance-clock-in-success.png
11. estimate-list.png
12. estimate-create-form-basic.png
13. invoice-list.png
14. invoice-create-from-estimate.png
15. staff-list.png
16. data-export-page.png

**第2優先**:
17. password-reset.png
18. qr-code-sample-tool.png
19. qr-print-settings.png
20. qr-bulk-print-preview.png
21. attendance-list-staff.png
22. mobile-bottom-nav-asset.png
23. mobile-sidebar-menu.png
... （残り8枚）

#### 成果物
- ✅ 優先度Aの画像30枚を撮影
- ✅ `/public/images/manual/`に保存
- ✅ ファイル名・サイズが仕様通り

---

### Step 6: デザイン刷新（2-3日）

（詳細は次のセクションで説明）

---

### Step 7: 検索機能強化（1日）

（詳細は次のセクションで説明）

---

### Step 8: 画像配置と最適化（1日）

#### 画像の配置

**8-1. Markdown内の画像パス修正**

`docs/manual/login.md`:
```markdown
<!-- 変更前 -->
![ログイン画面](/images/manual/login-screen-pc.png)

<!-- 変更後（サイズ指定） -->
<img src="/images/manual/login/login-screen-pc.png" width="700" alt="ログイン画面（PC）" />
```

**8-2. 画像最適化スクリプト**

```javascript
// scripts/optimize-images.js
const sharp = require('sharp')

// 全画像を最適化
// - WebP形式に変換
// - サイズを指定サイズにリサイズ
// - 圧縮
```

#### 成果物
- ✅ 全マニュアルの画像パス修正
- ✅ 画像最適化完了

---

### Step 9: 最終テストと調整（1日）

#### テスト項目
- ✅ 全ページの動作確認
- ✅ 画像の表示確認
- ✅ 検索機能の動作確認
- ✅ モバイル表示の確認
- ✅ パフォーマンステスト

---

### Step 10: クリーンアップ（0.5日）

#### 削除対象

**10-1. content/manual/の削除**

```bash
# バックアップ作成
mv content/manual content/manual.backup

# 削除
rm -rf content/manual.backup
```

**10-2. 不要なファイルの削除**

```bash
# content/ディレクトリが空なら削除
rm -rf content/
```

#### 成果物
- ✅ `content/manual/`の削除完了
- ✅ 不要ファイルの削除完了

---

## 移行後のクリーンアップ

### 削除するファイル・ディレクトリ

```
content/
└── manual/
    ├── 00_public/
    │   ├── login/page.mdx
    │   └── troubleshooting/page.mdx
    └── (削除済み) 01_staff/
```

### 削除コマンド

```bash
# バックアップ作成（念のため）
mkdir -p backups
cp -r content/manual backups/manual-backup-$(date +%Y%m%d)

# 削除
rm -rf content/manual

# contentディレクトリが空なら削除
rmdir content/ 2>/dev/null || echo "content/には他のファイルが残っています"
```

---

## まとめ

### ✅ 実装後の状態

**データソース**:
- `docs/manual/` → 66件のマニュアル
- `docs/qa/` → 45件以上のQ&A

**すべてのページで統一**:
- ログイン前: `/help/login` → `docs/manual/login.md`
- ログイン後: `/manual/login` → `docs/manual/login.md`

**画像管理**:
- `/public/images/manual/` → 60枚の画像（優先度A: 30枚から開始）

**削除済み**:
- `content/manual/` → 削除完了

### 📊 工数見積もり（再掲）

| ステップ | 期間 |
|---------|------|
| Step 1-4 | 2.5日 |
| Step 5 | 1-2日（並行） |
| Step 6-7 | 3-4日 |
| Step 8-10 | 2.5日 |
| **合計** | **8-10日** |

---

**最終更新日**: 2026-01-22
