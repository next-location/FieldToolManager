'use client'

import { useState } from 'react'
import { WorkPatternsList } from '../../work-patterns/WorkPatternsList'
import { WorkPatternModal } from '../../work-patterns/WorkPatternModal'

interface AttendanceWorkPatternsProps {
  organizationId: string
  userRole: string
  organizationName: string
}

export function AttendanceWorkPatterns({
  organizationId,
  userRole,
  organizationName,
}: AttendanceWorkPatternsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPattern, setEditingPattern] = useState<any>(null)
  const [tableKey, setTableKey] = useState(0)

  const handleSuccess = () => {
    setTableKey((prev) => prev + 1)
    setIsModalOpen(false)
    setEditingPattern(null)
  }

  const handleEdit = async (pattern: any) => {
    // 最新のデータを取得してからモーダルを開く
    try {
      console.log('[WorkPatternsWrapper] Fetching latest data for pattern:', pattern.id)
      const response = await fetch(`/api/attendance/work-patterns/${pattern.id}`)
      if (response.ok) {
        const data = await response.json()
        console.log('[WorkPatternsWrapper] Fetched latest data:', data.pattern)
        setEditingPattern(data.pattern)
      } else {
        console.warn('[WorkPatternsWrapper] Failed to fetch, using cached data')
        // 取得失敗時は既存データを使用
        setEditingPattern(pattern)
      }
    } catch (error) {
      console.error('[WorkPatternsWrapper] Failed to fetch latest pattern data:', error)
      setEditingPattern(pattern)
    }
    setIsModalOpen(true)
  }

  const handleCreateNew = () => {
    setEditingPattern(null)
    setIsModalOpen(true)
  }

  return (
    <div>
      {/* ヘッダー */}
      <div className="mb-6">
        <p className="text-sm text-gray-600">
          勤務パターンは、スタッフごとに標準的な勤務時間を設定できます。打刻忘れの際の参考値として使用されます。
        </p>
      </div>

      {/* 新規作成ボタン */}
      <div className="mb-4">
        <button
          onClick={handleCreateNew}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          + 新規パターン追加
        </button>
      </div>

      {/* パターン一覧 */}
      <WorkPatternsList
        key={tableKey}
        onEdit={handleEdit}
        onRefresh={() => setTableKey((prev) => prev + 1)}
      />

      {/* 勤務パターン作成・編集モーダル */}
      <WorkPatternModal
        pattern={editingPattern}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingPattern(null)
        }}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
