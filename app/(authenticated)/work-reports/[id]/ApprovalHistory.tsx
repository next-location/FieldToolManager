interface ApprovalRecord {
  id: string
  approver_name: string
  action: 'approved' | 'rejected'
  comment: string | null
  created_at: string
}

interface ApprovalHistoryProps {
  approvals: ApprovalRecord[]
}

export function ApprovalHistory({ approvals }: ApprovalHistoryProps) {
  if (!approvals || approvals.length === 0) {
    return null
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getActionBadge = (action: 'approved' | 'rejected') => {
    if (action === 'approved') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          承認
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        却下
      </span>
    )
  }

  return (
    <div className="bg-white shadow sm:rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">承認履歴</h3>
        <div className="space-y-4">
          {approvals.map((approval) => (
            <div key={approval.id} className="border-l-4 border-gray-200 pl-4">
              <div className="flex items-center gap-2 mb-1">
                {getActionBadge(approval.action)}
                <span className="text-sm font-medium text-gray-900">{approval.approver_name}</span>
                <span className="text-xs text-gray-500">{formatDate(approval.created_at)}</span>
              </div>
              {approval.comment && (
                <p className="text-sm text-gray-600 mt-1">{approval.comment}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
