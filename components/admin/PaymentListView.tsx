'use client';

import { useState, useEffect } from 'react';
import RecordPaymentModal from './RecordPaymentModal';

interface Payment {
  id: string;
  payment_date: string;
  amount: number;
  payment_method: 'bank_transfer' | 'cash' | 'other';
  reference_number: string | null;
  notes: string | null;
  created_at: string;
  invoices: {
    id: string;
    invoice_number: string;
    total_amount: number;
    organizations: {
      id: string;
      name: string;
    };
  };
  users: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface PaymentListViewProps {
  initialPage: number;
  initialOrganizationId?: string;
}

export default function PaymentListView({
  initialPage,
  initialOrganizationId,
}: PaymentListViewProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [organizationId, setOrganizationId] = useState<string>(initialOrganizationId || '');
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [page, organizationId]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });

      if (organizationId) {
        params.append('organization_id', organizationId);
      }

      const response = await fetch(`/api/admin/payments?${params}`);
      if (!response.ok) {
        throw new Error('入金記録の取得に失敗しました');
      }

      const data = await response.json();
      setPayments(data.payments || []);
      setTotalPages(data.totalPages || 1);
    } catch (error) {
      console.error('Error fetching payments:', error);
      alert('入金記録の取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatCurrency = (amount: number) => {
    return `¥${new Intl.NumberFormat('ja-JP').format(amount)}`;
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: '銀行振込',
      cash: '現金',
      other: 'その他',
    };
    return labels[method] || method;
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('この入金記録を削除してもよろしいですか？\n請求書のステータスも更新されます。')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/payments/${paymentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '削除に失敗しました');
      }

      alert('入金記録を削除しました');
      fetchPayments();
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      alert(error.message || '削除に失敗しました');
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">入金管理</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + 入金記録
        </button>
      </div>

      {/* 入金記録一覧 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            入金記録がありません
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    入金日
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    顧客企業
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    請求書番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    入金額
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    支払方法
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    参照番号
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    登録者
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(payment.payment_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payment.invoices.organizations.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.invoices.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getPaymentMethodLabel(payment.payment_method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.reference_number || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {payment.users?.name || 'システム'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setEditingPayment(payment);
                            setShowModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          編集
                        </button>
                        <button
                          onClick={() => handleDelete(payment.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          削除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center space-x-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="px-4 py-2">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}

      {/* 入金記録モーダル */}
      {showModal && (
        <RecordPaymentModal
          payment={editingPayment}
          onClose={() => {
            setShowModal(false);
            setEditingPayment(null);
          }}
          onSuccess={() => {
            setShowModal(false);
            setEditingPayment(null);
            fetchPayments();
          }}
        />
      )}
    </div>
  );
}
