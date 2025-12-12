'use client';

import { useState } from 'react';

interface Contract {
  id: string;
  contract_number: string;
  organizations: {
    name: string;
    billing_address: string | null;
  } | null;
}

interface CreateContractDocumentButtonProps {
  contract: Contract;
}

export default function CreateContractDocumentButton({ contract }: CreateContractDocumentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/contracts/${contract.id}/pdf`);
      if (!response.ok) {
        throw new Error('PDF生成に失敗しました');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ザイロク利用契約書_${contract.organizations?.name || contract.contract_number}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF download error:', error);
      alert('PDFのダウンロードに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? '生成中...' : '契約書を作成'}
    </button>
  );
}
