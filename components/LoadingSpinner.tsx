/**
 * 統一ローディングスピナーコンポーネント
 *
 * 使い方:
 * - フルスクリーン表示: <LoadingSpinner />
 * - インライン表示: <LoadingSpinner inline />
 * - サイズ指定: <LoadingSpinner size="sm" | "md" | "lg" />
 */

interface LoadingSpinnerProps {
  /** インライン表示（背景オーバーレイなし） */
  inline?: boolean
  /** スピナーのサイズ */
  size?: 'sm' | 'md' | 'lg'
  /** カスタムメッセージ */
  message?: string
}

export function LoadingSpinner({
  inline = false,
  size = 'md',
  message
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-8 w-8 border-[3px]',
    md: 'h-12 w-12 border-4',
    lg: 'h-16 w-16 border-[5px]'
  }

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`animate-spin rounded-full border-blue-600 border-t-transparent ${sizeClasses[size]}`}
        role="status"
        aria-label="読み込み中"
      />
      {message && (
        <p className="text-sm text-gray-600 font-medium">{message}</p>
      )}
    </div>
  )

  // インライン表示
  if (inline) {
    return spinner
  }

  // フルスクリーン表示（画面中央 + 半透明黒背景）
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      {spinner}
    </div>
  )
}
