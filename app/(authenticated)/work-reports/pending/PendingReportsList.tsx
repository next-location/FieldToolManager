'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Worker {
  user_id: string
  name: string
  work_hours: number
}

interface Report {
  id: string
  report_date: string
  description: string
  created_at: string
  site: {
    id: string
    name: string
  } | null
  created_by_user: {
    id: string
    name: string
    email: string
  } | null
  workers: Worker[]
}

interface PendingReportsListProps {
  reports: Report[]
}

export function PendingReportsList({ reports }: PendingReportsListProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [error, setError] = useState('')
  const [showApprovalModal, setShowApprovalModal] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [approvalAction, setApprovalAction] = useState<'approved' | 'rejected'>('approved')
  const [comment, setComment] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showBulkModal, setShowBulkModal] = useState(false)

  const handleOpenModal = (report: Report, action: 'approved' | 'rejected') => {
    setSelectedReport(report)
    setApprovalAction(action)
    setComment('')
    setError('')
    setShowApprovalModal(true)
  }

  const handleCloseModal = () => {
    setShowApprovalModal(false)
    setSelectedReport(null)
    setComment('')
    setError('')
  }

  const handleApproval = async () => {
    if (!selectedReport) return

    setLoading(selectedReport.id)
    setError('')

    try {
      const response = await fetch(`/api/work-reports/${selectedReport.id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: approvalAction,
          comment: comment.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || '処理に失敗しました')
      }

      handleCloseModal()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '処理に失敗しました')
    } finally {
      setLoading(null)
    }
  }

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleToggleSelectAll = () => {
    if (selectedIds.length === reports.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(reports.map((r) => r.id))
    }
  }

  const handleOpenBulkModal = () => {
    if (selectedIds.length === 0) return
    setComment('')
    setError('')
    setShowBulkModal(true)
  }

  const handleCloseBulkModal = () => {
    setShowBulkModal(false)
    setComment('')
    setError('')
  }

  const handleBulkApproval = async () => {
    if (selectedIds.length === 0) return

    setBulkLoading(true)
    setError('')

    try {
      const results = await Promise.all(
        selectedIds.map((id) =>
          fetch(`/api/work-reports/${id}/approve`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'approved',
              comment: comment.trim() || undefined,
            }),
          })
        )
      )

      const failed = results.filter((r) => !r.ok)
      if (failed.length > 0) {
        throw new Error(`${failed.length}件の承認に失敗しました`)
      }

      setSelectedIds([])
      handleCloseBulkModal()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '一括承認に失敗しました')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkPdfExport = async () => {
    if (selectedIds.length === 0) return

    setBulkLoading(true)
    setError('')

    try {
      const response = await fetch('/api/work-reports/bulk-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          report_ids: selectedIds,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'PDF出力に失敗しました')
      }

      const data = await response.json()

      // 各PDFを個別にダウンロード
      for (const pdf of data.pdfs) {
        const pdfResponse = await fetch(pdf.url)
        const blob = await pdfResponse.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = pdf.filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        // ブラウザの連続ダウンロード制限を回避するため、少し待機
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      setSelectedIds([])
    } catch (err) {
      setError(err instanceof Error ? err.message : '一括PDF出力に失敗しました')
    } finally {
      setBulkLoading(false)
    }
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white shadow rounded-lg p-8 text-center">
        <p className="text-gray-500">承認待ちの作業報告書はありません</p>
      </div>
    )
  }

  return (
    <>
      {reports.length > 0 && (
        <div className="mb-4 flex items-center justify-between bg-white shadow px-4 py-3 sm:rounded-lg">
          <div className="flex items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={selectedIds.length === reports.length}
                onChange={handleToggleSelectAll}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">全選択</span>
            </label>
            {selectedIds.length > 0 && (
              <span className="text-sm text-gray-600">{selectedIds.length}件選択中</span>
            )}
          </div>
          {selectedIds.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={handleBulkPdfExport}
                disabled={bulkLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                一括PDF出力
              </button>
              <button
                onClick={handleOpenBulkModal}
                disabled={bulkLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                一括承認
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <ul className="divide-y divide-gray-200">
          {reports.map((report) => (
            <li key={report.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(report.id)}
                    onChange={() => handleToggleSelect(report.id)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/work-reports/${report.id}`}
                        className="text-lg font-medium text-blue-600 hover:text-blue-800"
                      >
                        {report.report_date} - {report.site?.name || '現場名なし'}
                      </Link>
                      <p className="text-sm text-gray-600 mt-1">
                        作成者: {report.created_by_user?.name || '不明'}
                      </p>
                      <p className="text-sm text-gray-600">
                        作業員: {report.workers.length}名
                      </p>
                    </div>
                    <div className="ml-4 flex gap-2">
                      <button
                        onClick={() => handleOpenModal(report, 'approved')}
                        disabled={loading === report.id}
                        className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        承認
                      </button>
                      <button
                        onClick={() => handleOpenModal(report, 'rejected')}
                        disabled={loading === report.id}
                        className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        却下
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-2 line-clamp-2">{report.description}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* 承認/却下モーダル */}
      {showApprovalModal && selectedReport && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {approvalAction === 'approved' ? '承認確認' : '却下確認'}
            </h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-700">
                <strong>報告日:</strong> {selectedReport.report_date}
              </p>
              <p className="text-sm text-gray-700">
                <strong>現場:</strong> {selectedReport.site?.name || '現場名なし'}
              </p>
              <p className="text-sm text-gray-700">
                <strong>作成者:</strong> {selectedReport.created_by_user?.name || '不明'}
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="comment" className="block text-sm font-medium text-gray-700 mb-1">
                コメント（任意）
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="コメントを入力してください"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseModal}
                disabled={loading === selectedReport.id}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
              <button
                onClick={handleApproval}
                disabled={loading === selectedReport.id}
                className={`px-4 py-2 rounded-md text-white disabled:opacity-50 disabled:cursor-not-allowed ${
                  approvalAction === 'approved'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading === selectedReport.id
                  ? '処理中...'
                  : approvalAction === 'approved'
                  ? '承認する'
                  : '却下する'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 一括承認モーダル */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">一括承認確認</h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm text-gray-700">
                選択した{selectedIds.length}件の作業報告書を一括承認します。
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="bulk-comment" className="block text-sm font-medium text-gray-700 mb-1">
                コメント（任意）
              </label>
              <textarea
                id="bulk-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="コメントを入力してください"
              />
              <p className="mt-1 text-xs text-gray-500">
                このコメントは全ての報告書に適用されます
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleCloseBulkModal}
                disabled={bulkLoading}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                キャンセル
              </button>
              <button
                onClick={handleBulkApproval}
                disabled={bulkLoading}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {bulkLoading ? '処理中...' : '一括承認する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
