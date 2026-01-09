'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ConvertToInvoiceButtonProps {
  estimateId: string;
  estimateNumber: string;
}

export default function ConvertToInvoiceButton({
  estimateId,
  estimateNumber,
}: ConvertToInvoiceButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    invoiceNumber?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const handleConvert = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/invoices/${estimateId}/convert-to-invoice`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ success: false, error: data.error || '請求書への変換に失敗しました' });
        return;
      }

      setResult({
        success: true,
        invoiceNumber: data.invoice_number,
        message: data.message,
      });

      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (error: any) {
      console.error('[ConvertToInvoiceButton] Error:', error);
      setResult({ success: false, error: error.message || 'エラーが発生しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-purple-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
      >
        請求書に変換
      </button>

      {showModal && !result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">請求書への変換</h3>
            <p className="text-gray-700 mb-2">見積書番号: {estimateNumber}</p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>ℹ️ 注意:</strong> 請求書の内容は見積書と同じです。
                <br />
                変換後に請求書PDFをダウンロードして内容を確認してから送信してください。
              </p>
            </div>
            <p className="text-gray-700 mb-4">
              見積もりを請求書に変換します（メール送信はされません）。
              <br />
              <strong className="text-amber-600">変換後、請求書PDFを確認してから手動で送信してください。</strong>
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConvert}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                {loading ? '変換中...' : '請求書に変換'}
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            {result.success ? (
              <>
                <div className="flex items-center mb-4">
                  <svg
                    className="w-6 h-6 text-green-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-bold text-gray-900">請求書に変換しました</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">請求書番号</p>
                  <p className="font-mono text-gray-900">{result.invoiceNumber}</p>
                </div>
                <p className="text-gray-700 mb-4">
                  見積もりを請求書に変換しました。
                  <br />
                  請求書PDFをダウンロードして内容を確認後、送信ボタンから顧客に送信してください。
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setResult(null);
                      setShowModal(false);
                    }}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center mb-4">
                  <svg
                    className="w-6 h-6 text-red-600 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="text-lg font-bold text-gray-900">エラー</h3>
                </div>
                <p className="text-gray-700 mb-4">{result.error}</p>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setResult(null);
                      setShowModal(false);
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
