/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { useMemo } from 'react'
import type { FieldOverridePayload, LoadedSchema, SetEntry } from '../../features/flow-builder/types.ts'
import { extractSchemaFieldTree, extractSchemaScopeFields, type SchemaFieldNode } from '../../features/flow-builder/utils/schema-extraction.utils.ts'
import { safeJsonParse } from '../utils/safeJsonParse.ts'
import {
  buildDraftSelectedStageState,
  extractRootField,
  safeParseJson,
  type PendingOperation,
} from '../../features/function-studio/utils/function-studio-draft.ts'
import { parentPath, toPath, toTokens } from '../../features/function-studio/utils/function-studio.utils.ts'

type UseFunctionStudioComputedInput = {
  setEntries: SetEntry[]
  scopePath: string
  pendingOps: PendingOperation[]
  selectedSchema: LoadedSchema | undefined
  studioSelectedField: string | null
  schemaRootFields: string[]
  schemaLiteralKindHints: Record<string, 'string' | 'number' | 'boolean' | 'null' | 'json'>
  schemaRequiredRootFields: string[]
  setFieldOptions: string[]
  selectedFieldMode: 'fn' | 'literal' | 'ref' | 'path' | 'when' | undefined
  selectedFieldExpression: string | null
  selectedFieldValue: string | null
  selectedFieldRawValue: unknown
  selectedStageState: Record<string, unknown>
}

/** Derives computed view data for function studio from raw state. */
export const useFunctionStudioComputed = ({
  setEntries,
  scopePath,
  pendingOps,
  selectedSchema,
  studioSelectedField,
  schemaRootFields,
  schemaLiteralKindHints,
  schemaRequiredRootFields,
  setFieldOptions,
  selectedFieldMode,
  selectedFieldExpression,
  selectedFieldValue,
  selectedFieldRawValue,
  selectedStageState,
}: UseFunctionStudioComputedInput) => {
  const toPendingPreview = (payload: FieldOverridePayload): string => {
    if (payload.mode === 'fn' || payload.mode === 'ref' || payload.mode === 'path') {
      return payload.value
    }
    if (payload.mode === 'when') {
      return payload.whenCondition ? `when(${payload.whenCondition})` : 'when(...)'
    }
    if (payload.literalKind === 'null') {
      return 'null'
    }
    return payload.value
  }

  const toPendingRawValue = (payload: FieldOverridePayload): unknown => {
    if (payload.mode === 'when') {
      return {
        when: { $fn: payload.whenCondition ?? 'eq(1,1)' },
        value: payload.whenValueRaw ? safeParseJson(payload.whenValueRaw) : '',
        ...(payload.whenHasDefault
          ? {
              default: payload.whenDefaultRaw ? safeParseJson(payload.whenDefaultRaw) : null,
            }
          : {}),
      }
    }
    if (payload.mode === 'literal' && payload.literalKind === 'json') {
      return safeJsonParse(payload.value, payload.value)
    }
    if (payload.mode === 'literal' && payload.literalKind === 'number') {
      return Number(payload.value)
    }
    if (payload.mode === 'literal' && payload.literalKind === 'boolean') {
      return payload.value.trim() === 'true'
    }
    if (payload.mode === 'literal' && payload.literalKind === 'null') {
      return null
    }
    return payload.value
  }

  const visibleEntries = useMemo(
    () => setEntries.filter((entry) => parentPath(entry.field) === scopePath && entry.field !== scopePath),
    [setEntries, scopePath],
  )
  const rootFieldsFromSet = useMemo(
    () =>
      Array.from(
        new Set(
          setEntries
            .map((entry) => extractRootField(entry.field))
            .filter((field): field is string => Boolean(field)),
        ),
      ),
    [setEntries],
  )
  const schemaFieldTree = useMemo(() => extractSchemaFieldTree(selectedSchema), [selectedSchema])
  const sourceFieldTree: SchemaFieldNode[] = useMemo(
    () =>
      schemaFieldTree.length > 0
        ? schemaFieldTree
        : rootFieldsFromSet.map((f) => ({ field: f, label: f, children: [] })),
    [rootFieldsFromSet, schemaFieldTree],
  )
  const sourceFieldOptions = useMemo(
    () => (schemaRootFields.length > 0 ? schemaRootFields : rootFieldsFromSet),
    [rootFieldsFromSet, schemaRootFields],
  )
  const sourceFieldPaths = useMemo(() => {
    const paths = new Set<string>()
    const walk = (nodes: SchemaFieldNode[]) => {
      for (const node of nodes) {
        paths.add(node.field)
        walk(node.children)
      }
    }
    walk(sourceFieldTree)
    return paths
  }, [sourceFieldTree])
  const draftSetRootFields = useMemo(() => {
    const result = new Set(rootFieldsFromSet)
    pendingOps.forEach((operation) => {
      if (operation.type !== 'function') {
        return
      }
      const root = extractRootField(operation.field)
      if (root) {
        result.add(root)
      }
    })
    return Array.from(result)
  }, [pendingOps, rootFieldsFromSet])
  const pendingFunctionByField = useMemo(() => {
    const latest = new Map<string, FieldOverridePayload>()
    pendingOps.forEach((operation) => {
      if (operation.type !== 'function') {
        return
      }
      latest.set(operation.field, operation.payload)
    })
    return latest
  }, [pendingOps])
  const pendingFunctionRootEntries = useMemo<SetEntry[]>(() => {
    const latestByRoot = new Map<string, { field: string; payload: FieldOverridePayload }>()
    pendingOps.forEach((operation) => {
      if (operation.type !== 'function') {
        return
      }
      const root = extractRootField(operation.field)
      if (!root) {
        return
      }
      latestByRoot.set(root, { field: operation.field, payload: operation.payload })
    })

    return Array.from(latestByRoot.entries()).map(([root, operation]) => {
      const payload = operation.payload
      const preview = toPendingPreview(payload)
      const isRequired = schemaRequiredRootFields.includes(root)
      const isMissingRequired = isRequired && (!preview || !preview.trim())
      return {
        field: root,
        kind: payload.mode,
        preview,
        rawValue: toPendingRawValue(payload),
        isRequired,
        isMissingRequired,
      } as SetEntry // SAFETY: object literal satisfies SetEntry shape by construction (all required fields are set above)
    })
  }, [pendingOps, schemaRequiredRootFields])
  const scopeTrail = useMemo(() => {
    const scopeTokens = toTokens(scopePath)
    return scopeTokens.map((_, index) => toPath(scopeTokens.slice(0, index + 1)))
  }, [scopePath])
  const schemaSnapshotEntries = useMemo<SetEntry[]>(
    () =>
      extractSchemaScopeFields(selectedSchema, scopePath).map((field) => ({
        field: field.field,
        kind: 'literal',
        preview: 'schema field',
        rawValue: null,
        isContainer: field.isContainer,
        isRequired: field.isRequired,
        isMissingRequired: field.isRequired,
      })),
    [scopePath, selectedSchema],
  )
  const functionFields = useMemo(
    () =>
      visibleEntries.length > 0
        ? visibleEntries.map((entry) => entry.field)
        : studioSelectedField
          ? [studioSelectedField]
          : schemaSnapshotEntries.length > 0
            ? schemaSnapshotEntries.map((entry) => entry.field)
          : schemaRootFields.length > 0
            ? schemaRootFields
            : rootFieldsFromSet.length > 0
              ? rootFieldsFromSet
              : setFieldOptions,
    [rootFieldsFromSet, schemaRootFields, schemaSnapshotEntries, setFieldOptions, studioSelectedField, visibleEntries],
  )
  const selectedSchemaFieldHint = useMemo(() => {
    if (!studioSelectedField) {
      return null
    }
    const scope = parentPath(studioSelectedField)
    const scopeFields = extractSchemaScopeFields(selectedSchema, scope)
    const match = scopeFields.find((field) => field.field === studioSelectedField)
    return match?.literalKindHint ?? null
  }, [selectedSchema, studioSelectedField])
  const selectedFieldLiteralKindHint = useMemo(() => {
    if (selectedSchemaFieldHint) {
      return selectedSchemaFieldHint
    }
    const root = (studioSelectedField ?? '').split(/[.[\]]/)[0]
    if (!root) {
      return 'string' as const
    }
    return schemaLiteralKindHints[root] ?? 'string'
  }, [schemaLiteralKindHints, selectedSchemaFieldHint, studioSelectedField])
  const missingSchemaSnapshotEntries = useMemo<SetEntry[]>(() => {
    const existingRootFields = new Set([
      ...setEntries.map((entry) => entry.field.split(/[.[\]]/)[0]).filter(Boolean),
      ...pendingFunctionRootEntries.map((entry) => entry.field),
    ])
    return schemaSnapshotEntries.filter((entry) => !existingRootFields.has(entry.field))
  }, [pendingFunctionRootEntries, schemaSnapshotEntries, setEntries])
  const snapshotEntries = useMemo(() => {
    if (scopePath) {
      const merged = new Map<string, SetEntry>()
      schemaSnapshotEntries.forEach((entry) => merged.set(entry.field, entry))
      visibleEntries.forEach((entry) => merged.set(entry.field, entry))
      pendingFunctionByField.forEach((payload, field) => {
        if (parentPath(field) !== scopePath || field === scopePath) {
          return
        }
        const current = merged.get(field)
        merged.set(field, {
          field,
          kind: payload.mode,
          preview: toPendingPreview(payload),
          rawValue: toPendingRawValue(payload),
          isContainer: current?.isContainer ?? false,
          isRequired: current?.isRequired ?? false,
          isMissingRequired:
            current?.isRequired === true && (!payload.value || payload.value.trim().length === 0),
        })
      })
      return Array.from(merged.values())
    }
    const pendingRoots = new Set(pendingFunctionRootEntries.map((entry) => entry.field))
    const baseWithoutPending = visibleEntries.filter((entry) => {
      const root = extractRootField(entry.field)
      return !root || !pendingRoots.has(root)
    })
    return [...pendingFunctionRootEntries, ...baseWithoutPending, ...missingSchemaSnapshotEntries]
  }, [missingSchemaSnapshotEntries, pendingFunctionByField, pendingFunctionRootEntries, scopePath, visibleEntries, schemaSnapshotEntries])
  const hasPendingChanges = pendingOps.length > 0
  const pendingSelectedFieldOverride = studioSelectedField ? pendingFunctionByField.get(studioSelectedField) : undefined
  const draftSelectedFieldMode = pendingSelectedFieldOverride?.mode ?? selectedFieldMode
  const draftSelectedFieldExpression =
    pendingSelectedFieldOverride?.mode === 'fn' ? pendingSelectedFieldOverride.value : selectedFieldExpression
  const draftSelectedFieldValue =
    pendingSelectedFieldOverride?.mode === 'literal' ||
    pendingSelectedFieldOverride?.mode === 'ref' ||
    pendingSelectedFieldOverride?.mode === 'path'
      ? pendingSelectedFieldOverride.value
      : selectedFieldValue
  const draftSelectedFieldRawValue =
    pendingSelectedFieldOverride?.mode === 'when'
      ? {
          when: { $fn: pendingSelectedFieldOverride.whenCondition ?? 'eq(1,1)' },
          value: pendingSelectedFieldOverride.whenValueRaw
            ? safeParseJson(pendingSelectedFieldOverride.whenValueRaw)
            : '',
          ...(pendingSelectedFieldOverride.whenHasDefault
            ? {
                default: pendingSelectedFieldOverride.whenDefaultRaw
                  ? safeParseJson(pendingSelectedFieldOverride.whenDefaultRaw)
                  : null,
              }
            : {}),
        }
      : pendingSelectedFieldOverride?.mode === 'literal'
        ? pendingSelectedFieldOverride.value
        : selectedFieldRawValue
  const draftSelectedStageState = useMemo(
    () => buildDraftSelectedStageState(selectedStageState, pendingOps),
    [pendingOps, selectedStageState],
  )

  return {
    hasPendingChanges,
    draftSelectedFieldExpression,
    draftSelectedFieldMode,
    draftSelectedFieldRawValue,
    draftSelectedFieldValue,
    draftSelectedStageState,
    draftSetRootFields,
    functionFields,
    scopeTrail,
    selectedFieldLiteralKindHint,
    snapshotEntries,
    sourceFieldOptions,
    sourceFieldPaths,
    sourceFieldTree,
  }
}
