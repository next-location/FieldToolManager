'use client';

import { useState } from 'react';

interface DownloadInvoiceButtonProps {
  invoiceId: string;
  invoiceNumber: string;
}

export default function DownloadInvoiceButton({ invoiceId, invoiceNumber }: DownloadInvoiceButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(`/api/admin/invoices/${invoiceId}/invoice-pdf`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '請求書のダウンロードに失敗しました');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `請求書_${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      alert('請求書をダウンロードしました');
    } catch (error: any) {
      console.error('Download error:', error);
      alert(error.message || '請求書のダウンロードに失敗しました');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isDownloading}
      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
    >
      {isDownloading ? 'ダウンロード中...' : '請求書をダウンロード'}
    </button>
  );
}
