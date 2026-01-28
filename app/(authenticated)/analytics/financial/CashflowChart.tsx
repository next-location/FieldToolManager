'use client'

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

interface MonthlyForecast {
  month: string
  expectedIncome: number
  expectedExpense: number
  netCashflow: number
}

interface CashflowChartProps {
  data: MonthlyForecast[]
}

export default function CashflowChart({ data }: CashflowChartProps) {
  // グラフ用データの整形
  const chartData = data.map(month => ({
    month: month.month,
    予想入金: Math.round(month.expectedIncome / 10000), // 万円単位
    予想支払: Math.round(month.expectedExpense / 10000),
    キャッシュフロー: Math.round(month.netCashflow / 10000)
  }))

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-bold mb-4">キャッシュフロー推移グラフ</h2>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            tickFormatter={(value) => `${value}万円`}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            formatter={(value: number) => `¥${(value * 10000).toLocaleString()}`}
          />
          <Legend />
          <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
          <Bar
            dataKey="予想入金"
            fill="#3B82F6"
            opacity={0.8}
          />
          <Bar
            dataKey="予想支払"
            fill="#F59E0B"
            opacity={0.8}
          />
          <Line
            type="monotone"
            dataKey="キャッシュフロー"
            stroke="#10B981"
            strokeWidth={3}
            dot={{ r: 5 }}
            activeDot={{ r: 7 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 opacity-80"></div>
          <span>予想入金</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-600 opacity-80"></div>
          <span>予想支払</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-green-600"></div>
          <span>キャッシュフロー（入金-支払）</span>
        </div>
      </div>
    </div>
  )
}
