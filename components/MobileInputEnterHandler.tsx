'use client'

import { useEffect } from 'react'

export function MobileInputEnterHandler() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // モバイルのみ & input要素のみ & Enterキー
      if (
        window.innerWidth < 768 &&
        e.key === 'Enter' &&
        e.target instanceof HTMLInputElement &&
        e.target.type !== 'submit' &&
        e.target.type !== 'button'
      ) {
        e.preventDefault()
        e.target.blur()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return null
}
