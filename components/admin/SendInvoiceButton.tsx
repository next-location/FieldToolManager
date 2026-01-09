'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SendInvoiceButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export default function SendInvoiceButton({ invoiceId, invoiceNumber }: SendInvoiceButtonProps) {
  const [isSending, setIsSending] = useState(false);
  const router = useRouter();

  const handleSend = async () => {
    if (!confirm(`請求書 ${invoiceNumber} を送信しますか？`)) {
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/send-invoice`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '請求書の送信に失敗しました');
      }

      alert('請求書を送信しました');
      router.refresh();
    } catch (error: any) {
      console.error('Send error:', error);
      alert(error.message || '請求書の送信に失敗しました');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={isSending}
      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
    >
      {isSending ? '送信中...' : '請求書を送信'}
    </button>
  );
}
