'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface ResendInvoiceButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export default function ResendInvoiceButton({
  invoiceId,
  invoiceNumber,
}: ResendInvoiceButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const handleResend = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/resend`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ success: false, error: data.error || '請求書の再送信に失敗しました' });
        return;
      }

      setResult({
        success: true,
        message: data.message,
      });

      setTimeout(() => {
        router.refresh();
      }, 2000);
    } catch (error: any) {
      console.error('[ResendInvoiceButton] Error:', error);
      setResult({ success: false, error: error.message || 'エラーが発生しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-gray-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
      >
        請求書を再送信
      </button>

      {showModal && !result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">請求書の再送信</h3>
            <p className="text-gray-700 mb-2">請求書番号: {invoiceNumber}</p>
            <p className="text-gray-700 mb-4">
              請求書を顧客に再送信します。
              <br />
              PDFが再生成されてメール送信されます。
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
                onClick={handleResend}
                disabled={loading}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {loading ? '送信中...' : '再送信する'}
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
                  <h3 className="text-lg font-bold text-gray-900">請求書を再送信しました</h3>
                </div>
                <p className="text-gray-700 mb-4">
                  請求書を顧客に再送信しました。
                </p>
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
