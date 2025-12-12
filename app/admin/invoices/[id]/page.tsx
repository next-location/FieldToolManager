import { createClient } from '@supabase/supabase-js';
import { getSuperAdminSession } from '@/lib/auth/super-admin';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSuperAdminSession();
  if (!session) {
    redirect('/admin/login');
  }

  const { id } = await params;

  // 請求書データを取得
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      organizations (
        id,
        name,
        subdomain,
        billing_contact_name,
        billing_contact_email,
        billing_address
      ),
      contracts (
        id,
        contract_number,
        contract_type,
        total_monthly_fee
      )
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <AdminHeader userName={session.name} />
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 flex-shrink-0">
            <AdminSidebar />
          </div>
          <main className="flex-1 overflow-y-auto p-6">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
              <p className="text-red-600 font-semibold mb-2">請求書が見つかりません</p>
              <Link href="/admin/invoices" className="text-blue-600 hover:text-blue-700">
                請求書一覧に戻る
              </Link>
            </div>
          </main>
        </div>
      </div>
    );
  }

  // 入金記録を取得
  const { data: payments } = await supabase
    .from('payment_records')
    .select(`
      id,
      payment_date,
      amount,
      payment_method,
      reference_number,
      notes,
      created_at
    `)
    .eq('invoice_id', id)
    .order('payment_date', { ascending: false });

  const totalPaid = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('ja-JP');
  };

  const formatCurrency = (amount: number) => {
    return `¥${new Intl.NumberFormat('ja-JP').format(amount)}`;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      draft: '下書き',
      sent: '送信済',
      paid: '入金済',
      overdue: '延滞',
      cancelled: 'キャンセル',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800',
      overdue: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-500',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      bank_transfer: '銀行振込',
      cash: '現金',
      other: 'その他',
    };
    return labels[method] || method;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <AdminHeader userName={session.name} />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-64 flex-shrink-0">
          <AdminSidebar />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <Link
              href="/admin/invoices"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium mb-3 inline-block"
            >
              ← 請求書一覧に戻る
            </Link>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">請求書詳細</h1>
              <div className="flex gap-2">
                <a
                  href={`/api/admin/invoices/${id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  PDFダウンロード
                </a>
              </div>
            </div>
          </div>

          {/* 請求書情報 */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{invoice.invoice_number}</h2>
                <p className="text-sm text-gray-500">
                  請求日: {formatDate(invoice.invoice_date)}
                </p>
              </div>
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(
                  invoice.status
                )}`}
              >
                {getStatusLabel(invoice.status)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 請求先情報 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                  請求先
                </h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-600">組織名:</dt>
                    <dd className="text-gray-900 font-medium mt-1">
                      <Link
                        href={`/admin/organizations/${invoice.organizations.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {invoice.organizations.name}
                      </Link>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">担当者:</dt>
                    <dd className="text-gray-900 mt-1">
                      {invoice.organizations.billing_contact_name || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">メール:</dt>
                    <dd className="text-gray-900 mt-1">
                      {invoice.organizations.billing_contact_email || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">請求先住所:</dt>
                    <dd className="text-gray-900 mt-1">
                      {invoice.organizations.billing_address || '-'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* 請求情報 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-200">
                  請求情報
                </h3>
                <dl className="space-y-2 text-sm">
                  <div>
                    <dt className="text-gray-600">請求期間:</dt>
                    <dd className="text-gray-900 mt-1">
                      {formatDate(invoice.billing_period_start)} 〜{' '}
                      {formatDate(invoice.billing_period_end)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">支払期限:</dt>
                    <dd className="text-gray-900 mt-1">{formatDate(invoice.due_date)}</dd>
                  </div>
                  {invoice.contracts && (
                    <div>
                      <dt className="text-gray-600">契約:</dt>
                      <dd className="text-gray-900 mt-1">
                        <Link
                          href={`/admin/contracts/${invoice.contracts.id}`}
                          className="text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {invoice.contracts.contract_number}
                        </Link>
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* 金額情報 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="max-w-sm ml-auto space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">金額:</span>
                  <span className="text-gray-900">{formatCurrency(invoice.amount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">消費税 (10%):</span>
                  <span className="text-gray-900">{formatCurrency(invoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                  <span className="text-gray-900">合計:</span>
                  <span className="text-blue-600">{formatCurrency(invoice.total_amount)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-600">入金済額:</span>
                  <span className="text-green-600 font-semibold">{formatCurrency(totalPaid)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">残額:</span>
                  <span className="text-red-600 font-semibold">
                    {formatCurrency(invoice.total_amount - totalPaid)}
                  </span>
                </div>
              </div>
            </div>

            {/* 備考 */}
            {invoice.notes && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">備考</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
              </div>
            )}
          </div>

          {/* 入金履歴 */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">入金履歴</h3>
            {!payments || payments.length === 0 ? (
              <p className="text-gray-500 text-center py-6">入金履歴がありません</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        入金日
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        入金額
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        支払方法
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        参照番号
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        備考
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(payment.payment_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-600">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {getPaymentMethodLabel(payment.payment_method)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.reference_number || '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {payment.notes || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
