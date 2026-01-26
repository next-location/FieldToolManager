'use client'

import { useState, useEffect } from 'react'
import { WorkPatternsList } from './WorkPatternsList'
import { WorkPatternModal } from './WorkPatternModal'
import { Plus } from 'lucide-react'

interface WorkPatternsWrapperProps {
  userRole: string
  organizationName: string
}

export function WorkPatternsWrapper({
  userRole,
  organizationName,
}: WorkPatternsWrapperProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPattern, setEditingPattern] = useState<any>(null)
  const [tableKey, setTableKey] = useState(0)
  const [isScrolled, setIsScrolled] = useState(false)

  // スクロールアニメーション（道具一覧・勤怠一覧と同じ）
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
    setEditingPattern(null)
  }

  const handleEdit = async (pattern: any) => {
    // 最新のデータを取得してからモーダルを開く
    try {
      const response = await fetch(`/api/attendance/work-patterns/${pattern.id}`)
      if (response.ok) {
        const data = await response.json()
        setEditingPattern(data.pattern)
      } else {
        // 取得失敗時は既存データを使用
        setEditingPattern(pattern)
      }
    } catch (error) {
      console.error('Failed to fetch latest pattern data:', error)
      setEditingPattern(pattern)
    }
    setIsModalOpen(true)
  }

  const handleCreateNew = () => {
    setEditingPattern(null)
    setIsModalOpen(true)
  }

  return (
    <>
      {/* PC表示: タイトルとボタンを横並び */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-gray-900">勤務パターン管理</h1>
          <p className="mt-2 text-sm text-gray-600">
            {organizationName} の勤務パターンを管理します。各パターンで出勤予定時刻とアラート設定を行えます。
          </p>
        </div>
        <div className="hidden sm:flex">
          <button
            onClick={handleCreateNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            + 新規作成
          </button>
        </div>
      </div>

      <WorkPatternsList
        key={tableKey}
        onEdit={handleEdit}
        onRefresh={() => setTableKey((prev) => prev + 1)}
      />

      {/* スマホ表示: FABボタン（道具一覧・勤怠一覧と同じスタイル・アニメーション） */}
      <button
        onClick={handleCreateNew}
        className={`fixed right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-40 sm:hidden ${
          isScrolled ? 'w-10 h-10 bottom-20' : 'w-14 h-14 bottom-24'
        }`}
        style={{ bottom: isScrolled ? '5rem' : '6rem' }}
        aria-label="新規作成"
      >
        <Plus className={`${isScrolled ? 'h-5 w-5' : 'h-6 w-6'}`} />
      </button>

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
    </>
  )
}
