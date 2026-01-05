'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreVertical, Settings } from 'lucide-react'

export default function WarehouseLocationsPageMobileMenu() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:text-gray-900"
        aria-label="メニュー"
      >
        <MoreVertical className="h-6 w-6" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 py-1">
            <Link
              href="/settings/organization#warehouse-hierarchy"
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="h-4 w-4 mr-2" />
              階層設定
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
