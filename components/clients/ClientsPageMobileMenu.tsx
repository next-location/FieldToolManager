'use client'

import { useState, useRef } from 'react'
import { MoreVertical, Download, Upload } from 'lucide-react'

interface ClientsPageMobileMenuProps {
  onExport: () => void
  onImportClick: () => void
  exporting: boolean
  importing: boolean
}

export default function ClientsPageMobileMenu({
  onExport,
  onImportClick,
  exporting,
  importing,
}: ClientsPageMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false)

  const handleExport = () => {
    onExport()
    setIsOpen(false)
  }

  const handleImport = () => {
    onImportClick()
    setIsOpen(false)
  }

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
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <Download className="h-4 w-4 mr-2" />
              {exporting ? 'エクスポート中...' : 'CSVエクスポート'}
            </button>
            <button
              onClick={handleImport}
              disabled={importing}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              <Upload className="h-4 w-4 mr-2" />
              {importing ? 'インポート中...' : 'CSVインポート'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
