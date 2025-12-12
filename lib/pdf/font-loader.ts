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
    const fontPath = path.join(process.cwd(), 'lib', 'pdf', 'fonts', 'NotoSansJP-Regular.ttf');
    const fontData = fs.readFileSync(fontPath);
    const fontBase64 = fontData.toString('base64');

    // 日本語フォントを登録（normalとbold両方に同じフォントを使用）
    doc.addFileToVFS('NotoSansJP-Regular.ttf', fontBase64);
    doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'normal');
    doc.addFont('NotoSansJP-Regular.ttf', 'NotoSansJP', 'bold');

  } catch (error) {
    console.error('Failed to load Japanese font:', error);
    throw new Error('日本語フォントの読み込みに失敗しました');
  }
}
