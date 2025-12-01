'use client'

import { useState } from 'react'
import Link from 'next/link'

type Tool = {
  id: string
  name: string
  model_number: string | null
  quantity: number
}

type ToolSetFormProps = {
  tools: Tool[]
  action: (formData: FormData) => Promise<void>
}

export function ToolSetForm({ tools, action }: ToolSetFormProps) {
  const [selectedTools, setSelectedTools] = useState<
    Array<{ toolId: string; quantity: number }>
  >([{ toolId: '', quantity: 1 }])

  const addTool = () => {
    setSelectedTools([...selectedTools, { toolId: '', quantity: 1 }])
  }

  const removeTool = (index: number) => {
    setSelectedTools(selectedTools.filter((_, i) => i !== index))
  }

  const updateTool = (index: number, field: 'toolId' | 'quantity', value: string | number) => {
    const updated = [...selectedTools]
    updated[index] = { ...updated[index], [field]: value }
    setSelectedTools(updated)
  }

  return (
    <form action={action}>
      <div className="space-y-6">
        {/* セット名 */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            セット名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="例: 基本工具セット、電動工具セット"
          />
        </div>

        {/* 説明 */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            説明
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="このセットの用途や内容を説明"
          />
        </div>

        {/* 道具選択 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              道具を選択 <span className="text-red-500">*</span>
            </label>
            <button
              type="button"
              onClick={addTool}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + 道具を追加
            </button>
          </div>

          <div className="space-y-3">
            {selectedTools.map((item, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="flex-1">
                  <select
                    name="tool_ids"
                    value={item.toolId}
                    onChange={(e) => updateTool(index, 'toolId', e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">道具を選択</option>
                    {tools.map((tool) => (
                      <option key={tool.id} value={tool.id}>
                        {tool.name} ({tool.model_number || '型番なし'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="w-32">
                  <input
                    type="number"
                    name="quantities"
                    value={item.quantity}
                    onChange={(e) => updateTool(index, 'quantity', parseInt(e.target.value) || 1)}
                    min="1"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="数量"
                  />
                </div>

                {selectedTools.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTool(index)}
                    className="px-3 py-2 text-red-600 hover:text-red-700"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}
          </div>

          <p className="mt-2 text-sm text-gray-500">
            ※ セットに含める道具と数量を選択してください
          </p>
        </div>

        {/* ボタン */}
        <div className="flex gap-4 pt-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium"
          >
            セットを作成
          </button>
          <Link
            href="/tool-sets"
            className="flex-1 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 font-medium text-center"
          >
            キャンセル
          </Link>
        </div>
      </div>
    </form>
  )
}
