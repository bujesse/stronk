import { useEffect, useMemo, useRef, useState } from 'react'

interface DropdownOption {
  value: string
  label: string
}

interface DropdownFieldProps {
  label?: string
  value: string
  placeholder: string
  options: DropdownOption[]
  onChange: (value: string) => void
}

export function DropdownField({
  label,
  value,
  placeholder,
  options,
  onChange,
}: DropdownFieldProps) {
  const fieldRef = useRef<HTMLLabelElement | null>(null)
  const [isOpen, setIsOpen] = useState(false)

  const selectedLabel = useMemo(
    () => options.find((option) => option.value === value)?.label ?? placeholder,
    [options, placeholder, value],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!fieldRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isOpen])

  return (
    <label className={isOpen ? 'select-field open' : 'select-field'} ref={fieldRef}>
      {label ? <span className="select-label">{label}</span> : null}
      <button
        type="button"
        className={isOpen ? 'styled-select trigger-open' : 'styled-select'}
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className={value ? 'selected-value' : 'placeholder-value'}>{selectedLabel}</span>
      </button>
      {isOpen ? (
        <div className="select-menu">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={option.value === value ? 'select-option active-option' : 'select-option'}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  )
}
