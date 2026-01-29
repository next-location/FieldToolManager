'use client'

import { useState } from 'react'
import CostReportView from '@/app/(authenticated)/equipment/cost-report/CostReportView'
import AnalyticsReportView from '@/app/(authenticated)/equipment/analytics/AnalyticsReportView'
import type {
  HeavyEquipment,
  HeavyEquipmentUsageRecord,
  HeavyEquipmentMaintenance,
} from '@/types/heavy-equipment'

type TabType = 'cost' | 'analytics'

interface EquipmentManagementDashboardProps {
  equipment: HeavyEquipment[]
  usageMap: Record<string, HeavyEquipmentUsageRecord[]>
  maintenanceMap: Record<string, HeavyEquipmentMaintenance[]>
  defaultPeriodStart: string
  defaultPeriodEnd: string
  userRole: string
}

export default function EquipmentManagementDashboard({
  equipment,
  usageMap,
  maintenanceMap,
  defaultPeriodStart,
  defaultPeriodEnd,
  userRole,
}: EquipmentManagementDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('cost')

  return (
    <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <div className="px-4 pb-6 sm:px-0 sm:py-6">
        <div className="mb-6">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">重機管理分析</h1>
          <p className="mt-2 text-sm text-gray-600">
            重機のコスト・稼働率を一元管理できます
          </p>
        </div>

        {/* 第1階層タブ */}
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('cost')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'cost'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              コスト分析
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              稼働率分析
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div>
          {activeTab === 'cost' && (
            <CostReportView
              equipment={equipment}
              maintenanceMap={maintenanceMap}
              defaultPeriodStart={defaultPeriodStart}
              defaultPeriodEnd={defaultPeriodEnd}
              userRole={userRole}
            />
          )}

          {activeTab === 'analytics' && (
            <AnalyticsReportView
              equipment={equipment}
              usageMap={usageMap}
              maintenanceMap={maintenanceMap}
              defaultPeriodStart={defaultPeriodStart}
              defaultPeriodEnd={defaultPeriodEnd}
              userRole={userRole}
            />
          )}
        </div>
      </div>
    </div>
  )
}
