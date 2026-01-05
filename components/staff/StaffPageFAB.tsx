'use client'

interface StaffPageFABProps {
  onClick: () => void
  disabled?: boolean
}

export default function StaffPageFAB({ onClick, disabled = false }: StaffPageFABProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white text-2xl z-40 ${
        disabled
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
      }`}
      aria-label="スタッフを追加"
    >
      +
    </button>
  )
}
