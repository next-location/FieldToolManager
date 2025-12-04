'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { QRCodePrint } from '@/components/qr/QRCodePrint'

interface ToolItemQRCodeModalProps {
  isOpen: boolean
  onClose: () => void
  toolItemId: string
  toolName: string
  serialNumber: string
  qrCode: string
  qrSize?: number
}

export function ToolItemQRCodeModal({
  isOpen,
  onClose,
  toolItemId,
  toolName,
  serialNumber,
  qrCode,
  qrSize = 25
}: ToolItemQRCodeModalProps) {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-lg font-medium leading-6 text-gray-900 mb-4"
                >
                  道具QRコード
                </Dialog.Title>

                <div className="mt-4">
                  <div className="mb-4 text-sm text-gray-600">
                    <p className="font-semibold text-gray-900 mb-1">{toolName}</p>
                    <p className="text-xs text-gray-500">シリアル番号: #{serialNumber}</p>
                  </div>

                  <QRCodePrint
                    value={qrCode}
                    itemName={`${toolName} #${serialNumber}`}
                    itemCode={`ID: ${toolItemId.substring(0, 8)}...`}
                    itemType="道具"
                    size={200}
                    qrSize={qrSize}
                  />
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                    onClick={onClose}
                  >
                    閉じる
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
