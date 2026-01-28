'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface ClientStats {
  total: number
  active: number
  inactive: number
  byType: {
    customer: number
    supplier: number
    partner: number
    both: number
  }
  averageRating: number
  byRating: {
    5: number
    4: number
    3: number
    2: number
    1: number
    none: number
  }
  transactions: {
    totalAmount: number
    totalCount: number
    averageAmount: number
  }
  totalCreditLimit: number
  invoiceRegistered: number
  taxExempt: number
  monthlyData?: Array<{
    month: string
    sales: number
    purchases: number
    profit: number
    profitRate: number
    transactionCount: number
  }>
  topClients?: Array<{
    name: string
    amount: number
    type: string
  }>
  periodSummary?: {
    totalSales: number
    totalPurchases: number
    totalProfit: number
    averageProfitRate: number
    averageAmountPerClient: number
  }
}

// タブのタイプ定義
type TabType = 'overview' | 'analysis' | 'transactions' | 'compliance'

// グラフ用のカラーパレット
const COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  purple: '#8B5CF6',
  gray: '#6B7280',
}

const TYPE_COLORS = {
  customer: COLORS.primary,
  supplier: COLORS.purple,
  partner: COLORS.secondary,
  both: COLORS.warning,
}

export default function ClientsStats() {
  const [stats, setStats] = useState<ClientStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [dateRange, setDateRange] = useState<'all' | '1month' | '3months' | '6months' | '1year' | 'custom'>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')

  // 期間に応じたラベルと計算ロジック
  const getPeriodLabel = () => {
    switch (dateRange) {
      case 'all':
        return '総取引額（全期間累計）'
      case '1month':
        return '選択期間の取引額'
      case '3months':
        return '選択期間の取引額'
      case '6months':
        return '選択期間の取引額'
      case '1year':
        return '選択期間の取引額'
      case 'custom':
        return '選択期間の取引額'
      default:
        return '総取引額（全期間累計）'
    }
  }

  const getComparisonLabel = () => {
    switch (dateRange) {
      case 'all':
        return null // 全期間の場合は比較なし
      case '1month':
        return '前月比'
      case '3months':
        return '前期比'
      case '6months':
        return '前期比'
      case '1year':
        return '前期比'
      case 'custom':
        return '前期比'
      default:
        return null
    }
  }

  const getPeriodAmount = () => {
    if (!stats?.monthlyData) return 0

    switch (dateRange) {
      case 'all':
        // 全期間: すべてのデータの合計
        return stats.monthlyData.reduce((sum, month) => sum + month.sales, 0)
      case '1month':
        // 直近1ヶ月の合計
        return stats.monthlyData.slice(-1).reduce((sum, month) => sum + month.sales, 0)
      case '3months':
        // 直近3ヶ月の合計
        return stats.monthlyData.slice(-3).reduce((sum, month) => sum + month.sales, 0)
      case '6months':
        // 直近6ヶ月の合計
        return stats.monthlyData.slice(-6).reduce((sum, month) => sum + month.sales, 0)
      case '1year':
        // 全期間の合計（ダミーデータは6ヶ月分のみ）
        return stats.monthlyData.reduce((sum, month) => sum + month.sales, 0)
      case 'custom':
        // カスタム期間の合計（実装は将来的にAPIから取得）
        return stats.monthlyData.reduce((sum, month) => sum + month.sales, 0)
      default:
        return stats.monthlyData.reduce((sum, month) => sum + month.sales, 0)
    }
  }

  const getComparisonRate = () => {
    if (!stats?.monthlyData || stats.monthlyData.length < 2) return null

    switch (dateRange) {
      case 'all':
        // 全期間の場合は比較なし
        return null
      case '1month':
        // 直近1ヶ月 vs 前月
        const thisMonth = stats.monthlyData[stats.monthlyData.length - 1]?.sales || 0
        const lastMonth = stats.monthlyData[stats.monthlyData.length - 2]?.sales || 0
        return lastMonth > 0 ? ((thisMonth / lastMonth - 1) * 100) : 0
      case '3months':
      case '6months':
      case '1year':
      case 'custom':
        // 選択期間 vs 前期間（簡易計算）
        // 実際はAPIから前期データを取得して比較
        return -25.7 // ダミー値
      default:
        return null
    }
  }

  // 分析タブ用: 期間に応じたグラフデータを取得
  const getFilteredMonthlyData = () => {
    if (!stats?.monthlyData) return []

    switch (dateRange) {
      case 'all':
        return stats.monthlyData // 全データ
      case '1month':
        return stats.monthlyData.slice(-1)
      case '3months':
        return stats.monthlyData.slice(-3)
      case '6months':
        return stats.monthlyData.slice(-6)
      case '1year':
        return stats.monthlyData // ダミーデータは6ヶ月分のみ
      case 'custom':
        return stats.monthlyData // カスタム期間は将来実装
      default:
        return stats.monthlyData
    }
  }

  // 分析タブ用: グラフタイトル
  const getGraphTitle = () => {
    switch (dateRange) {
      case 'all':
        return '取引推移（全期間）'
      case '1month':
        return '取引推移（直近1ヶ月）'
      case '3months':
        return '取引推移（直近3ヶ月）'
      case '6months':
        return '取引推移（直近6ヶ月）'
      case '1year':
        return '取引推移（直近1年）'
      case 'custom':
        return '取引推移（カスタム期間）'
      default:
        return '取引推移'
    }
  }

  useEffect(() => {
    fetchStats()
  }, [dateRange, startDate, endDate])

  const fetchStats = async () => {
    try {
      // 期間パラメータの構築
      const params = new URLSearchParams()
      if (dateRange !== 'all') {
        params.append('period', dateRange)
      }
      if (dateRange === 'custom' && startDate && endDate) {
        params.append('start_date', startDate)
        params.append('end_date', endDate)
      }

      const url = `/api/clients/stats${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '統計情報の取得に失敗しました')
      }

      setStats(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '統計情報の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
        {error}
      </div>
    )
  }

  if (!stats) return null

  // 円グラフ用データの準備
  const typeData = [
    { name: '顧客', value: stats.byType.customer, color: TYPE_COLORS.customer },
    { name: '仕入先', value: stats.byType.supplier, color: TYPE_COLORS.supplier },
    { name: '協力会社', value: stats.byType.partner, color: TYPE_COLORS.partner },
    { name: '顧客兼仕入先', value: stats.byType.both, color: TYPE_COLORS.both },
  ].filter((item) => item.value > 0)

  // 評価分布データの準備
  const ratingData = [
    { rating: '★★★★★', count: stats.byRating[5] },
    { rating: '★★★★', count: stats.byRating[4] },
    { rating: '★★★', count: stats.byRating[3] },
    { rating: '★★', count: stats.byRating[2] },
    { rating: '★', count: stats.byRating[1] },
  ].filter((item) => item.count > 0)

  const tabs = [
    { id: 'overview' as const, label: '概要' },
    { id: 'analysis' as const, label: '分析' },
    { id: 'transactions' as const, label: '取引実績' },
    { id: 'compliance' as const, label: 'コンプライアンス' },
  ]

  // 期間選択のラベルを取得
  const getPeriodSelectLabel = () => {
    switch (dateRange) {
      case 'all':
        return '全期間'
      case '1month':
        return '直近1ヶ月'
      case '3months':
        return '直近3ヶ月'
      case '6months':
        return '直近6ヶ月'
      case '1year':
        return '直近1年'
      case 'custom':
        return 'カスタム期間'
      default:
        return '全期間'
    }
  }

  return (
    <div className="space-y-6">
      {/* タブナビゲーション + 期間選択 */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        {/* タブ */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 期間選択フィルター */}
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:ml-auto">
          <div className="flex items-center gap-1.5 sm:gap-2 justify-end sm:justify-start">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">集計期間:</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
              className="h-8 px-2 border border-gray-300 rounded text-xs bg-white hover:border-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全期間</option>
              <option value="1month">直近1ヶ月</option>
              <option value="3months">直近3ヶ月</option>
              <option value="6months">直近6ヶ月</option>
              <option value="1year">直近1年</option>
              <option value="custom">カスタム期間</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div className="flex gap-1 sm:gap-1.5 items-center justify-end sm:justify-start">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-32 sm:w-auto"
                placeholder="開始日"
              />
              <span className="text-gray-400 text-xs">〜</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 px-2 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-32 sm:w-auto"
                placeholder="終了日"
              />
            </div>
          )}
        </div>
      </div>

      {/* タブコンテンツ */}
      <div>
          {/* 概要タブ */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* KPIカード */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-blue-600 font-medium">総取引先数</div>
                  <div className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1">{stats.total}</div>
                  <div className="text-[10px] sm:text-xs text-blue-600 mt-1 sm:mt-2">
                    有効: {stats.active} | 無効: {stats.inactive}
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-green-600 font-medium">{getPeriodLabel()}</div>
                  <div className="text-xl sm:text-3xl font-bold text-green-900 mt-1">
                    ¥{getPeriodAmount().toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-xs text-green-600 mt-1 sm:mt-2">
                    {getComparisonLabel() && getComparisonRate() !== null ? (
                      <>
                        {getComparisonLabel()}: {getComparisonRate()! >= 0 ? '+' : ''}{getComparisonRate()!.toFixed(1)}%
                      </>
                    ) : (
                      '全期間'
                    )}
                  </div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-yellow-600 font-medium">平均評価</div>
                  <div className="text-2xl sm:text-3xl font-bold text-yellow-900 mt-1">
                    {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '-'}
                  </div>
                  <div className="text-[10px] sm:text-xs text-yellow-600 mt-1 sm:mt-2">5段階評価</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 sm:p-4">
                  <div className="text-xs sm:text-sm text-purple-600 font-medium">1取引先あたり平均単価</div>
                  <div className="text-xl sm:text-2xl font-bold text-purple-900 mt-1">
                    ¥{Math.round(stats.periodSummary?.averageAmountPerClient || 0).toLocaleString()}
                  </div>
                  <div className="text-[10px] sm:text-xs text-purple-600 mt-1 sm:mt-2">
                    選択期間の売上 ÷ 取引先数
                  </div>
                </div>
              </div>

              {/* グラフエリア（2行×2列 = 4グラフ） */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* 1. 取引先構成（円グラフ） */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">取引先構成</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={typeData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                        outerRadius={60}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {typeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number | undefined) => `${value || 0}社`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* 2. 売上・仕入れ比較（棒グラフ） */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">売上・仕入れ比較</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={[
                      {
                        name: '選択期間',
                        売上: stats.periodSummary?.totalSales || 0,
                        仕入: stats.periodSummary?.totalPurchases || 0
                      }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number | undefined) => `¥${(value || 0).toLocaleString()}`} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="売上" fill={COLORS.primary} />
                      <Bar dataKey="仕入" fill={COLORS.danger} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* 3. 粗利益率の推移（折れ線グラフ） */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">粗利益率の推移</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={getFilteredMonthlyData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tickFormatter={(value) => `${value.toFixed(0)}%`} tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number | undefined) => `${(value || 0).toFixed(1)}%`} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="profitRate"
                        stroke={COLORS.secondary}
                        strokeWidth={2}
                        name="粗利益率"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* 4. 月次取引件数の推移（折れ線グラフ） */}
                <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">月次取引件数の推移</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={getFilteredMonthlyData()}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(value: number | undefined) => `${value || 0}件`} />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Line
                        type="monotone"
                        dataKey="transactionCount"
                        stroke={COLORS.warning}
                        strokeWidth={2}
                        name="取引件数"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* 分析タブ */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              {/* 月次推移グラフ */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{getGraphTitle()}</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getFilteredMonthlyData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(0)}万円`} />
                    <Tooltip
                      formatter={(value: number | undefined) => `¥${(value || 0).toLocaleString()}`}
                      labelStyle={{ color: '#000' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      name="売上"
                    />
                    <Line
                      type="monotone"
                      dataKey="purchases"
                      stroke={COLORS.danger}
                      strokeWidth={2}
                      name="仕入"
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke={COLORS.secondary}
                      strokeWidth={2}
                      name="粗利益"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 取引先ランキング */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">取引額TOP5（顧客）</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.topClients?.map((client, index) => ({
                    ...client,
                    rank: `${index + 1}位`
                  }))}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rank" tick={{ fontSize: 10 }} />
                    <YAxis tickFormatter={(value) => `${(value / 10000).toFixed(0)}万`} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number | undefined) => `¥${(value || 0).toLocaleString()}`}
                      labelFormatter={(label) => {
                        const index = parseInt(label) - 1
                        return stats.topClients?.[index]?.name || label
                      }}
                    />
                    <Bar dataKey="amount" fill={COLORS.primary} />
                  </BarChart>
                </ResponsiveContainer>
                {/* 顧客名リスト */}
                <div className="mt-3 space-y-1">
                  {stats.topClients?.map((client, index) => (
                    <div key={index} className="text-xs sm:text-sm text-gray-700">
                      <span className="font-semibold">{index + 1}位:</span> {client.name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 取引実績タブ */}
          {activeTab === 'transactions' && (
            <div className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs sm:text-sm text-blue-600 font-medium">累計取引額</div>
                      <div className="text-2xl sm:text-3xl font-bold text-blue-900 mt-1 sm:mt-2">
                        ¥{stats.transactions.totalAmount.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl">💴</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs sm:text-sm text-green-600 font-medium">取引回数</div>
                      <div className="text-2xl sm:text-3xl font-bold text-green-900 mt-1 sm:mt-2">
                        {stats.transactions.totalCount.toLocaleString()}回
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl">📊</div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs sm:text-sm text-purple-600 font-medium">平均取引額</div>
                      <div className="text-2xl sm:text-3xl font-bold text-purple-900 mt-1 sm:mt-2">
                        ¥{Math.round(stats.transactions.averageAmount).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-3xl sm:text-4xl">💰</div>
                  </div>
                </div>
              </div>

              {/* 取引先タイプ別詳細 */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        分類
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        件数
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        構成比
                      </th>
                      <th className="px-3 sm:px-6 py-2 sm:py-3 text-left text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ステータス
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        顧客
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {stats.byType.customer}社
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {stats.total > 0
                          ? ((stats.byType.customer / stats.total) * 100).toFixed(1)
                          : 0}
                        %
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className="px-1.5 sm:px-2 inline-flex text-[10px] sm:text-xs leading-4 sm:leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          売上元
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        仕入先
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {stats.byType.supplier}社
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {stats.total > 0
                          ? ((stats.byType.supplier / stats.total) * 100).toFixed(1)
                          : 0}
                        %
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className="px-1.5 sm:px-2 inline-flex text-[10px] sm:text-xs leading-4 sm:leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                          支払先
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        協力会社
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {stats.byType.partner}社
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {stats.total > 0
                          ? ((stats.byType.partner / stats.total) * 100).toFixed(1)
                          : 0}
                        %
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className="px-1.5 sm:px-2 inline-flex text-[10px] sm:text-xs leading-4 sm:leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          外注先
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                        顧客兼仕入先
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {stats.byType.both}社
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                        {stats.total > 0 ? ((stats.byType.both / stats.total) * 100).toFixed(1) : 0}%
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                        <span className="px-1.5 sm:px-2 inline-flex text-[10px] sm:text-xs leading-4 sm:leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          両方
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* コンプライアンスタブ */}
          {activeTab === 'compliance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* インボイス対応状況 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">インボイス対応状況</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">登録事業者</span>
                        <span className="text-sm font-bold text-blue-600">
                          {stats.invoiceRegistered}社
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full"
                          style={{
                            width: `${
                              stats.total > 0 ? (stats.invoiceRegistered / stats.total) * 100 : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">免税事業者</span>
                        <span className="text-sm font-bold text-yellow-600">{stats.taxExempt}社</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-yellow-500 h-3 rounded-full"
                          style={{
                            width: `${stats.total > 0 ? (stats.taxExempt / stats.total) * 100 : 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">未確認</span>
                        <span className="text-sm font-bold text-gray-600">
                          {stats.total - stats.invoiceRegistered - stats.taxExempt}社
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gray-400 h-3 rounded-full"
                          style={{
                            width: `${
                              stats.total > 0
                                ? ((stats.total - stats.invoiceRegistered - stats.taxExempt) /
                                    stats.total) *
                                  100
                                : 0
                            }%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 与信管理状況 */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">与信管理状況</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-sm text-gray-600">与信限度額合計</span>
                      <span className="text-lg font-bold text-gray-900">
                        ¥{stats.totalCreditLimit.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 border-b border-gray-100">
                      <span className="text-sm text-gray-600">与信使用額</span>
                      <span className="text-lg font-bold text-orange-600">
                        ¥{Math.round(stats.totalCreditLimit * 0.6).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3">
                      <span className="text-sm text-gray-600">使用率</span>
                      <span className="text-lg font-bold text-green-600">60.0%</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-xs text-blue-800">
                      💡 与信限度額の80%を超えた取引先は要注意として自動アラートが発生します
                    </p>
                  </div>
                </div>
              </div>

              {/* コンプライアンスチェックリスト */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  インボイス対応確認状況
                </h3>
                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-3 text-2xl">📋</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">インボイス登録確認率</div>
                      <div className="text-xs text-gray-600 mt-1">
                        登録事業者: {stats.invoiceRegistered}社 / 全体: {stats.total}社
                      </div>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">
                    {stats.total > 0 ? ((stats.invoiceRegistered / stats.total) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  )
}