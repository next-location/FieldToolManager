'use client';

export default function CreateContractDocumentButton() {
  return (
    <button
      onClick={() => alert('契約書作成機能は近日実装予定です')}
      className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
    >
      契約書を作成
    </button>
  );
}
