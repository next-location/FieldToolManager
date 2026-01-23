import { getActionTypeLabel, InvoiceActionType } from '@/lib/invoice-history'

interface InvoiceHistoryItem {
  id: string
  action_type: InvoiceActionType
  performed_by_name: string
  notes?: string
  created_at: string
}

interface InvoiceHistoryTimelineProps {
  history: InvoiceHistoryItem[]
}

export function InvoiceHistoryTimeline({ history }: InvoiceHistoryTimelineProps) {
  const getIcon = (actionType: InvoiceActionType) => {
    switch (actionType) {
      case 'created':
        return '📝'
      case 'draft_saved':
        return '💾'
      case 'submitted':
        return '📤'
      case 'approved':
        return '✅'
      case 'returned':
        return '↩️'
      case 'sent':
        return '📧'
      case 'pdf_generated':
        return '📄'
      case 'payment_recorded':
        return '💰'
      case 'payment_completed':
        return '✨'
      default:
        return '📌'
    }
  }

  const getColor = (actionType: InvoiceActionType) => {
    switch (actionType) {
      case 'created':
      case 'draft_saved':
        return 'bg-gray-100 border-gray-300'
      case 'submitted':
        return 'bg-orange-100 border-orange-300'
      case 'approved':
        return 'bg-green-100 border-green-300'
      case 'returned':
        return 'bg-red-100 border-red-300'
      case 'sent':
        return 'bg-purple-100 border-purple-300'
      case 'payment_recorded':
      case 'payment_completed':
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
      {[...history].reverse().map((item, index) => (
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
