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

### 📖 マニュアル別 画像一覧

#### 1. ログイン方法（`login.md`）

**ページURL**:
- ログイン前: `/help/login`
- ログイン後: `/manual/login`

**必要な画像**:

| # | ファイル名 | 保存先 | 表示箇所 | サイズ | 優先度 |
|---|----------|--------|----------|--------|--------|
| 1-1 | `login-screen-pc.png` | `/public/images/manual/login/` | 「ログイン画面へのアクセス > PCの場合」セクション | 1200×800px | 🔴 最優先 |
| 1-2 | `login-screen-mobile.png` | `/public/images/manual/login/` | 「ログイン画面へのアクセス > スマートフォンの場合」セクション | 375×667px | 🔴 最優先 |
| 1-3 | `dashboard-after-login.png` | `/public/images/manual/login/` | 「ログイン手順 > 4. ログイン完了」セクション（PC） | 1200×800px | 🔴 最優先 |
| 1-4 | `dashboard-after-login-mobile.png` | `/public/images/manual/login/` | 「ログイン手順 > 4. ログイン完了」セクション（スマホ） | 375×667px | 🔴 最優先 |
| 1-5 | `password-reset.png` | `/public/images/manual/login/` | 「ログインできない場合 > ケース2: パスワードを忘れた」セクション | 800×600px | 🔴 最優先 |
| 1-6 | `password-set-email.png` | `/public/images/manual/login/` | 「初回ログイン時の注意点 > パスワード設定」セクション（招待メール画面） | 600×400px | 🟡 高 |
| 1-7 | `password-set-form.png` | `/public/images/manual/login/` | 「初回ログイン時の注意点 > パスワード設定」セクション（パスワード設定フォーム） | 600×500px | 🟡 高 |

**スクリーンショット撮影手順**:
1. `login-screen-pc.png`: `https://zairoku.com/login` をPC（1920×1080）で開き、ログインフォーム全体をキャプチャ
2. `login-screen-mobile.png`: 同じページをスマホ（iPhone 13サイズ）で開き、縦向きでキャプチャ
3. `dashboard-after-login.png`: ログイン後のダッシュボード画面（PC）をキャプチャ
4. `dashboard-after-login-mobile.png`: ダッシュボード画面（スマホ）をキャプチャ
5. `password-reset.png`: ログイン画面の「パスワードをお忘れですか？」リンクをクリック後の画面
6. `password-set-email.png`: 招待メールのサンプル（Supabase Auth メール画面）
7. `password-set-form.png`: パスワード設定画面（新規パスワード入力フォーム）

---

#### 2. QRスキャン（`qr_scan.md`）

**ページURL**: `/manual/qr_scan`

**必要な画像**:

| # | ファイル名 | 保存先 | 表示箇所 | サイズ | 優先度 |
|---|----------|--------|----------|--------|--------|
| 2-1 | `qr-scan-button.png` | `/public/images/manual/qr/` | 「QRスキャンボタンの場所」セクション（ホーム画面） | 375×667px | 🔴 最優先 |
| 2-2 | `qr-scan-camera.png` | `/public/images/manual/qr/` | 「QRスキャン手順 > 2. カメラ起動」セクション | 375×667px | 🔴 最優先 |
| 2-3 | `qr-scan-success.png` | `/public/images/manual/qr/` | 「QRスキャン手順 > 4. スキャン成功」セクション | 375×667px | 🔴 最優先 |
| 2-4 | `qr-code-sample-tool.png` | `/public/images/manual/qr/` | 「QRコードの種類 > 道具QR」セクション | 200×200px | 🔴 最優先 |
| 2-5 | `qr-code-sample-warehouse.png` | `/public/images/manual/qr/` | 「QRコードの種類 > 倉庫QR」セクション | 200×200px | 🟡 高 |
| 2-6 | `qr-scan-result-movement.png` | `/public/images/manual/qr/` | 「スキャン後の画面」セクション（移動登録画面） | 375×667px | 🟡 高 |
| 2-7 | `camera-permission-ios.png` | `/public/images/manual/qr/` | 「トラブルシューティング > カメラ権限」セクション（iOS設定画面） | 375×667px | 🟢 中 |
| 2-8 | `camera-permission-android.png` | `/public/images/manual/qr/` | 「トラブルシューティング > カメラ権限」セクション（Android設定画面） | 375×667px | 🟢 中 |

**スクリーンショット撮影手順**:
1. `qr-scan-button.png`: ホーム画面でQRスキャンボタンが表示されている状態をキャプチャ
2. `qr-scan-camera.png`: QRスキャンボタン押下後、カメラが起動した画面
3. `qr-scan-success.png`: QRコードをスキャンした直後の成功メッセージ画面
4. `qr-code-sample-tool.png`: 道具QRコードのサンプル（印刷またはPDF）
5. `qr-code-sample-warehouse.png`: 倉庫QRコードのサンプル
6. `qr-scan-result-movement.png`: スキャン後の移動登録画面
7. `camera-permission-ios.png`: iOSの設定 > Safari > カメラ画面
8. `camera-permission-android.png`: Androidの設定 > アプリ > Chrome > 権限画面

---

#### 3. 道具管理（`tool_management.md`）

**ページURL**: `/manual/tool_management`

**必要な画像**:

| # | ファイル名 | 保存先 | 表示箇所 | サイズ | 優先度 |
|---|----------|--------|----------|--------|--------|
| 3-1 | `tool-list.png` | `/public/images/manual/tools/` | 「道具一覧画面」セクション | 1200×800px | 🔴 最優先 |
| 3-2 | `tool-register-button.png` | `/public/images/manual/tools/` | 「道具登録の手順 > 1. 登録ボタンをクリック」セクション | 1200×800px | 🔴 最優先 |
| 3-3 | `tool-register-form.png` | `/public/images/manual/tools/` | 「道具登録の手順 > 2. 登録フォーム」セクション | 1200×800px | 🔴 最優先 |
| 3-4 | `tool-edit.png` | `/public/images/manual/tools/` | 「道具編集の手順」セクション | 1200×800px | 🟡 高 |
| 3-5 | `tool-detail.png` | `/public/images/manual/tools/` | 「道具詳細画面」セクション | 1200×800px | 🟡 高 |
| 3-6 | `tool-movement-history.png` | `/public/images/manual/tools/` | 「移動履歴の確認」セクション | 1200×800px | 🔴 最優先 |
| 3-7 | `tool-category-select.png` | `/public/images/manual/tools/` | 「カテゴリ選択」セクション | 600×400px | 🟢 中 |
| 3-8 | `tool-filter.png` | `/public/images/manual/tools/` | 「フィルター機能」セクション | 1200×800px | 🟢 中 |

**スクリーンショット撮影手順**:
1. `tool-list.png`: 道具管理 > 道具一覧ページ全体
2. `tool-register-button.png`: 道具一覧ページの「+ 新規登録」ボタンが見える状態
3. `tool-register-form.png`: 道具登録フォーム（全項目表示）
4. `tool-edit.png`: 既存道具の編集画面
5. `tool-detail.png`: 道具詳細モーダルまたはページ
6. `tool-movement-history.png`: 道具詳細内の「移動履歴」タブ
7. `tool-category-select.png`: カテゴリ選択ドロップダウンが開いた状態
8. `tool-filter.png`: フィルターパネルが展開された状態

---

#### 4. QRコード印刷（`scenarios/mobile/qr_code_guide.md`）

**ページURL**: `/manual/scenarios/mobile/qr_code_guide`

**必要な画像**:

| # | ファイル名 | 保存先 | 表示箇所 | サイズ | 優先度 |
|---|----------|--------|----------|--------|--------|
| 4-1 | `qr-print-settings.png` | `/public/images/manual/qr/` | 「QRコード印刷設定」セクション | 1200×800px | 🔴 最優先 |
| 4-2 | `qr-size-selection.png` | `/public/images/manual/qr/` | 「QRサイズ選択」セクション（運用設定 > 組織情報） | 1200×800px | 🔴 最優先 |
| 4-3 | `qr-bulk-print-select.png` | `/public/images/manual/qr/` | 「一括印刷 > 道具選択」セクション | 1200×800px | 🟡 高 |
| 4-4 | `qr-bulk-print-preview.png` | `/public/images/manual/qr/` | 「一括印刷 > プレビュー」セクション（A4レイアウト表示） | 1200×1600px | 🔴 最優先 |
| 4-5 | `qr-print-result-sample.png` | `/public/images/manual/qr/` | 「印刷結果サンプル」セクション（実際に印刷したQRコード） | 800×1000px | 🟡 高 |
| 4-6 | `qr-attached-tool.jpg` | `/public/images/manual/qr/` | 「QRコードの貼り付け例」セクション（工具にQR貼付した写真） | 800×600px | 🟢 中 |

**スクリーンショット撮影手順**:
1. `qr-print-settings.png`: 道具詳細 > QRコード印刷ボタンをクリック後の設定画面
2. `qr-size-selection.png`: 運用設定 > 組織情報 > QRコード印刷サイズ設定画面
3. `qr-bulk-print-select.png`: 道具管理 > 道具QR一括印刷 > 道具選択画面
4. `qr-bulk-print-preview.png`: 一括印刷のプレビュー画面（A4レイアウト）
5. `qr-print-result-sample.png`: 実際に印刷したQRコードをスキャン（または写真撮影）
6. `qr-attached-tool.jpg`: 工具にQRコードを貼り付けた状態の写真（現場で撮影）

---

#### 5. 出退勤打刻（`attendance_clock.md`）

**ページURL**: `/manual/attendance_clock`

**必要な画像**:

| # | ファイル名 | 保存先 | 表示箇所 | サイズ | 優先度 |
|---|----------|--------|----------|--------|--------|
| 5-1 | `attendance-home-button.png` | `/public/images/manual/attendance/` | 「出退勤ボタンの場所」セクション（ホーム画面） | 375×667px | 🔴 最優先 |
| 5-2 | `attendance-clock-in-before.png` | `/public/images/manual/attendance/` | 「出勤打刻前の画面」セクション | 375×667px | 🔴 最優先 |
| 5-3 | `attendance-clock-in-success.png` | `/public/images/manual/attendance/` | 「出勤打刻成功」セクション | 375×667px | 🔴 最優先 |
| 5-4 | `attendance-clock-out-button.png` | `/public/images/manual/attendance/` | 「退勤打刻ボタン」セクション（出勤済み状態） | 375×667px | 🟡 高 |
| 5-5 | `attendance-clock-out-success.png` | `/public/images/manual/attendance/` | 「退勤打刻成功」セクション | 375×667px | 🟡 高 |
| 5-6 | `attendance-list-staff.png` | `/public/images/manual/attendance/` | 「勤怠一覧の確認」セクション（スタッフ本人の一覧） | 1200×800px | 🔴 最優先 |
| 5-7 | `attendance-qr-scan.png` | `/public/images/manual/attendance/` | 「QRコードでの出退勤」セクション（QRスキャン画面） | 375×667px | 🟡 高 |

**スクリーンショット撮影手順**:
1. `attendance-home-button.png`: モバイルホーム画面で「出退勤」ボタンが見える状態
2. `attendance-clock-in-before.png`: 出退勤ページ（出勤前、「出勤」ボタンが表示）
3. `attendance-clock-in-success.png`: 出勤ボタンを押した直後の成功メッセージ
4. `attendance-clock-out-button.png`: 出勤済み状態（「退勤」ボタンが表示）
5. `attendance-clock-out-success.png`: 退勤ボタンを押した直後の成功メッセージ
6. `attendance-list-staff.png`: 出退勤管理 > 自分の勤怠一覧画面
7. `attendance-qr-scan.png`: 出退勤QRコードをスキャンしている画面

---

#### 6. 見積書作成（`estimates_create.md`）

**ページURL**: `/manual/estimates_create`

**必要な画像**:

| # | ファイル名 | 保存先 | 表示箇所 | サイズ | 優先度 |
|---|----------|--------|----------|--------|--------|
| 6-1 | `estimate-list.png` | `/public/images/manual/documents/` | 「見積書一覧画面」セクション | 1200×800px | 🔴 最優先 |
| 6-2 | `estimate-create-button.png` | `/public/images/manual/documents/` | 「新規作成ボタン」セクション | 1200×800px | 🔴 最優先 |
| 6-3 | `estimate-create-form-basic.png` | `/public/images/manual/documents/` | 「基本情報入力」セクション | 1200×800px | 🔴 最優先 |
| 6-4 | `estimate-create-form-items.png` | `/public/images/manual/documents/` | 「明細入力」セクション | 1200×800px | 🟡 高 |
| 6-5 | `estimate-preview.png` | `/public/images/manual/documents/` | 「プレビュー」セクション | 1200×1600px | 🟡 高 |
| 6-6 | `estimate-pdf-output.png` | `/public/images/manual/documents/` | 「PDF出力」セクション | 800×1000px | 🟢 中 |

**スクリーンショット撮影手順**:
1. `estimate-list.png`: 書類管理 > 見積書一覧ページ
2. `estimate-create-button.png`: 見積書一覧の「+ 新規見積書」ボタンが見える状態
3. `estimate-create-form-basic.png`: 見積書作成フォーム（基本情報タブ）
4. `estimate-create-form-items.png`: 見積書作成フォーム（明細タブ）
5. `estimate-preview.png`: 見積書プレビュー画面
6. `estimate-pdf-output.png`: PDF出力後のプレビュー

---

#### 7. 請求書作成（`invoices_create.md`）

**ページURL**: `/manual/invoices_create`

**必要な画像**:

| # | ファイル名 | 保存先 | 表示箇所 | サイズ | 優先度 |
|---|----------|--------|----------|--------|--------|
| 7-1 | `invoice-list.png` | `/public/images/manual/documents/` | 「請求書一覧画面」セクション | 1200×800px | 🔴 最優先 |
| 7-2 | `invoice-create-from-estimate.png` | `/public/images/manual/documents/` | 「見積書から変換」セクション（見積書詳細の変換ボタン） | 1200×800px | 🔴 最優先 |
| 7-3 | `invoice-create-form.png` | `/public/images/manual/documents/` | 「請求書作成フォーム」セクション | 1200×800px | 🟡 高 |
| 7-4 | `invoice-preview.png` | `/public/images/manual/documents/` | 「プレビュー」セクション | 1200×1600px | 🟡 高 |

**スクリーンショット撮影手順**:
1. `invoice-list.png`: 書類管理 > 請求書一覧ページ
2. `invoice-create-from-estimate.png`: 見積書詳細 > 「請求書に変換」ボタン
3. `invoice-create-form.png`: 請求書作成フォーム
4. `invoice-preview.png`: 請求書プレビュー画面

---

#### 8. スタッフ管理（`staff_management.md`）

**ページURL**: `/manual/staff_management`

**必要な画像**:

| # | ファイル名 | 保存先 | 表示箇所 | サイズ | 優先度 |
|---|----------|--------|----------|--------|--------|
| 8-1 | `staff-list.png` | `/public/images/manual/settings/` | 「スタッフ一覧画面」セクション | 1200×800px | 🔴 最優先 |
| 8-2 | `staff-add-button.png` | `/public/images/manual/settings/` | 「スタッフ追加ボタン」セクション | 1200×800px | 🟡 高 |
| 8-3 | `staff-add-form.png` | `/public/images/manual/settings/` | 「スタッフ追加フォーム」セクション | 1200×800px | 🟡 高 |
| 8-4 | `staff-detail.png` | `/public/images/manual/settings/` | 「スタッフ詳細画面」セクション | 1200×800px | 🟢 中 |
| 8-5 | `staff-edit.png` | `/public/images/manual/settings/` | 「スタッフ編集画面」セクション | 1200×800px | 🟢 中 |

**スクリーンショット撮影手順**:
1. `staff-list.png`: 設定 > スタッフ管理 > 一覧ページ
2. `staff-add-button.png`: スタッフ一覧の「+ スタッフを追加」ボタン
3. `staff-add-form.png`: スタッフ追加フォーム
4. `staff-detail.png`: スタッフ詳細画面
5. `staff-edit.png`: スタッフ編集画面

---

#### 9. データエクスポート（`data_export.md`）

**ページURL**: `/manual/data_export`

**必要な画像**:

| # | ファイル名 | 保存先 | 表示箇所 | サイズ | 優先度 |
|---|----------|--------|----------|--------|--------|
| 9-1 | `data-export-page.png` | `/public/images/manual/settings/` | 「データエクスポート画面」セクション | 1200×800px | 🔴 最優先 |
| 9-2 | `data-export-button.png` | `/public/images/manual/settings/` | 「エクスポートボタン」セクション（拡大） | 800×400px | 🟡 高 |
| 9-3 | `data-export-success.png` | `/public/images/manual/settings/` | 「エクスポート成功メッセージ」セクション | 1200×800px | 🟡 高 |
| 9-4 | `data-export-csv-sample.png` | `/public/images/manual/settings/` | 「CSVファイルサンプル」セクション（Excelで開いた画面） | 1200×800px | 🟢 中 |

**スクリーンショット撮影手順**:
1. `data-export-page.png`: 設定 > データエクスポートページ全体
2. `data-export-button.png`: 「CSVエクスポート」ボタンのクローズアップ
3. `data-export-success.png`: エクスポート成功後の緑色メッセージ
4. `data-export-csv-sample.png`: エクスポートしたCSVファイルをExcelで開いた画面

---

#### 10. モバイル画面（`scenarios/mobile/mobile_usage.md`）

**ページURL**: `/manual/scenarios/mobile/mobile_usage`

**必要な画像**:

| # | ファイル名 | 保存先 | 表示箇所 | サイズ | 優先度 |
|---|----------|--------|----------|--------|--------|
| 10-1 | `mobile-bottom-nav-asset.png` | `/public/images/manual/mobile/` | 「現場資産パック > 下部ナビ」セクション | 375×667px | 🔴 最優先 |
| 10-2 | `mobile-bottom-nav-dx.png` | `/public/images/manual/mobile/` | 「DX効率化パック > 下部ナビ」セクション | 375×667px | 🟡 高 |
| 10-3 | `mobile-bottom-nav-full.png` | `/public/images/manual/mobile/` | 「フル機能統合パック > 下部ナビ」セクション | 375×667px | 🟡 高 |
| 10-4 | `mobile-sidebar-menu.png` | `/public/images/manual/mobile/` | 「サイドバーメニュー」セクション | 375×667px | 🔴 最優先 |
| 10-5 | `mobile-home-shortcuts.png` | `/public/images/manual/mobile/` | 「ホーム画面ショートカット」セクション | 375×667px | 🟡 高 |
| 10-6 | `mobile-notifications.png` | `/public/images/manual/mobile/` | 「通知画面」セクション | 375×667px | 🟢 中 |

**スクリーンショット撮影手順**:
1. `mobile-bottom-nav-asset.png`: 現場資産パック契約組織でモバイル画面下部ナビ
2. `mobile-bottom-nav-dx.png`: DX効率化パック契約組織でモバイル画面下部ナビ
3. `mobile-bottom-nav-full.png`: フル機能統合パック契約組織でモバイル画面下部ナビ
4. `mobile-sidebar-menu.png`: 左上メニューアイコンをタップ後のサイドバー
5. `mobile-home-shortcuts.png`: モバイルホーム画面のショートカットカード
6. `mobile-notifications.png`: 右上の通知アイコンをタップ後の通知一覧

---

### 📊 画像リスト統計

**合計画像数**: 60枚

**優先度別**:
- 🔴 最優先: 30枚
- 🟡 高: 20枚
- 🟢 中: 10枚

**サイズ別**:
- PC画面（1200px幅）: 35枚
- スマホ画面（375px幅）: 20枚
- その他（サンプル等）: 5枚

**カテゴリ別**:
- ログイン・基本: 7枚
- QR関連: 14枚
- 道具管理: 8枚
- 勤怠管理: 7枚
- 書類管理: 10枚
- 設定・管理: 9枚
- モバイル: 6枚

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
