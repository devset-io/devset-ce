/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import React, { useCallback, useState } from 'react'
import type { SchemaFieldNode } from '../../flow-builder/utils/schema-extraction.utils.ts'

type FieldTreePickerProps = {
  nodes: SchemaFieldNode[]
  value: string
  onChange: (field: string) => void
  placeholder?: string
  emptyLabel?: string
}

const TreeNode = React.memo(function TreeNode({
  node,
  selectedValue,
  onSelect,
  depth,
}: {
  node: SchemaFieldNode
  selectedValue: string
  onSelect: (field: string) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(false)
  const isContainer = node.children.length > 0
  const isSelected = node.field === selectedValue

  const handleClick = useCallback(() => {
    if (isContainer) {
      setExpanded((prev) => !prev)
    } else {
      onSelect(node.field)
    }
  }, [isContainer, node.field, onSelect])

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`flex w-full items-center gap-1 rounded px-1.5 py-1 text-left text-xs transition ${
          isSelected
            ? 'bg-[var(--brand-soft)] font-semibold text-[var(--brand-ink)]'
            : 'text-[var(--ink-700)] hover:bg-[var(--panel-soft)]'
        }`}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {isContainer ? (
          <span className="inline-block w-3 shrink-0 text-[10px] text-[var(--ink-400)]">{expanded ? '\u25BE' : '\u25B8'}</span>
        ) : (
          <span className="inline-block w-3 shrink-0" />
        )}
        <code className="text-[11px]">{node.label}</code>
      </button>
      {isContainer && expanded
        ? node.children.map((child) => (
            <TreeNode key={child.field} node={child} selectedValue={selectedValue} onSelect={onSelect} depth={depth + 1} />
          ))
        : null}
    </>
  )
})

/** Tree picker for selecting nested schema fields. */
export const FieldTreePicker = React.memo(function FieldTreePicker({
  nodes,
  value,
  onChange,
  placeholder,
  emptyLabel,
}: FieldTreePickerProps) {
  const [open, setOpen] = useState(false)

  const handleSelect = useCallback(
    (field: string) => {
      onChange(field)
      setOpen(false)
    },
    [onChange],
  )

  return (
    <div className="relative mt-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-[var(--line-300)] bg-[var(--panel-soft)] px-2.5 py-2 text-left text-sm text-[var(--ink-900)] outline-none transition focus:border-[var(--brand)] focus:ring-2 focus:ring-[var(--brand-soft)]"
      >
        <span className={value ? '' : 'text-[var(--ink-400)]'}>
          {value ? <code className="text-xs">{value}</code> : (placeholder ?? 'Select field...')}
        </span>
        <span className="text-[10px] text-[var(--ink-400)]">{open ? '\u25B4' : '\u25BE'}</span>
      </button>
      {open ? (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[var(--line-300)] bg-[var(--panel)] py-1 shadow-lg">
          {nodes.length > 0 ? (
            nodes.map((node) => (
              <TreeNode key={node.field} node={node} selectedValue={value} onSelect={handleSelect} depth={0} />
            ))
          ) : (
            <p className="px-2.5 py-1.5 text-xs text-[var(--ink-400)]">{emptyLabel ?? 'No fields'}</p>
          )}
        </div>
      ) : null}
    </div>
  )
})
