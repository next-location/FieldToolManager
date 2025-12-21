'use client';

import Link from 'next/link';
import { useState } from 'react';
import { salesStatusLabels, salesStatusColors } from '@/lib/constants/sales-status';

interface StatusCounts {
  not_contacted: number;
  appointment: number;
  prospect: number;
  proposal: number;
  negotiation: number;
  contracting: number;
  contracted: number;
  cancelled: number;
  lost: number;
  do_not_contact: number;
}

interface UpcomingAppointment {
  id: string;
  name: string;
  next_appointment_date: string;
  sales_status: string;
  priority: string;
}

interface ActiveDeal {
  id: string;
  name: string;
  sales_status: string;
  priority: string;
  expected_contract_amount: number | null;
  next_appointment_date: string | null;
  last_contact_date: string | null;
}

interface RecentActivity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  created_at: string;
  created_by_name: string;
  organization_id: string;
  organizations: { name: string }[] | null;
}

interface SalesDashboardProps {
  statusCounts: StatusCounts;
  upcomingAppointments: UpcomingAppointment[];
  activeDeals: ActiveDeal[];
  recentActivities: RecentActivity[];
}

const priorityLabels: Record<string, string> = {
  low: '低',
  medium: '中',
  high: '高',
};

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
};

const activityTypeLabels: Record<string, string> = {
  call: '電話',
  email: 'メール',
  meeting: '面談',
  proposal: '提案',
  other: 'その他',
};

export default function SalesDashboard({
  statusCounts,
  upcomingAppointments,
  activeDeals,
  recentActivities,
}: SalesDashboardProps) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    const formatted = date.toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    if (diffDays === 0) return `今日 ${formatted}`;
    if (diffDays === 1) return `明日 ${formatted}`;
    if (diffDays > 0 && diffDays <= 7) return `${diffDays}日後 ${formatted}`;

    return formatted;
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // 重要度の高い商談の合計金額
  const totalExpectedAmount = activeDeals.reduce(
    (sum, deal) => sum + (deal.expected_contract_amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* ステータス別サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* 未接触 */}
        <button
          onClick={() => setSelectedStatus('not_contacted')}
          className={`bg-white rounded-lg shadow-md border-2 p-4 text-left transition-all hover:shadow-lg ${
            selectedStatus === 'not_contacted' ? 'border-gray-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">未接触</span>
            <span className="inline-block w-3 h-3 rounded-full bg-gray-400"></span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{statusCounts.not_contacted}</p>
        </button>

        {/* アポ取得 */}
        <button
          onClick={() => setSelectedStatus('appointment')}
          className={`bg-white rounded-lg shadow-md border-2 p-4 text-left transition-all hover:shadow-lg ${
            selectedStatus === 'appointment' ? 'border-blue-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">アポ取得</span>
            <span className="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{statusCounts.appointment}</p>
        </button>

        {/* 見込み客 */}
        <button
          onClick={() => setSelectedStatus('prospect')}
          className={`bg-white rounded-lg shadow-md border-2 p-4 text-left transition-all hover:shadow-lg ${
            selectedStatus === 'prospect' ? 'border-cyan-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">見込み客</span>
            <span className="inline-block w-3 h-3 rounded-full bg-cyan-500"></span>
          </div>
          <p className="text-2xl font-bold text-cyan-600">{statusCounts.prospect}</p>
        </button>

        {/* 提案中 */}
        <button
          onClick={() => setSelectedStatus('proposal')}
          className={`bg-white rounded-lg shadow-md border-2 p-4 text-left transition-all hover:shadow-lg ${
            selectedStatus === 'proposal' ? 'border-yellow-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">提案中</span>
            <span className="inline-block w-3 h-3 rounded-full bg-yellow-500"></span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{statusCounts.proposal}</p>
        </button>

        {/* 商談中 */}
        <button
          onClick={() => setSelectedStatus('negotiation')}
          className={`bg-white rounded-lg shadow-md border-2 p-4 text-left transition-all hover:shadow-lg ${
            selectedStatus === 'negotiation' ? 'border-orange-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">商談中</span>
            <span className="inline-block w-3 h-3 rounded-full bg-orange-500"></span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{statusCounts.negotiation}</p>
        </button>

        {/* 契約手続き中 */}
        <button
          onClick={() => setSelectedStatus('contracting')}
          className={`bg-white rounded-lg shadow-md border-2 p-4 text-left transition-all hover:shadow-lg ${
            selectedStatus === 'contracting' ? 'border-purple-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">契約手続き中</span>
            <span className="inline-block w-3 h-3 rounded-full bg-purple-500"></span>
          </div>
          <p className="text-2xl font-bold text-purple-600">{statusCounts.contracting}</p>
        </button>

        {/* 契約中 */}
        <button
          onClick={() => setSelectedStatus('contracted')}
          className={`bg-white rounded-lg shadow-md border-2 p-4 text-left transition-all hover:shadow-lg ${
            selectedStatus === 'contracted' ? 'border-green-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">契約中</span>
            <span className="inline-block w-3 h-3 rounded-full bg-green-500"></span>
          </div>
          <p className="text-2xl font-bold text-green-600">{statusCounts.contracted}</p>
        </button>

        {/* 失注 */}
        <button
          onClick={() => setSelectedStatus('lost')}
          className={`bg-white rounded-lg shadow-md border-2 p-4 text-left transition-all hover:shadow-lg ${
            selectedStatus === 'lost' ? 'border-amber-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">失注</span>
            <span className="inline-block w-3 h-3 rounded-full bg-amber-500"></span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{statusCounts.lost}</p>
        </button>

        {/* 契約解除 */}
        <button
          onClick={() => setSelectedStatus('cancelled')}
          className={`bg-white rounded-lg shadow-md border-2 p-4 text-left transition-all hover:shadow-lg ${
            selectedStatus === 'cancelled' ? 'border-red-400' : 'border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">契約解除</span>
            <span className="inline-block w-3 h-3 rounded-full bg-red-500"></span>
          </div>
          <p className="text-2xl font-bold text-red-600">{statusCounts.cancelled}</p>
        </button>
      </div>

      {/* 選択されたステータスでフィルタリング */}
      {selectedStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-blue-800">
              「{salesStatusLabels[selectedStatus]}」でフィルタリング中
            </p>
            <div className="flex gap-2">
              <Link
                href={`/admin/sales/leads?status=${selectedStatus}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                一覧を見る
              </Link>
              <button
                onClick={() => setSelectedStatus(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors text-sm"
              >
                クリア
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 次回アポイント（7日以内） */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">📅 次回アポイント（7日以内）</h2>
            <span className="text-sm text-gray-500">{upcomingAppointments.length}件</span>
          </div>

          {upcomingAppointments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">予定されているアポイントはありません</p>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <Link
                  key={apt.id}
                  href={`/admin/sales/${apt.id}`}
                  className="block border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{apt.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[apt.priority]}`}>
                      {priorityLabels[apt.priority]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${salesStatusColors[apt.sales_status]}`}>
                      {salesStatusLabels[apt.sales_status]}
                    </span>
                    <span className="text-gray-600">
                      {formatDate(apt.next_appointment_date)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* 重要商談中（提案中・商談中・契約手続き中） */}
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-900">🔥 重要商談中</h2>
            <div className="text-right">
              <p className="text-xs text-gray-500">見込み合計</p>
              <p className="text-lg font-bold text-orange-600">
                ¥{totalExpectedAmount.toLocaleString()}
              </p>
            </div>
          </div>

          {activeDeals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">進行中の商談はありません</p>
          ) : (
            <div className="space-y-3">
              {activeDeals.slice(0, 5).map((deal) => (
                <Link
                  key={deal.id}
                  href={`/admin/sales/${deal.id}`}
                  className="block border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900">{deal.name}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${priorityColors[deal.priority]}`}>
                      {priorityLabels[deal.priority]}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className={`px-2 py-1 rounded text-xs ${salesStatusColors[deal.sales_status]}`}>
                      {salesStatusLabels[deal.sales_status]}
                    </span>
                    {deal.expected_contract_amount && (
                      <span className="font-semibold text-orange-600">
                        ¥{deal.expected_contract_amount.toLocaleString()}
                      </span>
                    )}
                  </div>
                  {deal.next_appointment_date && (
                    <p className="text-xs text-gray-500 mt-1">
                      次回: {formatDate(deal.next_appointment_date)}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 最近の営業活動 */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">📝 最近の営業活動</h2>

        {recentActivities.length === 0 ? (
          <p className="text-gray-500 text-center py-8">営業活動の記録がありません</p>
        ) : (
          <div className="space-y-3">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="border border-gray-200 rounded-lg p-3">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                        {activityTypeLabels[activity.activity_type]}
                      </span>
                      <Link
                        href={`/admin/sales/${activity.organization_id}`}
                        className="font-semibold text-gray-900 hover:text-blue-600"
                      >
                        {activity.organizations?.[0]?.name || '不明'}
                      </Link>
                    </div>
                    <p className="text-sm text-gray-900 font-medium">{activity.title}</p>
                    {activity.description && (
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-xs text-gray-500">{formatDateTime(activity.created_at)}</p>
                    <p className="text-xs text-gray-400">{activity.created_by_name}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
