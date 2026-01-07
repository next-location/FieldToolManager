'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'

export default function ProjectPageFAB() {
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
    <Link
      href="/projects/new"
      className={`fixed right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center z-40 sm:hidden ${
        isScrolled ? 'w-10 h-10 bottom-20' : 'w-14 h-14 bottom-24'
      }`}
      style={{ bottom: isScrolled ? '5rem' : '6rem' }}
      aria-label="新規工事登録"
    >
      <Plus className={`${isScrolled ? 'h-5 w-5' : 'h-6 w-6'}`} />
    </Link>
  )
}
