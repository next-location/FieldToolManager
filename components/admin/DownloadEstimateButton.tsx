'use client';

import { useState } from 'react';

interface DownloadEstimateButtonProps {
  estimateId: string;
  estimateNumber: string;
}

export default function DownloadEstimateButton({
  estimateId,
  estimateNumber,
}: DownloadEstimateButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/invoices/${estimateId}/estimate-pdf`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) {
        const data = await response.json();
        alert(data.error || '見積もりPDFのダウンロードに失敗しました');
        return;
      }

      // PDFをダウンロード
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `見積書_${estimateNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      console.error('[DownloadEstimateButton] Error:', error);
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="bg-gray-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50"
    >
      {loading ? 'ダウンロード中...' : '見積書をダウンロード'}
    </button>
  );
}
