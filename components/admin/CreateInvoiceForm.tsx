'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Contract {
  id: string;
  contract_number: string;
  monthly_fee: number;
  organizations: {
    id: string;
    name: string;
  } | null;
}

interface CreateInvoiceFormProps {
  contracts: Contract[];
}

export default function CreateInvoiceForm({ contracts }: CreateInvoiceFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // 今日の日付と30日後をデフォルト値に
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  // 前月の請求期間をデフォルトに
  const lastMonthStart = new Date();
  lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
  lastMonthStart.setDate(1);
  const lastMonthEnd = new Date();
  lastMonthEnd.setDate(0); // 前月末日

  const [formData, setFormData] = useState({
    contract_id: '',
    billing_period_start: lastMonthStart.toISOString().split('T')[0],
    billing_period_end: lastMonthEnd.toISOString().split('T')[0],
    invoice_date: today,
    due_date: thirtyDaysLater,
    amount: '',
    notes: '',
  });

  const selectedContract = contracts.find((c) => c.id === formData.contract_id);
  const taxAmount = formData.amount ? Number(formData.amount) * 0.1 : 0;
  const totalAmount = formData.amount ? Number(formData.amount) + taxAmount : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.contract_id || !formData.amount) {
      alert('契約と金額を入力してください');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          tax_amount: taxAmount,
          total_amount: totalAmount,
          organization_id: selectedContract?.organizations?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '請求書の作成に失敗しました');
      }

      const invoice = await response.json();
      alert('請求書を作成しました');
      router.push('/admin/invoices');
    } catch (error: any) {
      console.error('Error creating invoice:', error);
      alert(error.message || '請求書の作成に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  // 契約選択時に金額を自動入力
  const handleContractChange = (contractId: string) => {
    setFormData({ ...formData, contract_id: contractId });
    const contract = contracts.find((c) => c.id === contractId);
    if (contract) {
      setFormData((prev) => ({
        ...prev,
        contract_id: contractId,
        amount: contract.monthly_fee.toString(),
      }));
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 契約選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            契約（顧客企業） <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.contract_id}
            onChange={(e) => handleContractChange(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            required
          >
            <option value="">契約を選択してください</option>
            {contracts.map((contract) => (
              <option key={contract.id} value={contract.id}>
                {contract.organizations?.name || '組織名不明'} ({contract.contract_number})
              </option>
            ))}
          </select>
          {selectedContract && (
            <p className="mt-1 text-sm text-gray-500">
              月額料金: ¥{new Intl.NumberFormat('ja-JP').format(selectedContract.monthly_fee)}
            </p>
          )}
        </div>

        {/* 請求期間 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              請求期間（開始日） <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.billing_period_start}
              onChange={(e) =>
                setFormData({ ...formData, billing_period_start: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              請求期間（終了日） <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.billing_period_end}
              onChange={(e) =>
                setFormData({ ...formData, billing_period_end: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
        </div>

        {/* 請求日・支払期限 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              請求日 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.invoice_date}
              onChange={(e) =>
                setFormData({ ...formData, invoice_date: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              支払期限 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) =>
                setFormData({ ...formData, due_date: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md px-3 py-2"
              required
            />
          </div>
        </div>

        {/* 金額 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            金額（税抜） <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-500">¥</span>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="w-full border border-gray-300 rounded-md pl-8 pr-3 py-2"
              placeholder="0"
              min="0"
              step="1"
              required
            />
          </div>
        </div>

        {/* 金額サマリー */}
        {formData.amount && (
          <div className="bg-gray-50 rounded-md p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">税抜金額:</span>
              <span className="font-semibold">
                ¥{new Intl.NumberFormat('ja-JP').format(Number(formData.amount))}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">消費税（10%）:</span>
              <span className="font-semibold">
                ¥{new Intl.NumberFormat('ja-JP').format(taxAmount)}
              </span>
            </div>
            <div className="border-t border-gray-300 pt-2 flex justify-between">
              <span className="font-bold text-gray-900">合計金額:</span>
              <span className="font-bold text-blue-600 text-lg">
                ¥{new Intl.NumberFormat('ja-JP').format(totalAmount)}
              </span>
            </div>
          </div>
        )}

        {/* 備考 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            備考
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) =>
              setFormData({ ...formData, notes: e.target.value })
            }
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2"
            placeholder="備考を入力..."
          />
        </div>

        {/* ボタン */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? '作成中...' : '請求書を作成（下書き）'}
          </button>
        </div>
      </form>
    </div>
  );
}
