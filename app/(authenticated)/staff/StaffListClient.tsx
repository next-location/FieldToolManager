'use client'

import { useState, useEffect, useRef } from 'react'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import { AddStaffModal } from './AddStaffModal'
import { EditStaffModal } from './EditStaffModal'
import { DeleteConfirmModal } from './DeleteConfirmModal'
import { HistoryModal } from './HistoryModal'
import { BulkImportModal } from './BulkImportModal'
import { PermissionMatrixModal } from './PermissionMatrixModal'
import { PlanUpgradeModal } from './PlanUpgradeModal'
import StaffPageMobileMenu from '@/components/staff/StaffPageMobileMenu'
import StaffFilterModal from '@/components/staff/StaffFilterModal'
import StaffPageFAB from '@/components/staff/StaffPageFAB'
import { ExportButton } from '@/components/export/ExportButton'

interface User {
  id: string
  name: string
  email: string
  role: 'staff' | 'leader' | 'manager' | 'admin' | 'super_admin'
  department: string | null
  employee_id: string | null
  phone: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  work_pattern_id: string | null
  is_shift_work: boolean
}

interface StaffListClientProps {
  userRole: string
  organization: {
    max_users: number
    plan: string
    current_count: number
  } | null
  departments: string[]
  isImpersonating: boolean
}

export function StaffListClient({ userRole, organization, departments, isImpersonating }: StaffListClientProps) {
  const [staff, setStaff] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false)
  const [isPermissionMatrixOpen, setIsPermissionMatrixOpen] = useState(false)
  const [isPlanUpgradeModalOpen, setIsPlanUpgradeModalOpen] = useState(false)
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<User | null>(null)
  const [deletingStaff, setDeletingStaff] = useState<User | null>(null)
  const [historyStaff, setHistoryStaff] = useState<User | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const isAdmin = userRole === 'admin' || userRole === 'super_admin'
  const isManager = userRole === 'manager'
  const isLeader = userRole === 'leader'
  const canManageStaff = isAdmin || isManager
  const usagePercent = organization ? (organization.current_count / organization.max_users) * 100 : 0

  // プラン名の日本語変換
  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      start: 'スタート',
      standard: 'スタンダード',
      business: 'ビジネス',
      pro: 'プロ',
      enterprise: 'エンタープライズ',
    }
    return labels[plan] || plan
  }

  // 権限による操作制限
  // admin: 全員を操作可能
  // manager: admin/super_admin 以外を操作可能
  // leader: 閲覧のみ（編集不可）
  const canEditUser = (targetUser: User) => {
    if (isAdmin) return true
    if (isManager && targetUser.role !== 'admin' && targetUser.role !== 'super_admin') return true
    return false
  }

  // role表示用のヘルパー関数
  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      user: 'スタッフ',
      staff: 'スタッフ',
      leader: 'リーダー',
      manager: 'マネージャー',
      admin: '管理者',
      super_admin: 'スーパー管理者',
    }
    return labels[role] || role
  }

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      user: 'bg-gray-100 text-gray-800',
      staff: 'bg-gray-100 text-gray-800',
      leader: 'bg-blue-100 text-blue-800',
      manager: 'bg-green-100 text-green-800',
      admin: 'bg-purple-100 text-purple-800',
      super_admin: 'bg-red-100 text-red-800',
    }
    return colors[role] || 'bg-gray-100 text-gray-800'
  }

  // スタッフ一覧取得
  const fetchStaff = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      })

      if (search) params.append('search', search)
      if (departmentFilter !== 'all') params.append('department', departmentFilter)
      if (roleFilter !== 'all') params.append('role', roleFilter)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/staff?${params.toString()}`)
      const data = await response.json()

      if (response.ok) {
        setStaff(data.data || [])
        setTotalPages(data.total_pages || 1)
      } else {
        console.error('Failed to fetch staff:', data.error)
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [search, departmentFilter, roleFilter, statusFilter, page])

  // メニュー外クリックで閉じる
  useEffect(() => {
    if (!openMenuId) return

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        // 少し遅延させてボタンのonClickが先に実行されるようにする
        setTimeout(() => setOpenMenuId(null), 0)
      }
    }

    // clickイベントに変更
    document.addEventListener('click', handleClickOutside, true)
    return () => document.removeEventListener('click', handleClickOutside, true)
  }, [openMenuId])

  // アカウント有効化/無効化
  const handleToggleActive = async (userId: string) => {
    console.log('[handleToggleActive] Starting toggle for user:', userId)
    try {
      const response = await fetch(`/api/staff/${userId}/toggle-active`, {
        method: 'POST',
      })

      console.log('[handleToggleActive] Response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[handleToggleActive] Success:', data)
        alert('ステータスを更新しました')
        fetchStaff()
      } else {
        const data = await response.json()
        console.error('[handleToggleActive] Error response:', data)
        alert(data.error || 'ステータスの更新に失敗しました')
      }
    } catch (error) {
      console.error('[handleToggleActive] Exception:', error)
      alert('予期しないエラーが発生しました')
    }
  }

  // パスワードリセット
  const handlePasswordReset = async (userId: string, userName: string) => {
    if (!confirm(`${userName} のパスワードをリセットしますか？\n\nリセットトークンが発行され、24時間以内に新しいパスワードを設定できます。`)) {
      return
    }

    try {
      const response = await fetch(`/api/staff/${userId}/reset-password`, {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        if (data.reset_url) {
          // 開発環境ではURLを表示
          alert(`パスワードリセットトークンを発行しました。\n\nリセットURL: ${data.reset_url}\n\n本番環境ではメールで送信されます。`)
        } else {
          alert('パスワードリセットトークンを発行し、メールを送信しました。')
        }
      } else {
        const data = await response.json()
        alert(data.error || 'パスワードリセットに失敗しました')
      }
    } catch (error) {
      console.error('Error resetting password:', error)
      alert('予期しないエラーが発生しました')
    }
  }

  // 削除確認
  const handleDeleteConfirm = async () => {
    if (!deletingStaff) return

    try {
      const response = await fetch(`/api/staff/${deletingStaff.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setDeletingStaff(null)
        fetchStaff()
      } else {
        const data = await response.json()
        alert(data.error || 'スタッフの削除に失敗しました')
      }
    } catch (error) {
      console.error('Error deleting staff:', error)
      alert('予期しないエラーが発生しました')
    }
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <h1 className="text-lg sm:text-2xl font-bold text-gray-900">スタッフ管理</h1>
            {organization && (
              <span className="inline-flex items-center px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-semibold bg-blue-100 text-blue-800">
                {organization.current_count}/{organization.max_users}名
              </span>
            )}
          </div>
          {isAdmin && (
            <>
              {/* PC表示: 従来通り横並び */}
              <div className="hidden sm:flex gap-3">
                <ExportButton endpoint="/api/staff/export" filename="staff" />
                {isImpersonating && (
                  <button
                    onClick={() => setIsBulkImportModalOpen(true)}
                    disabled={usagePercent >= 100}
                    className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm ${
                      usagePercent >= 100
                        ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    CSVインポート
                  </button>
                )}
                <button
                  onClick={() => setIsPermissionMatrixOpen(true)}
                  className="px-4 py-2 text-sm font-medium rounded-md shadow-sm bg-purple-600 text-white hover:bg-purple-700"
                >
                  権限一覧
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  disabled={usagePercent >= 100}
                  className={`px-4 py-2 text-sm font-medium rounded-md shadow-sm text-white ${
                    usagePercent >= 100
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  + スタッフを追加
                </button>
              </div>

              {/* スマホ表示: 3点メニューのみ */}
              <div className="sm:hidden">
                <StaffPageMobileMenu
                  onCsvImport={isImpersonating ? () => setIsBulkImportModalOpen(true) : undefined}
                  onPermissions={() => setIsPermissionMatrixOpen(true)}
                  disabled={usagePercent >= 100}
                />
              </div>
            </>
          )}
        </div>
        <p className="text-sm text-gray-600">組織内のスタッフを管理します</p>
      </div>

      {/* 利用状況バー */}
      {organization && (
        <div
          className={`border-l-4 p-4 ${
            usagePercent >= 100
              ? 'bg-red-100 border-red-400'
              : usagePercent >= 80
              ? 'bg-yellow-100 border-yellow-400'
              : 'bg-blue-100 border-blue-400'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <p
                className={`font-medium ${
                  usagePercent >= 100
                    ? 'text-red-800'
                    : usagePercent >= 80
                    ? 'text-yellow-800'
                    : 'text-blue-800'
                }`}
              >
                📊 利用状況: {organization.current_count}/{organization.max_users}人 ({getPlanLabel(organization.plan)}プラン)
              </p>
              {usagePercent >= 100 && (
                <p className="mt-1 text-sm text-red-700">
                  ⚠️ プランの上限に達しています。新しいスタッフを追加するには、プランをアップグレードしてください。
                </p>
              )}
              {usagePercent >= 80 && usagePercent < 100 && (
                <p className="mt-1 text-sm text-yellow-700">
                  ⚠️ あと{organization.max_users - organization.current_count}
                  人で上限です。プランアップグレードを検討してください。
                </p>
              )}
            </div>
            {usagePercent >= 100 && (
              <button
                onClick={() => setIsPlanUpgradeModalOpen(true)}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
              >
                プランをアップグレード
              </button>
            )}
          </div>
        </div>
      )}

      {/* 検索・フィルタ - Mobile */}
      <div className="sm:hidden mb-6">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="🔍 名前・メールで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={() => setIsFilterModalOpen(true)}
            className="relative p-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
            aria-label="絞り込み"
          >
            <SlidersHorizontal className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* 検索・フィルタ - PC */}
      <div className="hidden sm:block bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="🔍 名前・メールで検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全ての部署</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全ての権限</option>
            <option value="admin">管理者</option>
            <option value="leader">リーダー</option>
            <option value="staff">一般スタッフ</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">全ての状態</option>
            <option value="active">有効</option>
            <option value="inactive">無効</option>
          </select>
        </div>
      </div>

      {/* カード表示（全デバイス） */}
      <div className="space-y-2">
        {loading ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            読み込み中...
          </div>
        ) : staff.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
            スタッフが見つかりません
          </div>
        ) : (
          staff.map((user) => (
            <div key={user.id} className="bg-white border border-gray-200 rounded-md hover:shadow-md transition-shadow">
              <div className="p-3">
                {/* 上部: 名前・メール・バッジ */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">{user.name}</h3>
                    <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${getRoleColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                    <span
                      className={`w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full ${
                        user.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {user.is_active ? '✓' : '×'}
                    </span>
                  </div>
                </div>

                {/* 中部: 部署・ログイン情報 */}
                <div className="flex items-center gap-3 text-xs text-gray-600 mb-2">
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">部署:</span>
                    <span className="font-medium">{user.department || '未設定'}</span>
                  </span>
                  <span className="text-gray-300">|</span>
                  <span className="flex items-center gap-1">
                    <span className="text-gray-400">最終:</span>
                    <span>
                      {user.last_login_at
                        ? new Date(user.last_login_at).toLocaleDateString('ja-JP', {
                            month: '2-digit',
                            day: '2-digit',
                          })
                        : '未'}
                    </span>
                  </span>
                </div>

                {/* 下部: 操作ボタン */}
                {canManageStaff && (
                  <div className="relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === user.id ? null : user.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-50 border border-gray-200 rounded hover:bg-gray-100 transition-colors"
                    >
                      操作
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {openMenuId === user.id && (
                      <div
                        ref={menuRef}
                        className="absolute left-0 right-0 z-[9999] mt-1 rounded-md bg-white shadow-xl border border-gray-200"
                      >
                        <div className="py-0.5">
                          {isAdmin && (
                            <button
                              onClick={() => {
                                setHistoryStaff(user)
                                setOpenMenuId(null)
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              変更履歴
                            </button>
                          )}
                          {canEditUser(user) && (
                            <button
                              onClick={() => {
                                setEditingStaff(user)
                                setOpenMenuId(null)
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                              編集
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => {
                                handlePasswordReset(user.id, user.name)
                                setOpenMenuId(null)
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                              パスワードリセット
                            </button>
                          )}
                          {isAdmin && user.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                console.log('[有効化ボタン Mobile] クリックされました')
                                handleToggleActive(user.id)
                                setOpenMenuId(null)
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                              style={{ pointerEvents: 'auto' }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {user.is_active ? (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                ) : (
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                )}
                              </svg>
                              {user.is_active ? '無効化' : '有効化'}
                            </button>
                          )}
                          {canEditUser(user) && user.role !== 'admin' && (
                            <>
                              <div className="border-t border-gray-100 my-0.5"></div>
                              <button
                                onClick={() => {
                                  setDeletingStaff(user)
                                  setOpenMenuId(null)
                                }}
                                className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                削除
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm border rounded-md disabled:opacity-50"
          >
            前へ
          </button>
          <span className="px-4 py-2 text-sm">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm border rounded-md disabled:opacity-50"
          >
            次へ
          </button>
        </div>
      )}

      {/* モーダル */}
      <AddStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchStaff}
        departments={departments}
      />

      {editingStaff && (
        <EditStaffModal
          isOpen={true}
          onClose={() => setEditingStaff(null)}
          onSuccess={fetchStaff}
          staff={editingStaff}
          departments={departments}
        />
      )}

      {deletingStaff && (
        <DeleteConfirmModal
          isOpen={true}
          onClose={() => setDeletingStaff(null)}
          onConfirm={handleDeleteConfirm}
          staffName={deletingStaff.name}
        />
      )}

      {historyStaff && (
        <HistoryModal
          isOpen={true}
          onClose={() => setHistoryStaff(null)}
          staffId={historyStaff.id}
          staffName={historyStaff.name}
        />
      )}

      <BulkImportModal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        onSuccess={fetchStaff}
      />

      <PermissionMatrixModal
        isOpen={isPermissionMatrixOpen}
        onClose={() => setIsPermissionMatrixOpen(false)}
      />

      {organization && (
        <PlanUpgradeModal
          isOpen={isPlanUpgradeModalOpen}
          onClose={() => setIsPlanUpgradeModalOpen(false)}
          currentPlan={organization.plan}
          currentUserCount={organization.current_count}
          maxUsers={organization.max_users}
        />
      )}

      <StaffFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        departmentFilter={departmentFilter}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onDepartmentChange={setDepartmentFilter}
        onRoleChange={setRoleFilter}
        onStatusChange={setStatusFilter}
        departments={departments}
      />

      {/* スマホのみ: FABボタン */}
      {isAdmin && (
        <StaffPageFAB
          onClick={() => setIsAddModalOpen(true)}
          disabled={usagePercent >= 100}
        />
      )}
    </div>
  )
}
