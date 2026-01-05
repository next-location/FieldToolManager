'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Client, ClientType } from '@/types/clients'
import ImportExportButtons from './ImportExportButtons'
import ClientsPageFAB from '@/components/clients/ClientsPageFAB'

type TabType = 'all' | 'customer' | 'supplier' | 'partner' | 'both'

interface ClientTabsProps {
  clients: Client[]
  initialTab?: TabType
}

export function ClientTabs({ clients, initialTab = 'all' }: ClientTabsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>(initialTab)
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '')

  const tabs = [
    { id: 'all' as TabType, name: 'すべて', count: clients.length },
    {
      id: 'customer' as TabType,
      name: '顧客',
      count: clients.filter((c) => c.client_type === 'customer').length,
    },
    {
      id: 'supplier' as TabType,
      name: '仕入先',
      count: clients.filter((c) => c.client_type === 'supplier').length,
    },
    {
      id: 'partner' as TabType,
      name: '協力会社',
      count: clients.filter((c) => c.client_type === 'partner').length,
    },
    {
      id: 'both' as TabType,
      name: '顧客兼仕入先',
      count: clients.filter((c) => c.client_type === 'both').length,
    },
  ]

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId)
    const params = new URLSearchParams(searchParams.toString())
    if (tabId !== 'all') {
      params.set('client_type', tabId)
    } else {
      params.delete('client_type')
    }
    router.push(`/clients?${params.toString()}`)
  }

  // ひらがなをカタカナに変換する関数
  const hiraganaToKatakana = (str: string) => {
    return str.replace(/[\u3041-\u3096]/g, (match) => {
      const chr = match.charCodeAt(0) + 0x60
      return String.fromCharCode(chr)
    })
  }

  // リアルタイム検索用のフィルター
  const filteredClients = clients.filter((client) => {
    // タブフィルター
    const matchesTab = activeTab === 'all' || client.client_type === activeTab

    // 検索クエリフィルター
    if (!searchQuery) return matchesTab

    const query = searchQuery.toLowerCase()
    const queryKatakana = hiraganaToKatakana(query)

    const matchesSearch =
      client.name?.toLowerCase().includes(query) ||
      client.name_kana?.toLowerCase().includes(query) ||
      client.name_kana?.toLowerCase().includes(queryKatakana.toLowerCase()) ||
      client.code?.toLowerCase().includes(query) ||
      client.address?.toLowerCase().includes(query) ||
      client.phone?.toLowerCase().includes(query)

    return matchesTab && matchesSearch
  })

  const getTypeBadgeColor = (type: ClientType) => {
    switch (type) {
      case 'customer':
        return 'bg-blue-100 text-blue-800'
      case 'supplier':
        return 'bg-purple-100 text-purple-800'
      case 'partner':
        return 'bg-green-100 text-green-800'
      case 'both':
        return 'bg-orange-100 text-orange-800'
    }
  }

  const getTypeLabel = (type: ClientType) => {
    switch (type) {
      case 'customer':
        return '顧客'
      case 'supplier':
        return '仕入先'
      case 'partner':
        return '協力会社'
      case 'both':
        return '顧客兼仕入先'
    }
  }

  return (
    <>
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">取引先マスタ</h1>
          <div className="hidden sm:flex gap-3">
            <ImportExportButtons
              filters={{
                client_type: activeTab !== 'all' ? activeTab : undefined,
                is_active: 'true',
              }}
            />
            <Link
              href="/clients/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              + 新規登録
            </Link>
          </div>
          <div className="sm:hidden">
            <ImportExportButtons
              mobileMenuOnly
              filters={{
                client_type: activeTab !== 'all' ? activeTab : undefined,
                is_active: 'true',
              }}
            />
          </div>
        </div>
        <p className="text-sm text-gray-600">
          顧客・仕入先・協力会社などの取引先情報を管理します
        </p>
      </div>

      {/* FAB for mobile */}
      <ClientsPageFAB />

      {/* タブナビゲーション */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {tab.name} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* 検索 */}
      <div className="mb-6">
        <div className="max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="取引先名、コード、住所、電話番号で検索..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                title="クリア"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* コンテンツエリア */}
      <div className="bg-white shadow sm:rounded-lg">
        <div className="p-6">
          {/* 説明文 */}
          <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4">
            <div>
              <h3 className="text-sm font-medium text-blue-800">
                {tabs.find((t) => t.id === activeTab)?.name}
              </h3>
              <p className="mt-1 text-sm text-blue-700">
                {filteredClients.length}件の取引先が登録されています
              </p>
            </div>
          </div>

          {/* 取引先一覧 */}
          {filteredClients.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <li key={client.id}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="block hover:bg-gray-50 transition-colors py-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {client.name}
                          </p>
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded-full ${getTypeBadgeColor(
                              client.client_type
                            )}`}
                          >
                            {getTypeLabel(client.client_type)}
                          </span>
                          {!client.is_active && (
                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                              無効
                            </span>
                          )}
                          {client.rating && (
                            <span className="text-xs text-yellow-600">
                              {'⭐'.repeat(client.rating)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                          <span className="font-mono text-xs">{client.code}</span>
                          {client.address && (
                            <span className="flex items-center">
                              <span className="mr-1">📍</span>
                              {client.address}
                            </span>
                          )}
                          {client.phone && (
                            <span className="flex items-center">
                              <span className="mr-1">☎</span>
                              {client.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="ml-4">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-12">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">取引先が見つかりません</h3>
              <p className="mt-1 text-sm text-gray-500">
                {activeTab !== 'all'
                  ? 'このカテゴリには取引先が登録されていません。'
                  : '取引先を新規登録してください。'}
              </p>
              {activeTab === 'all' && (
                <div className="mt-6">
                  <Link
                    href="/clients/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    + 取引先を登録
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
