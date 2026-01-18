'use client'

import { useEffect, useState } from 'react'

export function MobileKeyboardDoneButton() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)

  useEffect(() => {
    const handleFocus = () => setIsKeyboardOpen(true)
    const handleBlur = () => setIsKeyboardOpen(false)

    // 全てのフォーム要素にリスナーを追加
    const formElements = document.querySelectorAll('input, textarea, select')
    formElements.forEach((element) => {
      element.addEventListener('focus', handleFocus)
      element.addEventListener('blur', handleBlur)
    })

    return () => {
      formElements.forEach((element) => {
        element.removeEventListener('focus', handleFocus)
        element.removeEventListener('blur', handleBlur)
      })
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
