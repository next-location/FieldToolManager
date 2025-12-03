'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { HeavyEquipment } from '@/types/heavy-equipment'
import { QRCodeDisplay } from './QRCodeDisplay'

interface EquipmentWithRelations extends HeavyEquipment {
  heavy_equipment_categories?: {
    name: string
    icon: string
  }
  sites?: {
    name: string
  }
  users?: {
    name: string
    email: string
  }
}

interface UsageRecord {
  id: string
  action_type: string
  action_at: string
  hour_meter_reading: number | null
  notes: string | null
  users: { name: string }
  from_site: { name: string } | null
  to_site: { name: string } | null
}

interface MaintenanceRecord {
  id: string
  maintenance_type: string
  maintenance_date: string
  performed_by: string | null
  cost: number | null
  next_date: string | null
  notes: string | null
}

interface EquipmentDetailTabsProps {
  equipment: EquipmentWithRelations
  usageRecords: UsageRecord[]
  maintenanceRecords: MaintenanceRecord[]
  organizationSettings: any
  isLeaderOrAdmin: boolean
}

export default function EquipmentDetailTabs({
  equipment,
  usageRecords,
  maintenanceRecords,
  organizationSettings,
  isLeaderOrAdmin,
}: EquipmentDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'usage' | 'maintenance' | 'qr'>('basic')

  // 所有形態ラベル
  const getOwnershipLabel = (type: string) => {
    switch (type) {
      case 'owned':
        return '自社所有'
      case 'leased':
        return 'リース'
      case 'rented':
        return 'レンタル'
      default:
        return type
    }
  }

  // ステータスラベル
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return '利用可能'
      case 'in_use':
        return '使用中'
      case 'maintenance':
        return '点検中'
      case 'out_of_service':
        return '使用不可'
      default:
        return status
    }
  }

  // ステータスバッジ
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">利用可能</span>
      case 'in_use':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">使用中</span>
      case 'maintenance':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">点検中</span>
      case 'out_of_service':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">使用不可</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>
    }
  }

  // アクションタイプラベル
  const getActionTypeLabel = (type: string) => {
    switch (type) {
      case 'checkout':
        return '持出'
      case 'checkin':
        return '返却'
      case 'transfer':
        return '移動'
      default:
        return type
    }
  }

  // 点検タイプラベル
  const getMaintenanceTypeLabel = (type: string) => {
    switch (type) {
      case 'vehicle_inspection':
        return '車検'
      case 'insurance_renewal':
        return '保険更新'
      case 'repair':
        return '修理'
      case 'other':
        return 'その他'
      default:
        return type
    }
  }

  // 日付フォーマット
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '未設定'
    return new Date(dateString).toLocaleDateString('ja-JP')
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ja-JP')
  }

  // アラート判定
  const getAlerts = () => {
    const alerts: { type: 'error' | 'warning' | 'info'; message: string }[] = []
    const today = new Date()

    if (equipment.requires_vehicle_inspection && equipment.vehicle_inspection_date) {
      const inspectionDate = new Date(equipment.vehicle_inspection_date)
      const daysUntil = Math.floor((inspectionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntil < 0) {
        alerts.push({ type: 'error', message: `車検期限が${Math.abs(daysUntil)}日過ぎています` })
      } else if (daysUntil <= 7) {
        alerts.push({ type: 'error', message: `車検期限まであと${daysUntil}日です` })
      } else if (daysUntil <= 30) {
        alerts.push({ type: 'warning', message: `車検期限まであと${daysUntil}日です` })
      }
    }

    if (equipment.insurance_end_date) {
      const insuranceDate = new Date(equipment.insurance_end_date)
      const daysUntil = Math.floor((insuranceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntil < 0) {
        alerts.push({ type: 'error', message: `保険期限が${Math.abs(daysUntil)}日過ぎています` })
      } else if (daysUntil <= 7) {
        alerts.push({ type: 'error', message: `保険期限まであと${daysUntil}日です` })
      } else if (daysUntil <= 30) {
        alerts.push({ type: 'warning', message: `保険期限まであと${daysUntil}日です` })
      }
    }

    if (equipment.ownership_type !== 'owned' && equipment.contract_end_date) {
      const contractDate = new Date(equipment.contract_end_date)
      const daysUntil = Math.floor((contractDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

      if (daysUntil <= 30) {
        alerts.push({ type: 'info', message: `契約終了まであと${daysUntil}日です` })
      }
    }

    return alerts
  }

  const alerts = getAlerts()

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {/* ヘッダー */}
      <div className="px-4 py-5 sm:px-6 flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg leading-6 font-medium text-gray-900">{equipment.name}</h3>
            {getStatusBadge(equipment.status)}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
              {equipment.equipment_code}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            {equipment.heavy_equipment_categories?.name} | {getOwnershipLabel(equipment.ownership_type)}
          </p>

          {/* アラート表示 */}
          {alerts.length > 0 && (
            <div className="mt-3 space-y-2">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`flex items-center text-sm font-medium ${
                    alert.type === 'error'
                      ? 'text-red-700'
                      : alert.type === 'warning'
                      ? 'text-yellow-700'
                      : 'text-blue-700'
                  }`}
                >
                  {alert.type === 'error' && '🔴'}
                  {alert.type === 'warning' && '🟡'}
                  {alert.type === 'info' && '🔵'}
                  <span className="ml-1">{alert.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {/* 持出・返却ボタン */}
          {equipment.status === 'available' && (
            <Link
              href="/equipment/movement"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
              持出
            </Link>
          )}
          {equipment.status === 'in_use' && (
            <Link
              href="/equipment/movement"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700"
            >
              <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16l-4-4m0 0l4-4m-4 4h18" />
              </svg>
              返却
            </Link>
          )}

          {isLeaderOrAdmin && (
            <Link
              href={`/equipment/${equipment.id}/edit`}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              編集
            </Link>
          )}
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="border-t border-gray-200">
        <nav className="flex -mb-px" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('basic')}
            className={`${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            基本情報
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`${
              activeTab === 'usage'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            使用履歴 ({usageRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`${
              activeTab === 'maintenance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            点検記録 ({maintenanceRecords.length})
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`${
              activeTab === 'qr'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex-1 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            QRコード
          </button>
        </nav>
      </div>

      {/* タブコンテンツ */}
      <div className="border-t border-gray-200">
        {activeTab === 'basic' && (
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">重機コード</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.equipment_code}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">カテゴリ</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {equipment.heavy_equipment_categories?.name || '未設定'}
              </dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">メーカー</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.manufacturer || '未設定'}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">型番</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.model_number || '未設定'}</dd>
            </div>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">シリアル番号</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.serial_number || '未設定'}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">登録番号</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.registration_number || '未設定'}</dd>
            </div>

            {/* 所有形態 */}
            <div className="bg-gray-50 px-4 py-5 sm:px-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">所有形態</h4>
              <dl className="grid grid-cols-1 gap-3">
                <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">所有形態</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-semibold">
                    {getOwnershipLabel(equipment.ownership_type)}
                  </dd>
                </div>

                {equipment.ownership_type === 'owned' && (
                  <>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500">購入日</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(equipment.purchase_date)}</dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500">購入価格</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {equipment.purchase_price ? `¥${equipment.purchase_price.toLocaleString()}` : '未設定'}
                      </dd>
                    </div>
                  </>
                )}

                {(equipment.ownership_type === 'leased' || equipment.ownership_type === 'rented') && (
                  <>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500">リース・レンタル会社</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.supplier_company || '未設定'}</dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500">契約番号</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.contract_number || '未設定'}</dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500">契約期間</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {formatDate(equipment.contract_start_date)} 〜 {formatDate(equipment.contract_end_date)}
                      </dd>
                    </div>
                    <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                      <dt className="text-sm font-medium text-gray-500">月額費用</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {equipment.monthly_cost ? `¥${equipment.monthly_cost.toLocaleString()}/月` : '未設定'}
                      </dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            {/* 車検管理 */}
            {equipment.requires_vehicle_inspection && (
              <div className="bg-white px-4 py-5 sm:px-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">車検管理</h4>
                <dl className="grid grid-cols-1 gap-3">
                  <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                    <dt className="text-sm font-medium text-gray-500">次回車検日</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(equipment.vehicle_inspection_date)}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* 保険管理 */}
            <div className="bg-gray-50 px-4 py-5 sm:px-6">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">保険管理</h4>
              <dl className="grid grid-cols-1 gap-3">
                <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">保険会社</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.insurance_company || '未設定'}</dd>
                </div>
                <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">保険証券番号</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.insurance_policy_number || '未設定'}</dd>
                </div>
                <div className="sm:grid sm:grid-cols-3 sm:gap-4">
                  <dt className="text-sm font-medium text-gray-500">保険期間</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {formatDate(equipment.insurance_start_date)} 〜 {formatDate(equipment.insurance_end_date)}
                  </dd>
                </div>
              </dl>
            </div>

            {/* メーター管理 */}
            {equipment.enable_hour_meter && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">アワーメーター</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {equipment.current_hour_meter ? `${equipment.current_hour_meter} 時間` : '未記録'}
                </dd>
              </div>
            )}

            {/* 現在地・使用者 */}
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">現在地</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.sites?.name || '未設定'}</dd>
            </div>
            <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">使用者</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{equipment.users?.name || '未割当'}</dd>
            </div>

            {/* 備考 */}
            {equipment.notes && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">備考</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-wrap">{equipment.notes}</dd>
              </div>
            )}
          </dl>
        )}

        {activeTab === 'usage' && (
          <div className="px-4 py-5 sm:px-6">
            {usageRecords.length > 0 ? (
              <div className="space-y-4">
                {usageRecords.map((record) => (
                  <div key={record.id} className="border-l-4 border-blue-400 bg-gray-50 p-4 rounded-r">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {getActionTypeLabel(record.action_type)}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{record.users.name}</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {record.from_site && `${record.from_site.name} → `}
                          {record.to_site && record.to_site.name}
                        </p>
                        {record.hour_meter_reading && (
                          <p className="mt-1 text-xs text-gray-500">メーター: {record.hour_meter_reading} 時間</p>
                        )}
                        {record.notes && (
                          <p className="mt-2 text-sm text-gray-600">{record.notes}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{formatDateTime(record.action_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">使用履歴はまだありません</p>
            )}
          </div>
        )}

        {activeTab === 'maintenance' && (
          <div className="px-4 py-5 sm:px-6">
            {maintenanceRecords.length > 0 ? (
              <div className="space-y-4">
                {maintenanceRecords.map((record) => (
                  <div key={record.id} className="border border-gray-200 bg-white p-4 rounded">
                    <div className="flex justify-between items-start mb-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        {getMaintenanceTypeLabel(record.maintenance_type)}
                      </span>
                      <span className="text-sm text-gray-500">{formatDate(record.maintenance_date)}</span>
                    </div>
                    {record.performed_by && (
                      <p className="text-sm text-gray-600">実施者: {record.performed_by}</p>
                    )}
                    {record.cost && (
                      <p className="text-sm text-gray-600">費用: ¥{record.cost.toLocaleString()}</p>
                    )}
                    {record.next_date && (
                      <p className="text-sm text-gray-600">次回予定: {formatDate(record.next_date)}</p>
                    )}
                    {record.notes && (
                      <p className="mt-2 text-sm text-gray-600">{record.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">点検記録はまだありません</p>
            )}
          </div>
        )}

        {activeTab === 'qr' && (
          <div className="px-4 py-5 sm:px-6">
            {equipment.qr_code ? (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-4">
                  この重機のQRコード
                </h4>
                <p className="text-sm text-gray-500 mb-6">
                  このQRコードをスキャンすると、この重機の詳細情報を確認したり、持出・返却の記録ができます。
                </p>
                <QRCodeDisplay
                  value={equipment.qr_code}
                  equipmentName={equipment.name}
                  equipmentCode={equipment.equipment_code}
                  size={256}
                />
                <div className="mt-6 p-4 bg-blue-50 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-blue-800">
                        QRコードの使い方
                      </h3>
                      <div className="mt-2 text-sm text-blue-700">
                        <ul className="list-disc list-inside space-y-1">
                          <li>印刷ボタンでQRコードを印刷できます</li>
                          <li>重機本体にQRコードのシールを貼り付けてください</li>
                          <li>スマートフォンでQRコードをスキャンすると、この重機の管理画面にアクセスできます</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">QRコードが生成されていません</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
