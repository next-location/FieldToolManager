'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CompleteContractButtonProps {
  contractId: string;
  contractNumber: string;
}

export default function CompleteContractButton({ contractId, contractNumber }: CompleteContractButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    adminEmail?: string;
    adminPassword?: string;
    message?: string;
    error?: string;
  } | null>(null);

  const handleComplete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/contracts/${contractId}/complete`, {
        method: 'POST',
        credentials: 'include',
      });

      // レスポンスのコンテンツタイプを確認
      const contentType = response.headers.get('content-type');
      console.log('[CompleteContractButton] Response status:', response.status);
      console.log('[CompleteContractButton] Content-Type:', contentType);

      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        // HTMLエラーページなどの場合
        const text = await response.text();
        console.error('[CompleteContractButton] Non-JSON response:', text.substring(0, 500));
        setResult({
          success: false,
          error: `サーバーエラーが発生しました (Status: ${response.status})\n\nサーバーログを確認してください。`
        });
        return;
      }

      if (!response.ok) {
        setResult({ success: false, error: data.error || '契約完了に失敗しました' });
        return;
      }

      setResult({
        success: true,
        adminEmail: data.adminEmail,
        adminPassword: data.adminPassword,
        message: data.message,
      });
    } catch (error: any) {
      console.error('[CompleteContractButton] Error:', error);
      setResult({ success: false, error: error.message || 'エラーが発生しました' });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('コピーしました');
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-green-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-green-700 transition-colors"
      >
        契約完了
      </button>

      {/* 確認モーダル */}
      {showModal && !result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">契約完了の確認</h3>
            <p className="text-gray-700 mb-2">契約番号: {contractNumber}</p>
            <p className="text-gray-700 mb-4">
              契約書は受領済みですか？
              <br />
              契約を完了すると、初期管理者アカウントが作成されます。
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
                onClick={handleComplete}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? '処理中...' : 'はい、契約を完了する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 結果モーダル */}
      {showModal && result && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {result.success ? (
              <>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">契約が完了しました</h3>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-900 mb-3">{result.message}</p>
                  <p className="text-sm text-blue-800 font-medium">初期管理者アカウント情報:</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-600 block mb-1">メールアドレス</label>
                    <div className="flex items-center">
                      <code className="flex-1 text-sm font-mono text-gray-900">{result.adminEmail}</code>
                      <button
                        onClick={() => copyToClipboard(result.adminEmail!)}
                        className="ml-2 text-blue-600 hover:text-blue-800 text-sm"
                      >
                        コピー
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3 rounded-lg">
                    <label className="text-xs font-medium text-gray-600 block mb-1">初期パスワード</label>
                    <div className="flex items-center">
                      <code className="flex-1 text-sm font-mono text-gray-900 break-all">{result.adminPassword}</code>
                      <button
                        onClick={() => copyToClipboard(result.adminPassword!)}
                        className="ml-2 text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap"
                      >
                        コピー
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-yellow-900">
                    <strong>重要:</strong> この情報をコピーして顧客に伝えてください。
                    初回ログイン時にパスワード変更が必要です。
                  </p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      router.refresh();
                    }}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">エラーが発生しました</h3>
                </div>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-red-900">{result.error}</p>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setResult(null);
                    }}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
