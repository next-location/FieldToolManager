'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'

interface StaffPageFABProps {
  onClick: () => void
  disabled?: boolean
}

export default function StaffPageFAB({ onClick, disabled = false }: StaffPageFABProps) {
  const [isScrolled, setIsScrolled] = useState(false)

  useEffect(() => {
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // スクロールダウン時に縮小
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolled(true)
      } else if (currentScrollY < lastScrollY) {
        setIsScrolled(false)
      }

      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`fixed right-4 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-40 sm:hidden ${
        isScrolled ? 'w-10 h-10 bottom-20' : 'w-14 h-14 bottom-24'
      } ${
        disabled
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700'
      }`}
      style={{ bottom: isScrolled ? '5rem' : '6rem' }}
      aria-label="スタッフを追加"
    >
      <Plus className={`${isScrolled ? 'h-5 w-5' : 'h-6 w-6'} text-white`} />
    </button>
  )
}
