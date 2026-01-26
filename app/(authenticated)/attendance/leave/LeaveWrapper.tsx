'use client'

import { useState, useEffect } from 'react'
import { LeaveList } from './LeaveList'
import { LeaveModal } from './LeaveModal'
import { Plus } from 'lucide-react'

interface LeaveWrapperProps {
  userRole: string
  userId: string
  organizationName: string
}

export function LeaveWrapper({
  userRole,
  userId,
  organizationName,
}: LeaveWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingLeave, setEditingLeave] = useState<any>(null)
  const [tableKey, setTableKey] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)

  // スクロールアニメーション
  useEffect(() => {
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolled(true)
      } else if (currentScrollY < lastScrollY) {
        setIsScrolled(false)
      }

      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const handleSuccess = () => {
    setTableKey((prev) => prev + 1)
    setIsModalOpen(false)
    setEditingLeave(null)
  }

  const handleEdit = (leave: any) => {
    setEditingLeave(leave)
    setIsModalOpen(true)
  }

  const handleCreateNew = () => {
    setEditingLeave(null)
    setIsModalOpen(true)
  }

  const isAdminOrManager = ['admin', 'manager'].includes(userRole)

  return (
    <>
      {/* PC表示: タイトルとボタンを横並び */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">休暇管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            {organizationName} の休暇申請を管理します。
          </p>
        </div>
        <div className="hidden sm:flex">
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            + 新規登録
          </button>
        </div>
      </div>

      <LeaveList
        key={tableKey}
        userRole={userRole}
        userId={userId}
        onEdit={handleEdit}
        onRefresh={() => setTableKey((prev) => prev + 1)}
      />

      {/* スマホ表示: FABボタン */}
      <button
        onClick={handleCreateNew}
        className={`fixed right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-40 sm:hidden ${
          isScrolled ? 'w-10 h-10 bottom-20' : 'w-14 h-14 bottom-24'
        }`}
        style={{ bottom: isScrolled ? '5rem' : '6rem' }}
        aria-label="新規登録"
      >
        <Plus className={`${isScrolled ? 'h-5 w-5' : 'h-6 w-6'}`} />
      </button>

      {/* 休暇登録・編集モーダル */}
      <LeaveModal
        leave={editingLeave}
        isOpen={isModalOpen}
        userRole={userRole}
        userId={userId}
        onClose={() => {
          setIsModalOpen(false)
          setEditingLeave(null)
        }}
        onSuccess={handleSuccess}
      />
    </>
  )
}
