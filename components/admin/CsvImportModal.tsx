'use client';

import { useState } from 'react';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CsvImportModal({ isOpen, onClose, onSuccess }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults(null);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSVファイルが空か、データが不足しています');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};

      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      data.push(row);
    }

    return data;
  };

  const handleImport = async () => {
    if (!file) {
      alert('CSVファイルを選択してください');
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const text = await file.text();
      const csvData = parseCSV(text);

      const response = await fetch('/api/admin/tools/common/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results);
        if (data.results.success > 0) {
          onSuccess();
        }
      } else {
        const error = await response.json();
        alert(`インポートに失敗しました: ${error.error}`);
      }
    } catch (error: any) {
      console.error('Import error:', error);
      alert(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = `name,category_name,model_number,manufacturer,management_type,unit,purchase_price,image_url,notes
電動ドライバー,電動工具,XYZ-100,マキタ,individual,個,15000,,標準的な電動ドライバー
ハンマー,手工具,,,individual,個,2000,,一般的なハンマー
ビス,消耗品,M6-50,,consumable,箱,500,,M6×50mmのビス`;

    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'common_tools_template.csv';
    link.click();
  };

  const handleClose = () => {
    setFile(null);
    setResults(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* ヘッダー */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">CSV一括インポート</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* テンプレートダウンロード */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-blue-800 mb-2">
                  CSVファイルは以下の形式で作成してください。
                </p>
                <button
                  onClick={downloadTemplate}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium underline"
                >
                  📥 テンプレートをダウンロード
                </button>
              </div>
            </div>
          </div>

          {/* CSV形式説明 */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-2">CSVファイルの列（必須項目に★）</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>name</strong> ★: 道具名</li>
              <li>• <strong>category_name</strong>: カテゴリ名（既存カテゴリ名を指定）</li>
              <li>• <strong>model_number</strong>: 型番</li>
              <li>• <strong>manufacturer</strong>: メーカー</li>
              <li>• <strong>management_type</strong> ★: 管理タイプ（individual または consumable）</li>
              <li>• <strong>unit</strong>: 単位（デフォルト: 個）</li>
              <li>• <strong>purchase_price</strong>: 標準購入価格</li>
              <li>• <strong>image_url</strong>: 画像URL</li>
              <li>• <strong>notes</strong>: 備考</li>
            </ul>
          </div>

          {/* ファイル選択 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CSVファイルを選択
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                cursor-pointer"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-2">
                選択中: {file.name}
              </p>
            )}
          </div>

          {/* インポート結果 */}
          {results && (
            <div className="mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">インポート結果</h3>
                <div className="flex gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">{results.success}件</span>
                    <span className="text-sm text-gray-600">成功</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-bold">{results.failed}件</span>
                    <span className="text-sm text-gray-600">失敗</span>
                  </div>
                </div>

                {results.errors.length > 0 && (
                  <div className="border-t border-gray-200 pt-3">
                    <h4 className="text-xs font-semibold text-red-600 mb-2">エラー詳細:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-2">
                      {results.errors.map((err: any, index: number) => (
                        <div key={index} className="text-xs text-gray-700 bg-white p-2 rounded">
                          <span className="font-medium">行{err.row}:</span> {err.name} - {err.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ボタン */}
          <div className="flex gap-3 justify-end">
            <button
              onClick={handleClose}
              className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              閉じる
            </button>
            <button
              onClick={handleImport}
              disabled={!file || loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'インポート中...' : 'インポート実行'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
