# ザイロク ドキュメント作成方針

## 📋 目次
1. [ユーザーマニュアル作成方針](#ユーザーマニュアル作成方針)
2. [Q&A作成方針](#qa作成方針)
3. [優先度と作成順序](#優先度と作成順序)

---

## ユーザーマニュアル作成方針

### 📁 保存場所
```
docs/manual/
```

### 📝 ファイル命名規則
- **数字を振らない**（後から追加・並び替えがしやすいため）
- **機能名をそのままファイル名にする**
- **スネークケース（小文字+アンダースコア）を使用**

```
docs/manual/
├── README.md (マニュアル目次・概要)
├── getting_started.md (はじめに) ✅ 作成済み
├── qr_scan.md (QRスキャン)
├── tool_management.md (道具管理) ✅ 作成済み
├── consumable_management.md (消耗品管理) ✅ 作成済み
├── equipment_management.md (重機管理) ✅ 作成済み
├── tool_sets.md (道具セット) (重機管理) ✅ 作成済み
├── warehouse_locations.md (倉庫位置管理) ✅ 作成済み
├── attendance.md (勤怠管理) ✅ 作成済み
├── work_reports.md (作業報告書) ✅ 作成済み
├── estimates.md (見積書) ✅ 作成済み
├── invoices.md (請求書) ✅ 作成済み
├── purchase_orders.md (発注書) ✅ 作成済み
├── clients.md (取引先管理) ✅ 作成済み
├── sites.md (現場管理) ✅ 作成済み
├── projects.md (工事管理) ✅ 作成済み
├── settings.md (設定) ✅ 作成済み
└── staff_management.md (スタッフ管理) ✅ 作成済み
```

### 📋 ユーザーシチュエーション別マニュアル（追加マニュアル）

既存の16個の「機能別マニュアル」を補完し、実際のユーザーの業務フローに沿った「シチュエーション別マニュアル」を作成します。

#### 📱 日常業務フロー編 ✅ 作成済み
```
docs/manual/scenarios/daily/
├── daily_workflow.md - 現場スタッフの1日の流れ ✅ 作成済み
├── site_opening.md - 新規現場の立ち上げ手順 ✅ 作成済み
└── site_closing.md - 現場完了・片付け手順 ✅ 作成済み
```

#### 🔧 道具管理フロー編✅ 作成済み
```
docs/manual/scenarios/tool_operations/
├── tool_handover.md - 道具の引き継ぎ手順✅ 作成済み
├── tool_lost_or_damaged.md - 道具の紛失・破損対応✅ 作成済み
├── tool_maintenance.md - 道具のメンテナンス・点検✅ 作成済み
└── tool_bulk_operations.md - 道具の一括操作✅ 作成済み
```

#### 💼 書類作成フロー編✅ 作成済み
```
docs/manual/scenarios/document_flow/
├── quotation_to_invoice_flow.md - 見積→契約→請求の一連の流れ✅ 作成済み
├── purchase_order_flow.md - 発注から支払いまでの流れ✅ 作成済み
└── monthly_reporting.md - 月次報告業務✅ 作成済み
```

#### 🏢 管理者向けフロー編✅ 作成済み
```
docs/manual/scenarios/admin_operations/
├── new_employee_onboarding.md - 新入社員の受け入れ✅ 作成済み
├── employee_offboarding.md - 退職者の対応✅ 作成済み
├── inventory_audit.md - 棚卸し作業✅ 作成済み
└── system_health_check.md - システム健全性チェック✅ 作成済み
```

#### 📊 分析・レポート編
```
docs/manual/scenarios/analytics/
├── analytics_basics.md - 分析機能の基本
├── cost_analysis.md - 原価分析の使い方
└── usage_report.md - 稼働率・利用状況レポート
```

#### 🔐 セキュリティ・トラブル編✅ 作成済み
```
docs/manual/scenarios/security/
├── security_best_practices.md - セキュリティのベストプラクティス✅ 作成済み
├── troubleshooting_common.md - よくあるトラブルと解決方法✅ 作成済み
└── emergency_response.md - 緊急時の対応✅ 作成済み
```

#### 📲 モバイル・QR編✅ 作成済み
```
docs/manual/scenarios/mobile/
├── mobile_usage.md - スマートフォンでの使い方✅ 作成済み
└── qr_code_guide.md - QRコード活用ガイド✅ 作成済み
```

#### 🎯 役割別ガイド編✅ 作成済み
```
docs/manual/scenarios/role_guides/
├── staff_quick_guide.md - スタッフ向けクイックガイド✅ 作成済み
├── leader_quick_guide.md - リーダー向けクイックガイド✅ 作成済み
├── manager_quick_guide.md - マネージャー向けクイックガ✅ 作成済みイド
└── admin_quick_guide.md - 管理者向けクイックガイド✅ 作成済み
```

#### 🔄 データ移行・統合編
```
docs/manual/scenarios/integration/
├── data_import_export.md - データのインポート・エクスポート
└── integration_guide.md - 外部連携ガイド
```

### 🎯 シチュエーション別マニュアル優先度

#### 🔴 高優先度（すぐに必要）
1. daily_workflow.md
2. tool_lost_or_damaged.md
3. quotation_to_invoice_flow.md
4. new_employee_onboarding.md
5. troubleshooting_common.md
6. mobile_usage.md
7. qr_code_guide.md
8. staff_quick_guide.md

#### 🟡 中優先度（運用開始後に必要）
9. site_opening.md
10. site_closing.md
11. tool_handover.md
12. tool_maintenance.md
13. purchase_order_flow.md
14. monthly_reporting.md
15. employee_offboarding.md
16. inventory_audit.md
17. analytics_basics.md
18. cost_analysis.md
19. leader_quick_guide.md
20. manager_quick_guide.md

#### 🟢 低優先度（応用・最適化）
21. tool_bulk_operations.md
22. system_health_check.md
23. usage_report.md
24. security_best_practices.md
25. emergency_response.md
26. admin_quick_guide.md
27. data_import_export.md
28. integration_guide.md

---

### ✍️ マニュアル作成の基本方針

#### 1. 形式
- **Markdown形式（.md）**
- **テキストのみ**（画像は後で追加）
- **見出し構造を明確に**

#### 2. 含めるべき内容
- **概要**: 機能の目的と概要
- **対象者**: どの権限のユーザーが使えるか
- **前提条件**: この機能を使う前に必要な設定
- **手順**: ステップバイステップの操作手順
- **注意事項**: よくある間違いや重要なポイント
- **関連機能**: 他のマニュアルへのリンク

#### 3. 含めないもの
- **よくある質問（Q&A形式）**: Q&Aフォルダに分離
  - ❌ 「Q. 〇〇できませんか?」「A. 〇〇してください」
  - ✅ 「〇〇の方法」として手順を説明
- **一覧画面の説明**: 見れば分かるものは省略
- **分析・レポート画面**: グラフ・表は見れば分かる

#### 4. トラブルシューティングセクションの書き方
マニュアルに「トラブルシューティング」セクションを含める場合は、以下のルールに従う：
- ❌ Q&A形式にしない（「Q. 〇〇の場合」は禁止）
- ✅ 「〇〇の場合の対処方法」「〇〇の修正手順」として記載
- ✅ 具体的な手順を番号付きリストで説明
- ✅ 簡単なトラブルはマニュアル内、複雑な質問はQ&Aフォルダへ

### 📊 優先度別マニュアル作成リスト

#### 🔴 優先度A（必須）- 20項目
詳細な説明が必要な重要機能

1. **getting_started.md** ✅ 作成済み
2. **qr_scan.md** ✅ QRスキャンの使い方
3. **tool_management.md** ✅ 道具登録（個別アイテム概念）
4. **consumable_orders.md** ✅ 消耗品発注管理（承認フロー）
5. **tool_sets.md** ✅ 道具セット登録
6. **warehouse_locations.md** ✅ 倉庫位置マスタ（階層構造）
7. **attendance_clock.md** ✅ 出退勤打刻
8. **attendance_leader_qr.md** ✅ リーダー用QR発行
9. **work_reports_create.md** ✅ 作業報告書作成
10. **estimates_create.md** ✅ 見積書作成
11. **estimates_approval.md** ✅ 見積書提出・承認
12. **invoices_create.md** ✅  請求書作成（見積書から変換）
13. **invoices_approval.md** ✅ 請求書提出・承認
14. **purchase_orders_create.md** ✅ 発注書作成
15. **purchase_orders_approval.md** ✅ 発注書承認フロー（金額別）
16. **settings_operations.md** - 運用設定
17. **staff_add.md** ✅ スタッフ追加（権限の違い）
18. **warehouse_hierarchy.md** - 倉庫階層設定
19. **company_sites.md** ✅ 自社拠点管理（本社倉庫、支店、資材置き場）

#### 🟡 優先度B（推奨）- 23項目
実務で役立つ機能

20. **qr_printing.md** - QRコード印刷
21. **consumable_management.md** ✅ 消耗品登録（在庫調整）
22. **equipment_maintenance.md** ✅ 重機メンテナンス
23. **attendance_settings.md** ✅ 勤怠設定
24. **attendance_reports.md** - 月次勤怠レポート
25. **work_reports_approval.md** ✅ 作業報告書承認
26. **work_reports_pdf.md** ✅ 作業報告書PDF出力
27. **work_reports_settings.md** ✅  作業報告書設定
28. **clients.md** - 取引先マスタ
29. **sites.md** - 現場登録
30. **estimates_send.md** ✅ 見積書送付
31. **invoices_payment.md** ✅ 入金記録
32. **purchase_orders_send.md** ✅ 発注書送付
33. **tool_categories.md** ✅ 道具カテゴリ管理
34. **tool_import.md** - 道具マスタ一括インポート
35. **settings_organization.md** ✅ 組織情報
36. **warehouse_locations_register.md** - 倉庫位置マスタ登録
37. **settings_attendance.md** ✅ 出退勤設定
38. **settings_work_reports.md** ✅ 作業報告書設定
39. **staff_management.md** - スタッフ管理全般
40. **settings_contract.md** - 契約管理
41. **settings.md** - 設定全般（まとめ）

#### 🟢 優先度C（参考）- 17項目
簡単な言及でOK

- 編集・削除系（制限事項のみ）
- 履歴表示系（見れば分かる）
- その他補足的な機能

---

## Q&A作成方針

### 📁 フォルダ構造
```
docs/qa/
├── public/   (Lv0: 契約前の質問、サービス概要)
├── staff/    (Lv1: 現場スタッフ向けトラブルシューティング)
└── admin/    (Lv3-4: 管理者向け、契約・請求・設定)
```

### 📝 ファイル構成

#### public/ - 契約前・一般向け
```
public/
├── README.md (公開Q&A一覧・目次)
├── service_overview.md (サービス概要、できること)
├── pricing.md (料金・プラン、パッケージの違い)
├── security.md (セキュリティ、データ保護)
├── trial.md (トライアル、デモ環境)
└── getting_started.md (契約後の初期設定の流れ)
```

#### staff/ - 現場スタッフ向け
```
staff/
├── README.md (スタッフQ&A一覧・目次)
├── login_issues.md (ログイン・パスワード関連)
├── qr_scan_issues.md (QRスキャンのトラブル)
├── mobile_usage.md (スマホ・タブレット利用)
├── camera_permission.md (カメラ権限の設定)
├── offline_usage.md (オフライン利用の可否)
├── basic_operations.md (基本操作、画面の見方)
└── attendance_issues.md (出退勤のトラブル)
```

#### admin/ - 管理者向け
```
admin/
├── README.md (管理者Q&A一覧・目次)
├── staff_management.md (スタッフ追加・編集・削除)
├── billing_contract.md (契約変更、請求、支払い)
├── settings.md (組織設定、運用設定)
├── data_management.md (データエクスポート、バックアップ)
├── security_settings.md (セキュリティ設定、権限)
├── integration.md (外部連携、API)
└── troubleshooting.md (管理画面のトラブル)
```

### ✍️ Q&A作成の基本方針

#### 1. 形式
```markdown
# カテゴリタイトル

## Q1. 質問文
**A.** 回答文

詳細な説明や手順...

**関連**: [マニュアルへのリンク](../manual/xxx.md)

---

## Q2. 質問文
**A.** 回答文
...
```

#### 2. 記載ルール
- **質問は必ず質問形式で**: 末尾に「?」をつけ、疑問文にする
  - ❌ 「パスワードを変更したい」
  - ✅ 「パスワードは変更できますか?」
- **質問は具体的に**: ユーザーが検索しそうなキーワードを含める
- **回答は簡潔に**: 最初に結論、次に詳細
- **関連マニュアルへのリンク**: 詳しい説明はマニュアルに誘導
- **検索性重視**: 同じ質問を複数の言い方で記載することもOK

#### 3. 各READMEの役割
各フォルダのREADME.mdは：
- Q&A一覧（目次）
- カテゴリ別のインデックス
- よく見られるQ&Aのハイライト

---

## 優先度と作成順序

### Phase 1: 最重要（優先度A）
1. ✅ **getting_started.md** - 完了
2. **qr_scan.md** - QRスキャン
3. ✅ **tool_management.md** - 道具管理
4. **attendance_clock.md** - 出退勤打刻
5. **work_reports_create.md** - 作業報告書作成

### Phase 2: 帳票管理（優先度A）
6. **estimates_create.md** - 見積書作成
7. **estimates_approval.md** - 見積書承認
8. **invoices_create.md** - 請求書作成
9. **invoices_approval.md** - 請求書承認
10. **purchase_orders_create.md** - 発注書作成
11. **purchase_orders_approval.md** - 発注書承認

### Phase 3: 初期設定（優先度A）
12. **warehouse_locations.md** - 倉庫位置管理
13. **staff_add.md** - スタッフ追加
14. **settings_operations.md** - 運用設定

### Phase 4: その他重要機能（優先度B）
15. 優先度Bの22項目を順次作成

### Phase 5: Q&A作成
- staff/login_issues.md
- staff/qr_scan_issues.md
- public/service_overview.md
- admin/staff_management.md
など、各カテゴリで重要度の高いものから

---

## 📌 重要な注意事項

### マニュアル作成時
- ❌ よくある質問は含めない → Q&Aフォルダへ
- ❌ 一覧画面の説明は不要 → 見れば分かる
- ❌ 分析・レポート画面は不要 → グラフは見れば分かる
- ✅ 複雑な概念は丁寧に説明
- ✅ 初回利用時に必要な情報を重点的に
- ✅ 関連機能へのリンクを適切に配置

### Q&A作成時
- ✅ **質問は必ず疑問文形式（末尾に「?」）**
- ✅ 検索されそうなキーワードを含める
- ✅ 回答は簡潔に、詳細はマニュアルへ誘導
- ✅ 同じ内容でも質問の仕方を変えて複数記載OK
- ✅ カテゴリ分けを明確に（public/staff/admin）

---

**最終更新日**: 2026-01-20

以上がザイロクのドキュメント作成方針です。この方針に沿って、順次作成していきます。
