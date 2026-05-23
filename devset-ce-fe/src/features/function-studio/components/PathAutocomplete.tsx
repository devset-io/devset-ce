/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useEffect, useRef, useState } from 'react'

const DEFAULT_INPUT_CLASS =
  'w-full rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] px-2.5 py-2 text-sm text-[var(--ink-900)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]'

type PathAutocompleteProps = {
  value: string
  onChange: (value: string) => void
  options: string[]
  placeholder?: string
  inputClassName?: string
}

/** Text input with a styled suggestion dropdown filtered from known options. */
export const PathAutocomplete = React.memo(function PathAutocomplete({
  value,
  onChange,
  options,
  placeholder,
  inputClassName,
}: PathAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)

  const filtered = options.filter(
    (option) => option !== value && option.toLowerCase().includes(value.toLowerCase()),
  )

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  const selectOption = (option: string) => {
    onChange(option)
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && filtered.length > 0) {
      event.preventDefault()
      setIsOpen(true)
      setActiveIndex((index) => Math.min(index + 1, filtered.length - 1))
      return
    }
    if (event.key === 'ArrowUp' && filtered.length > 0) {
      event.preventDefault()
      setActiveIndex((index) => Math.max(index - 1, 0))
      return
    }
    if (event.key === 'Enter' && isOpen && activeIndex >= 0 && filtered[activeIndex]) {
      event.preventDefault()
      selectOption(filtered[activeIndex])
      return
    }
    if (event.key === 'Escape') {
      setIsOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className="relative mt-1">
      <input
        className={`${inputClassName ?? DEFAULT_INPUT_CLASS} pr-7`}
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
          setIsOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={isOpen && filtered.length > 0}
        aria-autocomplete="list"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[var(--ink-400)]"
      >
        {isOpen && filtered.length > 0 ? '▴' : '▾'}
      </span>
      {isOpen && filtered.length > 0 ? (
        <ul
          role="listbox"
          className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--line-300)] bg-[var(--panel)] py-1 shadow-lg"
        >
          {filtered.map((option, index) => (
            <li key={option}>
              <button
                type="button"
                role="option"
                aria-selected={index === activeIndex}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectOption(option)
                }}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex w-full items-center rounded px-2 py-1.5 text-left text-xs transition ${
                  index === activeIndex
                    ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)]'
                    : 'text-[var(--ink-700)] hover:bg-[var(--panel-soft)]'
                }`}
              >
                <code className="text-[11px]">{option}</code>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
})
