/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useCallback, useMemo, useState } from 'react'
import type { SetEntry } from '../../flow-builder/types.ts'
import { relativeLabel } from '../utils/function-studio.utils.ts'

type UseSetFieldsSnapshotStateParams = {
  scopePath: string
  visibleEntries: SetEntry[]
  inheritedFields: string[]
  setRootFields: string[]
  sourceMode: 'none' | 'previous-stage'
  onSchemaChange?: (event: string) => void
  selectedEvent?: string
}

/** Manages field selection and scope navigation in the set-fields panel. */
export function useSetFieldsSnapshotState({
  scopePath,
  visibleEntries,
  inheritedFields,
  setRootFields,
  sourceMode,
  onSchemaChange,
  selectedEvent,
}: UseSetFieldsSnapshotStateParams) {
  const [searchQuery, setSearchQuery] = useState('')
  const [hideInheritedInRoot, setHideInheritedInRoot] = useState(false)
  const hasSchemaSelector = Boolean(onSchemaChange && selectedEvent !== undefined)
  const inheritedRootFields = useMemo(
    () => new Set(inheritedFields.map((field) => field.split(/[.[\]]/)[0]).filter(Boolean)),
    [inheritedFields],
  )
  const overriddenRootFields = useMemo(() => new Set(setRootFields), [setRootFields])
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const isInheritedEntry = useCallback(
    (entryField: string): boolean => {
      if (scopePath || sourceMode !== 'previous-stage') {
        return false
      }

      const rootField = entryField.split(/[.[\]]/)[0]
      return Boolean(rootField) && inheritedRootFields.has(rootField) && !overriddenRootFields.has(rootField)
    },
    [inheritedRootFields, overriddenRootFields, scopePath, sourceMode],
  )

  const sortRootEntries = useCallback(
    (entries: SetEntry[]): SetEntry[] =>
      [...entries].sort((left, right) => {
        if (scopePath) {
          return 0
        }

        const leftInherited = isInheritedEntry(left.field)
        const rightInherited = isInheritedEntry(right.field)
        if (leftInherited === rightInherited) {
          return 0
        }

        return leftInherited ? -1 : 1
      }),
    [isInheritedEntry, scopePath],
  )

  const filteredEntries = useMemo(() => {
    const baseEntries =
      !scopePath && sourceMode === 'previous-stage' && hideInheritedInRoot
        ? visibleEntries.filter((entry) => {
            const rootField = entry.field.split(/[.[\]]/)[0]
            if (!rootField) {
              return true
            }

            const isInheritedNotOverridden =
              inheritedRootFields.has(rootField) && !overriddenRootFields.has(rootField)
            return !isInheritedNotOverridden
          })
        : visibleEntries

    if (!normalizedQuery) {
      return sortRootEntries(baseEntries)
    }

    return sortRootEntries(
      baseEntries.filter((entry) => {
        const normalizedLabel = relativeLabel(entry.field, scopePath).toLowerCase()
        return entry.field.toLowerCase().includes(normalizedQuery) || normalizedLabel.includes(normalizedQuery)
      }),
    )
  }, [
    hideInheritedInRoot,
    inheritedRootFields,
    normalizedQuery,
    overriddenRootFields,
    scopePath,
    sortRootEntries,
    sourceMode,
    visibleEntries,
  ])

  return {
    searchQuery,
    hideInheritedInRoot,
    hasSchemaSelector,
    filteredEntries,
    isInheritedEntry,
    setSearchQuery,
    setHideInheritedInRoot,
  }
}
