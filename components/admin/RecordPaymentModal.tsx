'use client';

import { useState, useEffect } from 'react';

interface Invoice {
  id: string;
  invoice_number: string;
  total_amount: number;
  status: string;
  organizations: {
    name: string;
  };
}

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: string;
  reference_number: string | null;
  notes: string | null;
  invoices: {
    id: string;
    invoice_number: string;
    total_amount: number;
    organizations: {
      name: string;
    };
  };
}

interface RecordPaymentModalProps {
  payment?: Payment | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RecordPaymentModal({ payment, onClose, onSuccess }: RecordPaymentModalProps) {
  const isEditMode = !!payment;
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    invoice_id: payment?.invoices.id || '',
    payment_date: payment?.payment_date || new Date().toISOString().split('T')[0],
    amount: payment?.amount.toString() || '',
    payment_method: payment?.payment_method || 'bank_transfer',
    reference_number: payment?.reference_number || '',
    notes: payment?.notes || '',
  });

  useEffect(() => {
    if (!isEditMode) {
      fetchUnpaidInvoices();
    }
  }, [isEditMode]);

  const fetchUnpaidInvoices = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/invoices?status=sent&limit=100');
      if (!response.ok) {
        throw new Error('請求書の取得に失敗しました');
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      alert('請求書の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.invoice_id || !formData.amount) {
      alert('請求書と金額を入力してください');
      return;
    }

    setSubmitting(true);
    try {
      const url = isEditMode ? `/api/admin/payments/${payment.id}` : '/api/admin/payments';
      const method = isEditMode ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `入金記録の${isEditMode ? '更新' : '作成'}に失敗しました`);
      }

      alert(`入金記録を${isEditMode ? '更新' : '作成'}しました`);
      onSuccess();
    } catch (error: any) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} payment:`, error);
      alert(error.message || `入金記録の${isEditMode ? '更新' : '作成'}に失敗しました`);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedInvoice = invoices.find((inv) => inv.id === formData.invoice_id);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">{isEditMode ? '入金記録編集' : '入金記録'}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 請求書選択 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                請求書 <span className="text-red-500">*</span>
              </label>
              {isEditMode ? (
                <div className="w-full border border-gray-200 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                  {payment.invoices.invoice_number} - {payment.invoices.organizations.name} (¥
                  {new Intl.NumberFormat('ja-JP').format(payment.invoices.total_amount)})
                </div>
              ) : loading ? (
                <p className="text-sm text-gray-500">読み込み中...</p>
              ) : (
                <select
                  value={formData.invoice_id}
                  onChange={(e) => {
                    const invoice = invoices.find((inv) => inv.id === e.target.value);
                    setFormData({
                      ...formData,
                      invoice_id: e.target.value,
                      amount: invoice ? invoice.total_amount.toString() : '',
                    });
                  }}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  required
                >
                  <option value="">請求書を選択してください</option>
                  {invoices.map((invoice) => (
                    <option key={invoice.id} value={invoice.id}>
                      {invoice.invoice_number} - {invoice.organizations.name} (¥
                      {new Intl.NumberFormat('ja-JP').format(invoice.total_amount)})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* 入金日 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                入金日 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) =>
                  setFormData({ ...formData, payment_date: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              />
            </div>

            {/* 入金額 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                入金額 <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-gray-500">¥</span>
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
              {selectedInvoice && (
                <p className="mt-1 text-sm text-gray-500">
                  請求額: ¥{new Intl.NumberFormat('ja-JP').format(selectedInvoice.total_amount)}
                </p>
              )}
            </div>

            {/* 支払方法 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                支払方法 <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.payment_method}
                onChange={(e) =>
                  setFormData({ ...formData, payment_method: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                required
              >
                <option value="bank_transfer">銀行振込</option>
                <option value="cash">現金</option>
                <option value="other">その他</option>
              </select>
            </div>

            {/* 参照番号 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                参照番号（振込人名など）
              </label>
              <input
                type="text"
                value={formData.reference_number}
                onChange={(e) =>
                  setFormData({ ...formData, reference_number: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2"
                placeholder="振込人名、振込ID等"
              />
            </div>

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
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                キャンセル
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? '登録中...' : '登録'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
