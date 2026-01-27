'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'

interface AttendanceRecordsFABProps {
  onClick: () => void
  isAdminOrManager: boolean
}

export default function AttendanceRecordsFAB({ onClick, isAdminOrManager }: AttendanceRecordsFABProps) {
  const [isScrolled, setIsScrolled] = useState(false)

  // admin/manager以外は表示しない
  if (!isAdminOrManager) return null

  useEffect(() => {
    let lastScrollY = window.scrollY

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setIsScrolled(true)
      } else if (currentScrollY < lastScrollY) {
        setIsScrolled(false)
      }
      lastScrollY = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <button
      onClick={onClick}
      className={`sm:hidden fixed right-4 z-30 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all ${
        isScrolled ? 'bottom-20 w-12 h-12' : 'bottom-24 w-14 h-14'
      }`}
      aria-label="代理打刻"
    >
      <Plus
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all ${
          isScrolled ? 'h-6 w-6' : 'h-7 w-7'
        }`}
      />
    </button>
  )
}
