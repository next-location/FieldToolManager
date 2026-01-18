'use client'

import { Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { X } from 'lucide-react'
import { ToolMasterForm } from '@/app/(authenticated)/master/tools-consumables/ToolMasterForm'

type Category = {
  id: string
  name: string
}

type Manufacturer = {
  id: string
  name: string
  country?: string
}

type Master = {
  id: string
  name: string
  model_number: string | null
  manufacturer: string | null
  unit: string
  minimum_stock: number
  image_url: string | null
  notes: string | null
  tool_categories: {
    id: string
    name: string
  } | null
}

type Props = {
  isOpen: boolean
  onClose: () => void
  categories: Category[]
  manufacturers: Manufacturer[]
  organizationId: string
  editingMaster: Master | null
  onSuccess: () => void
}

export default function ToolMasterFormModal({
  isOpen,
  onClose,
  categories,
  manufacturers,
  organizationId,
  editingMaster,
  onSuccess,
}: Props) {
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                {/* ヘッダー */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    {editingMaster ? '道具マスタ編集' : '道具マスタ新規作成'}
                  </Dialog.Title>
                  <button
                    type="button"
                    className="text-gray-400 hover:text-gray-500"
                    onClick={onClose}
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                {/* フォーム */}
                <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
                  <ToolMasterForm
                    categories={categories}
                    manufacturers={manufacturers}
                    organizationId={organizationId}
                    editingMaster={editingMaster}
                    onCancel={onClose}
                    onSuccess={onSuccess}
                  />
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
