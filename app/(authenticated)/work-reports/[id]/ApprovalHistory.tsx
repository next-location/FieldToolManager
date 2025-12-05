'use client'

import { useEffect, useState } from 'react'

interface Approval {
  id: string
  approver_name: string
  action: 'approved' | 'rejected'
  comment: string | null
  approved_at: string
}

interface ApprovalHistoryProps {
  reportId: string
}

export function ApprovalHistory({ reportId }: ApprovalHistoryProps) {
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApprovals()
  }, [reportId])

  const fetchApprovals = async () => {
    try {
      const response = await fetch(`/api/work-reports/${reportId}/approvals`)
      if (response.ok) {
        const data = await response.json()
        setApprovals(data)
      }
    } catch (error) {
      console.error('Failed to fetch approvals:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-sm text-gray-600">≠º-...</div>
  }

  if (approvals.length === 0) {
    return <div className="text-sm text-gray-600">çetoBä~[ì</div>
  }

  return (
    <div className="space-y-4">
      {approvals.map((approval) => (
        <div key={approval.id} className="border-l-4 border-gray-300 pl-4 py-2">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">{approval.approver_name}</span>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    approval.action === 'approved'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {approval.action === 'approved' ? 'ç' : 't'}
                </span>
              </div>
              <div className="mt-1 text-sm text-gray-600">
                {new Date(approval.approved_at).toLocaleString('ja-JP')}
              </div>
              {approval.comment && (
                <div className="mt-2 text-sm text-gray-700 bg-gray-50 rounded p-2">
                  {approval.comment}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
