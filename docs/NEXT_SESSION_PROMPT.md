# 次のセッション用プロンプト

## コピー＆ペースト用プロンプト

```
作業報告書のPhase 3（写真・添付ファイル機能）の実装を続けてください。

## 現在の状況
- Phase 1（基本機能）: ✅ 完了
- Phase 2（カスタムフィールド）: ✅ 完了
- Phase 3（写真・添付ファイル）: 🔄 データベース設計のみ完了

## 実装する内容
`docs/WORK_REPORT_PHASE3_TODO.md` に詳細な実装計画があります。
このドキュメントに従って、以下の順序で実装してください：

1. 写真アップロードAPI実装（`app/api/work-reports/[id]/photos/route.ts`）
   - GET: 写真一覧取得
   - POST: 写真アップロード（FormData、5MB制限、JPEG/PNG/WebP対応）

2. 個別写真操作API（`app/api/work-reports/[id]/photos/[photo_id]/route.ts`）
   - PUT: キャプション・表示順序更新
   - DELETE: 写真削除

3. 添付ファイルアップロードAPI（`app/api/work-reports/[id]/attachments/route.ts`）
   - GET: 添付ファイル一覧取得
   - POST: ファイルアップロード

4. PhotoUploadコンポーネント作成（`app/(authenticated)/work-reports/new/PhotoUpload.tsx`）
   - 複数ファイル選択、プレビュー、キャプション入力、並び替え

5. AttachmentUploadコンポーネント作成（`app/(authenticated)/work-reports/new/AttachmentUpload.tsx`）
   - ファイル選択、種別選択、説明文入力

6. WorkReportFormへの統合

7. PDF埋め込み機能実装（`lib/pdf/helpers.ts` に `drawPhotos()` 追加）
   - Supabase Storageから画像取得
   - Base64変換してjsPDFに埋め込み
   - 2列レイアウト、改ページ対応

8. ドキュメント更新（`docs/WORK_REPORT_SPEC.md` にセクション9追加）

9. コミット（Phase 3 (2/3) と Phase 3 (3/3) に分けて）

## 重要な注意事項
- API実装時、既存の画像アップロード実装（`app/api/tools/[id]/image/route.ts`）を参考にする
- Storageパス構造: `work-report-photos/{user_id}/{report_id}/{timestamp}_{filename}`
- PDF埋め込みは改ページ設定（`pageBreak: 'auto'`）を使用
- 写真の表示順序は `display_order` 列で管理

## ディレクトリ準備
- `app/api/work-reports/[id]/photos/` ディレクトリは作成済み

実装を開始してください。
```

---

## 補足情報

### 前回のセッションでの成果

#### コミット履歴（6件）
1. `f9908bb` - Phase 1: 時間外（残業時間）
2. `84e8aa7` - Phase 1: 個人印鑑機能
3. `c8fdad3` - Phase 2 (1/2): カスタムフィールド基盤
4. `699de3a` - Phase 2 (2/2): PDF反映完成
5. `690ef5d` - Phase 3 (1/3): データベース設計
6. `2833f79` - Phase 3 TODOドキュメント作成

#### Phase 1実装内容
- 開始時間・終了時間のDB保存
- 帯同作業員の入力UI（複数選択、残業時間個別管理）
- 作業報告書ナンバー自動採番（WR-YYYY-NNN形式、楽観的ロック）
- 時間外（残業時間）実装（作業者ごと）
- 特記事項・備考実装
- 個人印鑑（シャチハタ風）自動生成機能
  - SVG形式で円形印鑑生成
  - アカウント設定ページで管理
  - PDFの担当印・承認印に自動表示

#### Phase 2実装内容
- データベース設計（work_report_custom_fields, custom_fields_data JSONB）
- 管理API（GET/POST/PUT/DELETE）
- 管理UI（CustomFieldsManager）
  - フィールド追加・削除
  - 6種類のフィールドタイプ（text, textarea, number, date, select, checkbox）
- 動的フォーム生成（CustomFieldInput）
  - フィールドタイプに応じた入力UI自動生成
- PDF反映（drawCustomFields）
  - テーブル形式で表示
  - 改ページ対応（getTableConfig統合）

#### Phase 3実装内容（データベースのみ）
- work_report_photosテーブル拡張
  - caption, display_order, taken_at, location_name列追加
- work_report_attachmentsテーブル作成
  - file_type（図面、仕様書、マニュアル、その他）
  - description, display_order
- RLSポリシー設定完了
- Supabase Storageバケット確認済み

### データベース構造

#### work_report_photos
```sql
-- 既存列
id, work_report_id, organization_id, storage_path, file_name,
file_size, mime_type, uploaded_by, created_at, updated_at, deleted_at

-- 新規追加列（Phase 3）
caption TEXT,              -- 写真コメント
display_order INTEGER,     -- 表示順序
taken_at TIMESTAMPTZ,      -- 撮影日時
location_name TEXT         -- 撮影場所名
```

#### work_report_attachments
```sql
id, work_report_id, organization_id, storage_path, file_name,
file_size, mime_type, file_type, description, display_order,
uploaded_by, created_at, updated_at, deleted_at
```

### Supabase Storage構造

#### work-report-photos バケット
- **サイズ制限**: 5MB
- **MIME許可**: image/jpeg, image/png, image/jpg, image/webp
- **パス**: `{user_id}/{report_id}/{timestamp}_{filename}`

#### work-report-attachments バケット
- **MIME許可**: PDF, 画像, Word, Excel等
- **パス**: `{user_id}/{report_id}/{timestamp}_{filename}`

### 参考実装ファイル

既存のコードを参考にできます：
- `app/api/tools/[id]/image/route.ts` - 道具画像アップロード
- `app/(authenticated)/work-reports/new/WorkReportForm.tsx` - フォーム実装
- `app/(authenticated)/work-reports/new/CustomFieldInput.tsx` - 動的入力コンポーネント
- `lib/pdf/helpers.ts` - PDF生成ヘルパー関数

### 見積もり時間
- API実装: 2-3時間
- UI実装: 3-4時間
- PDF埋め込み: 1-2時間
- テスト・調整: 1-2時間
- **合計**: 7-11時間

### 推奨コミット分割
1. **Phase 3 (2/3)**: API実装完了
   - 写真アップロードAPI
   - 個別写真操作API
   - 添付ファイルアップロードAPI

2. **Phase 3 (3/3)**: UI・PDF埋め込み完成
   - PhotoUploadコンポーネント
   - AttachmentUploadコンポーネント
   - WorkReportForm統合
   - PDF埋め込み機能
   - ドキュメント更新

---

## 技術的なポイント

### FormDataの扱い
```typescript
const formData = await request.formData()
const file = formData.get('file') as File
const caption = formData.get('caption') as string
```

### Supabase Storageアップロード
```typescript
const { error } = await supabase.storage
  .from('work-report-photos')
  .upload(filePath, file, {
    contentType: file.type,
    upsert: false,
  })
```

### PDF画像埋め込み
```typescript
// Storageから画像取得
const { data: imageData } = await supabase.storage
  .from('work-report-photos')
  .download(photo.storage_path)

// Base64変換
const base64 = await imageDataToBase64(imageData)

// jsPDFに埋め込み
doc.addImage(base64, 'JPEG', x, y, width, height)
```

### 改ページ制御
```typescript
autoTable(doc, {
  ...getTableConfig({ type: 'content' }), // pageBreak: 'auto'
  // ...
})
```

---

## トラブルシューティング

### ファイル作成エラーが出た場合
```bash
# ディレクトリを確認・作成
mkdir -p app/api/work-reports/\[id\]/photos
mkdir -p app/api/work-reports/\[id\]/attachments
```

### バックグラウンドプロセスが多数実行中の場合
```bash
# すべてのNodeプロセスを終了
killall -9 node
sleep 2
```

### マイグレーションエラーの場合
```bash
# データベースリセット
npx supabase db reset
```

---

## 成功の定義

Phase 3完了時、以下が実装されている状態：

✅ 写真アップロードAPI動作確認
✅ 添付ファイルアップロードAPI動作確認
✅ 作成フォームで写真・添付ファイルのアップロード可能
✅ 写真にキャプション追加可能
✅ 写真の表示順序変更可能
✅ PDFに写真が埋め込まれて表示される
✅ ドキュメント（WORK_REPORT_SPEC.md）更新済み
✅ Phase 3 (2/3) と (3/3) がコミット済み
