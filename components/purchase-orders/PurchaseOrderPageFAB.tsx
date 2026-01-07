'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default function PurchaseOrderPageFAB() {
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
      href="/purchase-orders/new"
      className={`sm:hidden fixed right-4 bottom-20 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-300 flex items-center justify-center z-40 ${
        isScrolled ? 'w-10 h-10' : 'w-14 h-14'
      }`}
      aria-label="新規発注書作成"
    >
      <Plus className={isScrolled ? 'h-5 w-5' : 'h-6 w-6'} />
    </Link>
  )
}
