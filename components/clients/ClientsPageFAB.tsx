'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function ClientsPageFAB() {
  const [isScrolled, setIsScrolled] = useState(false)

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
    <Link
      href="/clients/new"
      className={`sm:hidden fixed right-4 z-30 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all ${
        isScrolled ? 'bottom-20 w-12 h-12' : 'bottom-24 w-14 h-14'
      }`}
      aria-label="新規登録"
    >
      <Plus
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all ${
          isScrolled ? 'h-6 w-6' : 'h-7 w-7'
        }`}
      />
    </Link>
  )
}
