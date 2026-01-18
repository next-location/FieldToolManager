'use client'

import { useEffect, useState } from 'react'

export function MobileKeyboardDoneButton() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    const handleFocus = (e: Event) => {
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        setIsKeyboardOpen(true)
      }
    }

    const handleBlur = (e: Event) => {
      const target = e.target
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        // 少し遅延させて、他の要素にフォーカスが移っていないか確認
        setTimeout(() => {
          const activeElement = document.activeElement
          if (
            !(activeElement instanceof HTMLInputElement) &&
            !(activeElement instanceof HTMLTextAreaElement) &&
            !(activeElement instanceof HTMLSelectElement)
          ) {
            setIsKeyboardOpen(false)
          }
        }, 100)
      }
    }

    // イベント委譲を使用（動的に追加される要素にも対応）
    document.addEventListener('focusin', handleFocus, true)
    document.addEventListener('focusout', handleBlur, true)

    return () => {
      document.removeEventListener('focusin', handleFocus, true)
      document.removeEventListener('focusout', handleBlur, true)
    }
  }, [])

  const handleDone = () => {
    // フォーカス中の要素をblur
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
    setIsKeyboardOpen(false)
  }

  if (!isKeyboardOpen) return null

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-300 shadow-lg">
      <button
        onClick={handleDone}
        className="w-full py-3 text-base font-medium text-blue-600 bg-white hover:bg-gray-50 active:bg-gray-100"
        type="button"
      >
        完了
      </button>
    </div>
  )
}
