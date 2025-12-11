'use client';

import { useState, useEffect } from 'react';

interface RevenueSummary {
  totalContracts: number;
  totalMRR: number;
  totalARR: number;
  yoyGrowth: number;
  averageContractValue: number;
}

interface MonthlyRevenue {
  month: string;
  revenue: number;
  contracts: number;
}

interface PackageRevenue {
  id: string;
  name: string;
  revenue: number;
  contracts: number;
  percentage: number;
}

interface PlanRevenue {
  plan: string;
  revenue: number;
  contracts: number;
}

interface AnalyticsData {
  summary: RevenueSummary;
  monthlyRevenue: MonthlyRevenue[];
  packageRevenue: PackageRevenue[];
  planRevenue: PlanRevenue[];
}

const PLAN_LABELS: Record<string, string> = {
  start: 'スタート',
  standard: 'スタンダード',
  business: 'ビジネス',
  pro: 'プロ',
};

export default function RevenueAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const currentYear = new Date().getFullYear();

  // データ取得
  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics/revenue?year=${currentYear}`);
      if (response.ok) {
        const analytics = await response.json();
        setData(analytics);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">データがありません</div>
      </div>
    );
  }

  const { summary, monthlyRevenue, packageRevenue, planRevenue } = data;

  return (
    <div className="space-y-6">
      {/* 年度表示 */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{currentYear}年 売上データ</h2>
            <p className="text-sm text-gray-600 mt-1">
              アクティブ契約の売上分析
            </p>
          </div>
          {summary.totalContracts === 0 && (
            <div className="text-sm text-gray-500">
              ※ まだ契約データがありません
            </div>
          )}
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">アクティブ契約数</div>
          <div className="text-3xl font-bold text-gray-900">{summary.totalContracts}</div>
          <div className="text-xs text-gray-500 mt-1">件</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">MRR（月次経常収益）</div>
          <div className="text-3xl font-bold text-blue-600">
            ¥{summary.totalMRR.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">/月</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">ARR（年次経常収益）</div>
          <div className="text-3xl font-bold text-green-600">
            ¥{summary.totalARR.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 mt-1">/年</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-2">前年比成長率</div>
          <div className={`text-3xl font-bold ${summary.yoyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.yoyGrowth >= 0 ? '+' : ''}{summary.yoyGrowth.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">YoY</div>
        </div>
      </div>

      {/* 月別売上グラフ */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">月別売上推移</h3>
        <div className="space-y-2">
          {monthlyRevenue.map((item) => {
            const maxRevenue = Math.max(...monthlyRevenue.map((m) => m.revenue));
            const percentage = maxRevenue > 0 ? (item.revenue / maxRevenue) * 100 : 0;

            return (
              <div key={item.month} className="flex items-center gap-4">
                <div className="w-20 text-sm text-gray-600">
                  {new Date(item.month + '-01').toLocaleDateString('ja-JP', { month: 'short' })}
                </div>
                <div className="flex-1">
                  <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-blue-500 transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-3">
                      <span className="text-sm font-medium text-gray-900">
                        ¥{item.revenue.toLocaleString()}
                      </span>
                      <span className="ml-auto text-xs text-gray-600">
                        {item.contracts}件
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* パッケージ別売上 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">パッケージ別売上</h3>
          <div className="space-y-3">
            {packageRevenue.map((item) => {
              const totalRevenue = packageRevenue.reduce((sum, p) => sum + p.revenue, 0);
              const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;

              return (
                <div key={item.id} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">{item.name}</span>
                    <span className="text-sm font-bold text-blue-600">
                      ¥{item.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.contracts}契約
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* プラン別売上 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">プラン別売上</h3>
          <div className="space-y-3">
            {planRevenue.filter((p) => p.contracts > 0).map((item) => {
              const totalRevenue = planRevenue.reduce((sum, p) => sum + p.revenue, 0);
              const percentage = totalRevenue > 0 ? (item.revenue / totalRevenue) * 100 : 0;

              return (
                <div key={item.plan} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {PLAN_LABELS[item.plan] || item.plan}
                    </span>
                    <span className="text-sm font-bold text-green-600">
                      ¥{item.revenue.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {item.contracts}契約 • 平均 ¥{(item.revenue / item.contracts).toLocaleString()}/月
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
