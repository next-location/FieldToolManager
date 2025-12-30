'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface MarkInvoiceAsPaidButtonProps {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
}

export default function MarkInvoiceAsPaidButton({
  invoiceId,
  invoiceNumber,
  totalAmount,
}: MarkInvoiceAsPaidButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/mark-as-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok) {
        alert(`入金確認が完了しました\n\n請求書番号: ${invoiceNumber}\n入金額: ¥${totalAmount.toLocaleString()}`);
        router.refresh();
      } else {
        alert(`エラー: ${data.error}`);
      }
    } catch (error) {
      alert('エラーが発生しました');
    } finally {
      setIsLoading(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
      >
        入金確認
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">入金確認</h3>
            <p className="text-sm text-gray-600 mb-6">
              請求書番号 <span className="font-mono font-semibold">{invoiceNumber}</span> の入金を確認しますか?
              <br />
              <br />
              金額: <span className="font-semibold text-green-600">¥{totalAmount.toLocaleString()}</span>
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
              >
                キャンセル
              </button>
              <button
                onClick={handleConfirm}
                disabled={isLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isLoading ? '処理中...' : '入金確認'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
