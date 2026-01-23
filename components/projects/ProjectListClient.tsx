'use client'

import { useState, useMemo, useEffect } from 'react'
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
  site?: { id: string; name: string; address: string | null }
}

interface ProjectListClientProps {}

export function ProjectListClient({}: ProjectListClientProps) {
  const [projects, setProjects] = useState<Project[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<'start_date' | 'end_date' | 'contract_amount'>('start_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // API呼び出し関数
  const fetchProjects = async () => {
    try {
      setIsLoading(true)

      const params = new URLSearchParams({
        limit: itemsPerPage.toString(),
        offset: ((currentPage - 1) * itemsPerPage).toString(),
        search: searchQuery,
        sort_field: sortField,
        sort_order: sortOrder,
      })

      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter)
      }

      const response = await fetch(`/api/projects?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const result = await response.json()
      setProjects(result.data || [])
      setTotalCount(result.count || 0)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      alert('工事一覧の取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  // 初回読み込み + ページ・フィルター変更時
  useEffect(() => {
    fetchProjects()
  }, [currentPage, searchQuery, statusFilter, sortField, sortOrder])

  // フィルター・ソート変更時は1ページ目に戻す
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [searchQuery, statusFilter, sortField, sortOrder])

  // ソート処理
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  // ページネーション
  const totalPages = Math.ceil(totalCount / itemsPerPage)

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

  // ローディング表示
  if (isLoading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">読み込み中...</span>
      </div>
    )
  }

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
          全 {totalCount} 件中 {projects.length} 件を表示（{currentPage}/{totalPages} ページ）
        </div>
      </div>

      {/* カードレイアウト（PC・モバイル共通） */}
      <div className="space-y-4">
        {projects.length === 0 && !isLoading ? (
          <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">
            {searchQuery || statusFilter !== 'all'
              ? '検索条件に一致する工事がありません'
              : '工事データがありません'}
          </div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              {/* PC表示 */}
              <div className="hidden sm:block p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{project.project_name}</h3>
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
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
                    <p className="text-sm text-gray-600">工事番号: {project.project_code}</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/projects/${project.id}`}
                      className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors"
                    >
                      詳細
                    </Link>
                    <Link
                      href={`/projects/${project.id}/edit`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                      編集
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-gray-500 mb-1">取引先</div>
                    <div className="font-medium text-gray-900">{project.client?.name || '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500 mb-1">現場</div>
                    <div className="font-medium text-gray-900">
                      {project.site ? project.site.name : '-'}
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
                    <div className="font-medium text-gray-900 text-sm">
                      {project.start_date && project.end_date
                        ? `${new Date(project.start_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} ～ ${new Date(project.end_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}`
                        : '-'}
                    </div>
                  </div>
                </div>
              </div>

              {/* モバイル表示 */}
              <div className="sm:hidden p-4 relative">
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
                      {project.site ? project.site.name : '-'}
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
                    <div className="font-medium text-gray-900 text-xs">
                      {project.start_date && project.end_date
                        ? `${new Date(project.start_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })} ～ ${new Date(project.end_date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}`
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
            </div>
          ))
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1 || isLoading}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            前へ
          </button>
          <span className="text-sm text-gray-700">
            {currentPage} / {totalPages} ページ
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages || isLoading}
            className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      )}

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
