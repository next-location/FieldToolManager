'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown, SlidersHorizontal, Search } from 'lucide-react'
import ProjectFiltersModal from './ProjectFiltersModal'

interface Project {
  id: string
  project_code: string
  project_name: string
  start_date: string | null
  end_date: string | null
  contract_amount: number | null
  status: string
  client?: { name: string }
  site?: { site_name: string; site_code: string }
}

interface ProjectListClientProps {
  projects: Project[]
}

export function ProjectListClient({ projects }: ProjectListClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<'start_date' | 'end_date' | 'contract_amount'>('start_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)

  // ソート処理
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // フィルタ・ソート済みデータ
  const filteredAndSortedProjects = useMemo(() => {
    let filtered = projects.filter((project) => {
      // 検索クエリフィルタ
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch =
        !searchQuery ||
        project.project_code.toLowerCase().includes(searchLower) ||
        project.project_name.toLowerCase().includes(searchLower) ||
        project.client?.name.toLowerCase().includes(searchLower)

      // ステータスフィルタ
      const matchesStatus =
        statusFilter === 'all' || project.status === statusFilter

      return matchesSearch && matchesStatus
    })

    // ソート
    filtered.sort((a, b) => {
      let aValue: number = 0
      let bValue: number = 0

      if (sortField === 'start_date') {
        aValue = a.start_date ? new Date(a.start_date).getTime() : 0
        bValue = b.start_date ? new Date(b.start_date).getTime() : 0
      } else if (sortField === 'end_date') {
        aValue = a.end_date ? new Date(a.end_date).getTime() : 0
        bValue = b.end_date ? new Date(b.end_date).getTime() : 0
      } else if (sortField === 'contract_amount') {
        aValue = a.contract_amount || 0
        bValue = b.contract_amount || 0
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filtered
  }, [projects, searchQuery, statusFilter, sortField, sortOrder])

  const SortIcon = ({ field }: { field: typeof sortField }) => {
    if (sortField !== field) return null
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4 inline ml-1" />
    ) : (
      <ChevronDown className="w-4 h-4 inline ml-1" />
    )
  }

  const hasActiveFilters = searchQuery || statusFilter !== 'all'

  const handleReset = () => {
    setSearchQuery('')
    setStatusFilter('all')
  }

  // フィルター適用数をカウント
  const filterCount = [
    statusFilter !== 'all',
  ].filter(Boolean).length

  return (
    <>
      {/* モバイル表示 */}
      <div className="sm:hidden mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="工事番号・工事名・取引先で検索"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="relative p-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            aria-label="フィルター"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-600" />
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {filterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* PC表示 */}
      <div className="hidden sm:block bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900">検索・フィルター</h2>
          {hasActiveFilters && (
            <button
              onClick={handleReset}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              クリア
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* キーワード検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              キーワード検索
            </label>
            <input
              type="text"
              placeholder="工事番号・工事名・取引先で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="all">すべて</option>
              <option value="planning">計画中</option>
              <option value="in_progress">進行中</option>
              <option value="completed">完了</option>
              <option value="cancelled">キャンセル</option>
            </select>
          </div>
        </div>
      </div>

      {/* 件数表示 */}
      <div className="mb-4">
        <div className="text-sm text-gray-700">
          全 {projects.length} 件中 {filteredAndSortedProjects.length} 件を表示
        </div>
      </div>

      {/* PC表示：テーブル */}
      <div className="hidden sm:block bg-white shadow-sm rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  工事番号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  工事名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  取引先
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  現場
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('start_date')}
                >
                  工期 <SortIcon field="start_date" />
                </th>
                <th
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  onClick={() => handleSort('contract_amount')}
                >
                  契約金額 <SortIcon field="contract_amount" />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ステータス
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedProjects.map((project) => (
                <tr key={project.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {project.project_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.project_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.client?.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.site ? (
                      <div>
                        <div className="font-medium text-gray-900">{project.site.site_name}</div>
                        <div className="text-xs text-gray-500">{project.site.site_code}</div>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.start_date && project.end_date
                      ? `${new Date(project.start_date).toLocaleDateString('ja-JP')} ～ ${new Date(project.end_date).toLocaleDateString('ja-JP')}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.contract_amount
                      ? `¥${project.contract_amount.toLocaleString()}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                      project.status === 'planning'
                        ? 'bg-gray-100 text-gray-800'
                        : project.status === 'in_progress'
                        ? 'bg-blue-100 text-blue-800'
                        : project.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {project.status === 'planning' ? '計画中'
                        : project.status === 'in_progress' ? '進行中'
                        : project.status === 'completed' ? '完了'
                        : 'キャンセル'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      詳細
                    </Link>
                    <Link
                      href={`/projects/${project.id}/edit`}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAndSortedProjects.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? '検索条件に一致する工事がありません'
                : '工事データがありません'}
            </div>
          )}
        </div>
      </div>

      {/* モバイル表示：カードレイアウト */}
      <div className="sm:hidden space-y-3">
        {filteredAndSortedProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery || statusFilter !== 'all'
              ? '検索条件に一致する工事がありません'
              : '工事データがありません'}
          </div>
        ) : (
          filteredAndSortedProjects.map((project) => (
            <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-4 relative">
              {/* ステータスバッジ（右上） */}
              <div className="absolute top-3 right-3">
                <span className={`inline-flex px-2 text-xs leading-5 font-semibold rounded-full ${
                  project.status === 'planning'
                    ? 'bg-gray-100 text-gray-800'
                    : project.status === 'in_progress'
                    ? 'bg-blue-100 text-blue-800'
                    : project.status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {project.status === 'planning' ? '計画中'
                    : project.status === 'in_progress' ? '進行中'
                    : project.status === 'completed' ? '完了'
                    : 'キャンセル'}
                </span>
              </div>

              {/* 工事番号・工事名 */}
              <div className="pr-20 mb-3">
                <div className="text-xs text-gray-500">工事番号</div>
                <div className="font-medium text-gray-900">{project.project_code}</div>
                <div className="text-sm font-medium text-gray-900 mt-1">{project.project_name}</div>
              </div>

              {/* 詳細情報 2x2グリッド */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                <div>
                  <div className="text-xs text-gray-500 mb-1">取引先</div>
                  <div className="font-medium text-gray-900">{project.client?.name || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">現場</div>
                  <div className="font-medium text-gray-900">
                    {project.site ? (
                      <div>
                        <div>{project.site.site_name}</div>
                        <div className="text-xs text-gray-500">{project.site.site_code}</div>
                      </div>
                    ) : (
                      '-'
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">契約金額</div>
                  <div className="font-medium text-gray-900">
                    {project.contract_amount
                      ? `¥${project.contract_amount.toLocaleString()}`
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">工期</div>
                  <div className="font-medium text-gray-900">
                    {project.start_date && project.end_date
                      ? `${new Date(project.start_date).toLocaleDateString('ja-JP')} ～ ${new Date(project.end_date).toLocaleDateString('ja-JP')}`
                      : '-'}
                  </div>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <Link
                  href={`/projects/${project.id}`}
                  className="flex-1 text-center px-3 py-2 border border-blue-600 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                >
                  詳細
                </Link>
                <Link
                  href={`/projects/${project.id}/edit`}
                  className="flex-1 text-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  編集
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      {/* フィルターモーダル */}
      <ProjectFiltersModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        onReset={handleReset}
      />
    </>
  )
}
