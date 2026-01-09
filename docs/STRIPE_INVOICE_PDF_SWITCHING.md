# Stripe Invoice PDF 切り替えガイド

## 概要

請求書PDFの生成方法を環境変数で切り替え可能にします。
- **現在（Stripe審査中）**: 独自PDF生成（jsPDF）
- **審査完了後**: Stripe Invoice PDF

## 実装内容

### 1. 環境変数の追加

**環境変数名**: `USE_STRIPE_INVOICE_PDF`

**設定値**:
- `true` → Stripe Invoice PDFを使用（審査完了後）
- `false` または未設定 → 独自PDF生成を使用（現在）

### 2. 変更対象ファイル

#### `/app/api/admin/invoices/[id]/convert-to-invoice/route.ts`

見積もりを請求書に変換する際のPDF生成ロジックを環境変数で分岐:

```typescript
// 132行目あたり（PDF生成部分）
const useStripePDF = process.env.USE_STRIPE_INVOICE_PDF === 'true';

if (useStripePDF && estimate.stripe_invoice_id) {
  // ===== Stripe Invoice PDFを使用 =====
  console.log('[Convert to Invoice] Using Stripe Invoice PDF');

  const stripeInvoice = await stripe.invoices.retrieve(estimate.stripe_invoice_id);
  const invoicePdfUrl = stripeInvoice.invoice_pdf;

  if (!invoicePdfUrl) {
    return NextResponse.json(
      { error: 'Stripe請求書PDFの取得に失敗しました' },
      { status: 500 }
    );
  }

  const pdfResponse = await fetch(invoicePdfUrl);
  pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer());

} else {
  // ===== 独自PDF生成（jsPDF）を使用 =====
  console.log('[Convert to Invoice] Using custom PDF generation');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // フォント読み込み
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
  const fontData = fs.readFileSync(fontPath);
  const fontBase64 = fontData.toString('base64');
  doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
  doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
  doc.setFont('NotoSansJP');

  // ... 以下、以前の独自PDF生成ロジック ...
  // （フォーマット関数、レイアウト、会社情報など）

  pdfBuffer = Buffer.from(doc.output('arraybuffer'));
}
```

### 3. 必要なインポートの追加

`convert-to-invoice/route.ts` の冒頭に以下を追加（独自PDF生成用）:

```typescript
import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';
```

---

## Stripe審査完了後の切り替え手順

### ステップ1: Stripeで請求書が確定できることを確認

1. Stripeダッシュボードにログイン: https://dashboard.stripe.com
2. テスト請求書を作成
3. 「請求書を確定」ボタンが押せることを確認
4. 確定後、PDFプレビューが表示されることを確認

### ステップ2: Vercelで環境変数を設定

1. Vercelダッシュボードにログイン: https://vercel.com
2. プロジェクト「FieldToolManager」を選択
3. 「Settings」→「Environment Variables」に移動
4. 新しい環境変数を追加:
   - **Key**: `USE_STRIPE_INVOICE_PDF`
   - **Value**: `true`
   - **Environment**: Production にチェック
5. 「Save」をクリック

### ステップ3: 再デプロイ

環境変数を追加しただけでは反映されないため、再デプロイが必要です。

**方法1: Vercelダッシュボードから**
1. 「Deployments」タブに移動
2. 最新のデプロイメントの「...」メニューをクリック
3. 「Redeploy」を選択

**方法2: GitHubから**
```bash
git commit --allow-empty -m "chore: trigger redeploy for Stripe PDF switch"
git push origin main
```

### ステップ4: 動作確認

1. 契約詳細ページ（https://zairoku.com/admin/contracts/8870c935-1451-46e9-99f3-61979795b1e4）にアクセス
2. 見積もりを生成
3. 見積もりを送信（この時点でStripe Invoiceが確定される）
4. 「請求書に変換」をクリック
5. Vercelログで `[Convert to Invoice] Using Stripe Invoice PDF` が表示されることを確認
6. 送信された請求書PDFが見積もりと同じデザインになっているか確認

---

## トラブルシューティング

### エラー: 「Stripe請求書PDFの取得に失敗しました」

**原因**: Stripe Invoiceがまだ確定されていない（Draft状態）

**対処法**:
1. 見積もり送信時にStripe Invoiceが確定されているか確認
2. Stripeダッシュボードで該当請求書のステータスを確認
3. Draft状態の場合、`/app/api/admin/invoices/[id]/send/route.ts` の `stripe.invoices.finalizeInvoice()` が正常に動作しているか確認

### 環境変数が反映されない

**原因**: 環境変数追加後に再デプロイしていない

**対処法**: 上記「ステップ3: 再デプロイ」を実行

### 独自PDFに戻したい

Vercelで環境変数 `USE_STRIPE_INVOICE_PDF` を削除するか、値を `false` に変更して再デプロイ

---

## Claude へのプロンプト例

### Stripe審査完了後に切り替えを依頼する場合

```
Stripe審査が完了しました。

以下のファイルを参照して、請求書PDFをStripe Invoice PDFに切り替えてください:
/Users/youichiakashi/FieldToolManager/docs/STRIPE_INVOICE_PDF_SWITCHING.md

実装後、テスト手順も実行してください。
```

### 独自PDFに戻す場合

```
請求書PDFを独自生成に戻してください。

以下のファイルを参照:
/Users/youichiakashi/FieldToolManager/docs/STRIPE_INVOICE_PDF_SWITCHING.md

Vercelの環境変数 USE_STRIPE_INVOICE_PDF を削除する手順を教えてください。
```

---

## 現在の状態

- **実装状況**: 未実装（これから実装）
- **現在のPDF生成方法**: Stripe Invoice PDF（Draft状態のためエラー発生中）
- **目標**: 独自PDF生成に戻す + 環境変数による切り替え機能を追加

## 実装後の状態

- **デフォルトのPDF生成方法**: 独自PDF生成（jsPDF）
- **環境変数 `USE_STRIPE_INVOICE_PDF=true` 設定時**: Stripe Invoice PDF

---

## 関連ファイル

- `/app/api/admin/invoices/[id]/convert-to-invoice/route.ts` - 請求書変換API（主な変更箇所）
- `/app/api/admin/invoices/[id]/send/route.ts` - 見積もり送信API（Stripe Invoice確定処理あり）
- `/lib/pdf/stripe-invoice-generator.ts` - 共通PDF生成ロジック（参考用）
- `docs/STRIPE_INVOICE_PDF_SWITCHING.md` - このファイル

---

## 更新履歴

- 2026-01-06: 初版作成
