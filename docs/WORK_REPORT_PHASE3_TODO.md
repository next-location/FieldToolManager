# 作業報告書 Phase 3 実装TODO

最終更新: 2025-12-06

## Phase 3: 写真・添付ファイル機能

### ✅ 完了済み

1. **データベース設計**
   - `work_report_photos` テーブル拡張（caption, display_order, taken_at, location_name追加）
   - `work_report_attachments` テーブル作成
   - RLSポリシー設定完了
   - マイグレーション: `20250106000004_create_work_report_photos_and_attachments.sql`

2. **Supabase Storage**
   - `work-report-photos` バケット確認済み（5MB制限、JPEG/PNG/WebP対応）
   - `work-report-attachments` バケット確認済み
   - RLSポリシー設定済み

### ⏳ 未実装（次のセッションで実装）

#### 1. 写真アップロードAPI
**ファイル**: `app/api/work-reports/[id]/photos/route.ts`

**実装内容**:
- `GET /api/work-reports/[id]/photos` - 写真一覧取得
- `POST /api/work-reports/[id]/photos` - 写真アップロード
  - FormDataでファイル受信
  - ファイルサイズチェック（5MB）
  - MIMEタイプチェック（image/jpeg, image/png, image/webp）
  - Supabase Storageにアップロード
  - DBにメタデータ保存（caption, display_order含む）

**注意**: ディレクトリは作成済み (`app/api/work-reports/[id]/photos/`)

#### 2. 個別写真操作API
**ファイル**: `app/api/work-reports/[id]/photos/[photo_id]/route.ts`

**実装内容**:
- `PUT` - キャプション・表示順序更新
- `DELETE` - 写真削除（Storageとデータベース両方）

#### 3. 添付ファイルアップロードAPI
**ファイル**: `app/api/work-reports/[id]/attachments/route.ts`

**実装内容**:
- `GET /api/work-reports/[id]/attachments` - 添付ファイル一覧取得
- `POST /api/work-reports/[id]/attachments` - ファイルアップロード
  - PDF, 画像, Word, Excel等対応
  - ファイル種別（図面、仕様書、マニュアル、その他）
  - 説明文、表示順序

#### 4. 作成フォームUI - 写真アップロード
**ファイル**: `app/(authenticated)/work-reports/new/PhotoUpload.tsx` (新規)

**実装内容**:
- 複数ファイル選択UI
- ドラッグ&ドロップ対応
- プレビュー表示（サムネイル）
- キャプション入力
- 表示順序の並び替え（ドラッグ&ドロップ）
- アップロード進捗表示
- 削除機能

**フォーム統合**: `WorkReportForm.tsx` に PhotoUpload コンポーネント追加

#### 5. 作成フォームUI - 添付ファイルアップロード
**ファイル**: `app/(authenticated)/work-reports/new/AttachmentUpload.tsx` (新規)

**実装内容**:
- ファイル選択UI
- ファイル種別選択（図面、仕様書、マニュアル、その他）
- 説明文入力
- ファイル一覧表示
- 削除機能

**フォーム統合**: `WorkReportForm.tsx` に AttachmentUpload コンポーネント追加

#### 6. PDF埋め込み機能
**ファイル**: `lib/pdf/helpers.ts` に `drawPhotos()` 関数追加

**実装内容**:
- 写真をPDFに埋め込み
- キャプション付きで表示
- レイアウト: 2列または1列（写真サイズに応じて）
- 改ページ対応（`pageBreak: 'auto'`）
- Supabase Storageから画像取得
- Base64変換してjsPDFに埋め込み

**PDF生成ルート修正**: `app/api/work-reports/[id]/pdf/route.ts`
- 写真データ取得
- `drawPhotos()` 呼び出し（カスタムフィールドの後）

#### 7. ドキュメント更新
**ファイル**: `docs/WORK_REPORT_SPEC.md`

**追加内容**:
- セクション9「写真・添付ファイル機能」
- データベース設計
- API仕様
- UI設計
- PDF埋め込み仕様
- 技術仕様・注意事項

## 実装順序（推奨）

1. 写真アップロードAPI実装（GET/POST）
2. 個別写真操作API（PUT/DELETE）
3. 添付ファイルアップロードAPI（GET/POST）
4. PhotoUploadコンポーネント作成
5. AttachmentUploadコンポーネント作成
6. WorkReportFormに統合
7. PDF埋め込み機能実装
8. ドキュメント更新
9. テスト・動作確認
10. コミット

## 技術メモ

### Supabase Storage パス構造
```
work-report-photos/
  {user_id}/
    {report_id}/
      {timestamp}_{filename}

work-report-attachments/
  {user_id}/
    {report_id}/
      {timestamp}_{filename}
```

### 写真表示順序
- `display_order` 列で管理
- フロントエンドでドラッグ&ドロップで並び替え
- 保存時に順序を更新

### PDF埋め込み
- jsPDFの `addImage()` 使用
- 画像はBase64形式で埋め込み
- 改ページはautoTableの設定で制御
- 画像サイズ: 幅80mm程度（A4に2列配置可能）

## 参考実装

既存の画像アップロード実装を参考にする:
- `app/api/tools/[id]/image/route.ts` - 道具画像アップロード
- Storage操作、エラーハンドリングのパターン

## 見積もり

- API実装: 2-3時間
- UI実装: 3-4時間
- PDF埋め込み: 1-2時間
- テスト・調整: 1-2時間
- **合計**: 7-11時間

## コミット計画

Phase 3を2-3回に分けてコミット:
1. Phase 3 (2/3): API実装完了
2. Phase 3 (3/3): UI・PDF埋め込み完成、ドキュメント更新
