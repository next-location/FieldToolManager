'use client'

import { useState, useRef, useEffect } from 'react'
import { MoreVertical, Upload, Shield } from 'lucide-react'

interface StaffPageMobileMenuProps {
  onCsvImport: () => void
  onPermissions: () => void
  disabled?: boolean
}

export default function StaffPageMobileMenu({
  onCsvImport,
  onPermissions,
  disabled = false
}: StaffPageMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-700 hover:bg-gray-100 rounded-md"
        aria-label="メニュー"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
          <div className="py-1">
            <button
              onClick={() => {
                onCsvImport()
                setIsOpen(false)
              }}
              disabled={disabled}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="h-4 w-4 mr-2" />
              CSVインポート
            </button>
            <button
              onClick={() => {
                onPermissions()
                setIsOpen(false)
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Shield className="h-4 w-4 mr-2" />
              権限一覧
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
