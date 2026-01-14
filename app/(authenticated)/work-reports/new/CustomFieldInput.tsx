interface CustomField {
  id: string
  field_key: string
  field_label: string
  field_type: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'checkbox'
  field_options?: string[]
  is_required: boolean
  placeholder?: string
  help_text?: string
}

interface CustomFieldInputProps {
  field: CustomField
  value: any
  onChange: (key: string, value: any) => void
}

export function CustomFieldInput({ field, value, onChange }: CustomFieldInputProps) {
  const handleChange = (newValue: any) => {
    onChange(field.field_key, newValue)
  }

  // 統一フォームスタイル（PC・スマホ対応）
  const inputClassName = "mt-1 block w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-base md:text-sm"
  const selectClassName = "mt-1 block w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-base md:text-sm"
  const textareaClassName = "mt-1 block w-full px-3 py-2.5 md:py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-base md:text-sm"

  return (
    <div>
      <label htmlFor={field.field_key} className="block text-sm font-medium text-gray-700">
        {field.field_label}
        {field.is_required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {field.field_type === 'text' && (
        <input
          type="text"
          id={field.field_key}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          required={field.is_required}
          placeholder={field.placeholder}
          className={inputClassName}
        />
      )}

      {field.field_type === 'textarea' && (
        <textarea
          id={field.field_key}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          required={field.is_required}
          placeholder={field.placeholder}
          rows={3}
          className={textareaClassName}
        />
      )}

      {field.field_type === 'number' && (
        <input
          type="number"
          id={field.field_key}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value ? Number(e.target.value) : '')}
          required={field.is_required}
          placeholder={field.placeholder}
          className={inputClassName}
        />
      )}

      {field.field_type === 'date' && (
        <input
          type="date"
          id={field.field_key}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          required={field.is_required}
          className={inputClassName}
        />
      )}

      {field.field_type === 'select' && field.field_options && (
        <select
          id={field.field_key}
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          required={field.is_required}
          className={selectClassName}
        >
          <option value="">{field.placeholder || '選択してください'}</option>
          {field.field_options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {field.field_type === 'checkbox' && field.field_options && (
        <div className="mt-2 space-y-2">
          {field.field_options.map((option) => (
            <div key={option} className="flex items-center">
              <input
                type="checkbox"
                id={`${field.field_key}_${option}`}
                checked={(value || []).includes(option)}
                onChange={(e) => {
                  const currentValue = value || []
                  const newValue = e.target.checked
                    ? [...currentValue, option]
                    : currentValue.filter((v: string) => v !== option)
                  handleChange(newValue)
                }}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor={`${field.field_key}_${option}`}
                className="ml-2 block text-sm text-gray-700"
              >
                {option}
              </label>
            </div>
          ))}
        </div>
      )}

      {field.help_text && (
        <p className="mt-1 text-sm text-gray-500">{field.help_text}</p>
      )}
    </div>
  )
}
