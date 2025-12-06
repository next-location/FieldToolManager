import { CheckCircle, Clock, XCircle, FileEdit } from 'lucide-react'

type Status = 'draft' | 'submitted' | 'approved' | 'rejected'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const STATUS_CONFIG = {
  draft: {
    label: '下書き',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    icon: FileEdit,
  },
  submitted: {
    label: '提出済み',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
    icon: Clock,
  },
  approved: {
    label: '承認済み',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
    icon: CheckCircle,
  },
  rejected: {
    label: '却下',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    icon: XCircle,
  },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.textColor} ${className}`}
    >
      <Icon className="h-4 w-4" />
      {config.label}
    </span>
  )
}
