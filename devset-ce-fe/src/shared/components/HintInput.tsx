/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

export interface HintItem {
  value: string
  label: string
  detail?: string
}

interface HintInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string
  onChange: (value: string) => void
  items: HintItem[]
}

interface DropdownPos {
  top: number
  left: number
  width: number
}

/**
 * Input with a filterable hint dropdown rendered via portal (escapes overflow clipping).
 * Dropdown opens above the input, full width.
 */
export const HintInput = React.memo(function HintInput({ value, onChange, items, ...inputProps }: HintInputProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [pos, setPos] = useState<DropdownPos>({ top: 0, left: 0, width: 0 })
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const query = value.toLowerCase()
  const filtered = items.filter((item) => item.label.toLowerCase().includes(query) || item.value.toLowerCase().includes(query))
  const showHints = open && filtered.length > 0

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: reset index when query changes
    setActiveIndex(0)
  }, [query])

  useEffect(() => {
    if (!showHints || !listRef.current) return
    const activeEl = listRef.current.children[activeIndex] as HTMLElement | undefined
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, showHints])

  // Position the dropdown above the input using getBoundingClientRect
  useLayoutEffect(() => {
    if (!showHints || !inputRef.current) return
    const rect = inputRef.current.getBoundingClientRect()
    setPos({ top: rect.top + window.scrollY, left: rect.left + window.scrollX, width: rect.width })
  }, [showHints, value])

  const pick = useCallback((val: string) => {
    onChange(val)
    setOpen(false)
    inputRef.current?.focus()
  }, [onChange])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setOpen(true)
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showHints) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      pick(filtered[activeIndex].value)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }, [showHints, filtered, activeIndex, pick])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        wrapperRef.current && !wrapperRef.current.contains(e.target as Node) &&
        listRef.current && !listRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const dropdown = showHints
    ? createPortal(
        <ul
          ref={listRef}
          role="listbox"
          style={{ position: 'absolute', top: pos.top, left: pos.left, width: pos.width, transform: 'translateY(-100%)' }}
          className="z-[9999] mb-1 max-h-52 overflow-y-auto rounded-lg border border-[var(--line-300)] bg-[var(--panel)] py-1 shadow-lg"
        >
          {filtered.map((item, i) => (
            <li
              key={item.value}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault()
                pick(item.value)
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`cursor-pointer px-3 py-1.5 text-xs leading-relaxed ${
                i === activeIndex
                  ? 'bg-[var(--brand-soft)] text-[var(--brand-ink)]'
                  : 'text-[var(--ink-900)] hover:bg-[var(--panel-soft)]'
              }`}
            >
              <span className="font-mono font-semibold">{item.label}</span>
              {item.detail ? <span className="ml-2 font-normal text-[var(--ink-500)]">{item.detail}</span> : null}
            </li>
          ))}
        </ul>,
        document.body,
      )
    : null

  return (
    <div ref={wrapperRef} className="relative">
      <input
        ref={inputRef}
        {...inputProps}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setOpen(true)}
        autoComplete="off"
      />
      {dropdown}
    </div>
  )
})
