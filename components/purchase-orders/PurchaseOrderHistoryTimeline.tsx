export type PurchaseOrderActionType =
  | 'created'
  | 'draft_saved'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'sent'
  | 'ordered'
  | 'received'
  | 'paid'
  | 'pdf_generated'

interface PurchaseOrderHistoryItem {
  id: string
  action_type: PurchaseOrderActionType
  performed_by_name: string
  notes?: string
  created_at: string
}

interface PurchaseOrderHistoryTimelineProps {
  history: PurchaseOrderHistoryItem[]
}

/**
 * アクション種別を日本語に変換
 */
function getActionTypeLabel(actionType: PurchaseOrderActionType): string {
  const labels: Record<PurchaseOrderActionType, string> = {
    created: '作成',
    draft_saved: '下書き保存',
    submitted: '確定・提出',
    approved: '承認',
    rejected: '差し戻し',
    sent: '仕入先送付',
    ordered: '発注',
    received: '受領',
    paid: '支払い',
    pdf_generated: 'PDF出力',
  }
  return labels[actionType] || actionType
}

export function PurchaseOrderHistoryTimeline({ history }: PurchaseOrderHistoryTimelineProps) {
  const getIcon = (actionType: PurchaseOrderActionType) => {
    switch (actionType) {
      case 'created':
        return '📝'
      case 'draft_saved':
        return '💾'
      case 'submitted':
        return '📤'
      case 'approved':
        return '✅'
      case 'rejected':
        return '↩️'
      case 'sent':
        return '📧'
      case 'ordered':
        return '📦'
      case 'received':
        return '✓'
      case 'paid':
        return '💰'
      case 'pdf_generated':
        return '📄'
      default:
        return '📌'
    }
  }

  const getColor = (actionType: PurchaseOrderActionType) => {
    switch (actionType) {
      case 'created':
      case 'draft_saved':
        return 'bg-gray-100 border-gray-300'
      case 'submitted':
        return 'bg-orange-100 border-orange-300'
      case 'approved':
        return 'bg-green-100 border-green-300'
      case 'rejected':
        return 'bg-red-100 border-red-300'
      case 'sent':
        return 'bg-purple-100 border-purple-300'
      case 'ordered':
        return 'bg-blue-100 border-blue-300'
      case 'received':
        return 'bg-blue-100 border-blue-300'
      case 'paid':
        return 'bg-blue-100 border-blue-300'
      default:
        return 'bg-gray-100 border-gray-300'
    }
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        履歴がありません
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((item, index) => (
        <div
          key={item.id}
          className={`border-2 rounded-lg p-4 ${getColor(item.action_type)}`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{getIcon(item.action_type)}</span>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold text-gray-900">
                  {getActionTypeLabel(item.action_type)}
                </span>
                <span className="text-sm text-gray-600">
                  {item.performed_by_name}
                </span>
              </div>
              <div className="text-sm text-gray-600 mb-1">
                {new Date(item.created_at).toLocaleString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {item.notes && (
                <div className="text-sm text-gray-700 mt-2">
                  {item.notes}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
