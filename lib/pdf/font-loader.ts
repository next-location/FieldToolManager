import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

/**
 * NotoSansJPフォントをjsPDFに読み込む
 *
 * @param doc - jsPDFインスタンス
 */
export async function loadNotoSansJP(doc: jsPDF): Promise<void> {
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf');
    const fontData = fs.readFileSync(fontPath);
    const fontBase64 = fontData.toString('base64');

    // 日本語フォントを登録
    doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
    doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');

    // 必要に応じてBoldフォントも読み込む
    try {
      const fontBoldPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Bold.ttf');
      const fontBoldData = fs.readFileSync(fontBoldPath);
      const fontBoldBase64 = fontBoldData.toString('base64');

      doc.addFileToVFS('NotoSansJP-Bold.ttf', fontBoldBase64);
      doc.addFont('NotoSansJP-Bold.ttf', 'NotoSansJP', 'bold');
    } catch {
      // Boldフォントがない場合はスキップ
      console.warn('NotoSansJP-Bold.ttf not found, using normal font for bold');
    }

  } catch (error) {
    console.error('Failed to load Japanese font:', error);
    throw new Error('日本語フォントの読み込みに失敗しました');
  }
}
