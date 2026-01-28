'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface MonthlySalesData {
  month: string
  totalAmount: number
  paidAmount: number
  invoiceCount: number
}

interface SalesChartProps {
  data: MonthlySalesData[]
}

export default function SalesChart({ data }: SalesChartProps) {
  // グラフ用データの整形
  const chartData = data.map(month => {
    const collectionRate = month.totalAmount > 0
      ? (month.paidAmount / month.totalAmount) * 100
      : 0

    return {
      month: month.month,
      売上額: Math.round(month.totalAmount / 10000), // 万円単位
      入金額: Math.round(month.paidAmount / 10000),
      回収率: Number(collectionRate.toFixed(1))
    }
  })

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <h2 className="text-lg font-bold mb-4">月次推移グラフ</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => `${value}万円`}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 12 }}
            domain={[0, 100]}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === '回収率') return [`${value}%`, name]
              return [`¥${(value * 10000).toLocaleString()}`, name]
            }}
          />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="売上額"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="入金額"
            stroke="#10B981"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="回収率"
            stroke="#F59E0B"
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
