'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface GenerateInitialInvoiceButtonProps {
  contractId: string;
  contractNumber: string;
}

export default function GenerateInitialInvoiceButton({
  contractId,
  contractNumber,
}: GenerateInitialInvoiceButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    invoiceNumber?: string;
    amount?: number;
    message?: string;
    error?: string;
  } | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/contracts/${contractId}/generate-initial-invoice`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setResult({ success: false, error: data.error || '初回請求書の生成に失敗しました' });
        return;
      }

      setResult({
        success: true,
        invoiceNumber: data.invoice_number,
        amount: data.total_amount,
        message: data.message,
      });

      // 3秒後にページをリロード
      setTimeout(() => {
        router.refresh();
      }, 3000);
    } catch (error: any) {
      console.error('[GenerateInitialInvoiceButton] Error:', error);
      setResult({ success: false, error: error.message || 'エラーが発生しました' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
      >
        初回請求書を生成
      </button>

      {/* 確認モーダル */}
      {showModal && !result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">初回請求書の生成</h3>
            <p className="text-gray-700 mb-2">契約番号: {contractNumber}</p>
            <p className="text-gray-700 mb-4">
              初回請求書を生成します。
              <br />
              請求書は登録されたメールアドレスに送信されます。
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
                onClick={handleGenerate}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? '生成中...' : '生成する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 結果モーダル */}
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
                  <h3 className="text-lg font-bold text-gray-900">初回請求書を生成しました</h3>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-600 mb-2">請求書番号</p>
                  <p className="font-mono text-gray-900 mb-4">{result.invoiceNumber}</p>
                  <p className="text-sm text-gray-600 mb-2">請求金額</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ¥{result.amount?.toLocaleString()}
                  </p>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  請求書をメールで送信しました。入金確認後、契約を完了してください。
                </p>
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setResult(null);
                      setShowModal(false);
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
