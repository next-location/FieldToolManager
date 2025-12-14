'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Project {
  id: string
  project_code: string
  project_name: string
  start_date: string | null
  end_date: string | null
  contract_amount: number | null
  status: string
  client?: { name: string }
}

interface ProjectListClientProps {
  projects: Project[]
}

export function ProjectListClient({ projects }: ProjectListClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortField, setSortField] = useState<'start_date' | 'end_date' | 'contract_amount'>('start_date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

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

  return (
    <>
      {/* 検索・フィルタエリア */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* キーワード検索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              キーワード検索
            </label>
            <input
              type="text"
              placeholder="工事番号・工事名・取引先で検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* ステータス */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ステータス
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">全て</option>
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

      {/* テーブル */}
      <div className="bg-white shadow-sm rounded-lg">
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
    </>
  )
}
