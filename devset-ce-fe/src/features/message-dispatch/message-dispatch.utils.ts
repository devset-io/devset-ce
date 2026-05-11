/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type { FieldOverridePayload, StageWireFormat } from '../flow-builder/types'
import { normalizeFunctionCallExpression } from '../flow-builder/function-call.utils'
import { safeJsonParse } from '../../shared/utils/safeJsonParse'

export const toCollectionMenuKey = (collectionName: string): string => `collection:${collectionName}`

export const toRequestMenuKey = (collectionName: string, requestName: string): string =>
  `request:${collectionName}:${requestName}`

export const formatHistoryDate = (value: number): string => {
  if (!Number.isFinite(value) || value <= 0) {
    return 'n/a'
  }
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(value)
}

export const toPrettyJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    // Intentional: JSON.stringify fallback — circular refs or non-serializable values return empty object
    return '{}'
  }
}

export const toShortId = (value: string, head = 8, tail = 6): string => {
  const normalized = value.trim()
  if (normalized.length <= head + tail + 1) {
    return normalized
  }
  return `${normalized.slice(0, head)}...${normalized.slice(-tail)}`
}

export const toContentTypeLabel = (contentType: string): string =>
  contentType === 'application/x-protobuf' ? 'PROTOBUF' : 'JSON'

export const parseWireFormatPrefixValue = (raw: string): number | null => {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) {
    return null
  }
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 65535) {
    return null
  }
  return Math.floor(parsed)
}

export const toWireFormatLabel = (wireFormat?: StageWireFormat): string => {
  if (!wireFormat || wireFormat.type !== 'binary-prefix') {
    return 'null'
  }
  if (wireFormat.prefix.source === 'messagePrefix' && typeof wireFormat.prefix.value === 'number') {
    return `binary-prefix(messagePrefix=${wireFormat.prefix.value})`
  }
  return `binary-prefix(${wireFormat.prefix.source})`
}

const parseRawDslValue = (raw: string | undefined): unknown => {
  if (raw === undefined) {
    return null
  }
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }
  return safeJsonParse(trimmed, trimmed)
}

export const toOverrideValue = (override: FieldOverridePayload): unknown => {
  if (override.mode === 'fn') {
    return { $fn: normalizeFunctionCallExpression(override.value) }
  }
  if (override.mode === 'ref') {
    return { $ref: override.value.trim() }
  }
  if (override.mode === 'path') {
    return { $path: override.value.trim() }
  }
  if (override.mode === 'when') {
    const conditionalBlock: Record<string, unknown> = {
      when: { $fn: (override.whenCondition ?? 'eq(1,1)').trim() },
      value: parseRawDslValue(override.whenValueRaw ?? override.value),
    }
    if (override.whenHasDefault) {
      conditionalBlock.default = parseRawDslValue(override.whenDefaultRaw)
    }
    return conditionalBlock
  }

  if (override.literalKind === 'null') {
    return null
  }
  if (override.literalKind === 'boolean') {
    return override.value.trim() === 'true'
  }
  if (override.literalKind === 'number') {
    return Number(override.value)
  }
  if (override.literalKind === 'json') {
    return safeJsonParse(override.value, override.value)
  }
  if (override.literalKind === 'string') {
    return override.value
  }

  const raw = override.value.trim()
  if (raw === 'true') {
    return true
  }
  if (raw === 'false') {
    return false
  }
  if (raw === 'null') {
    return null
  }
  if (/^-?\d+(\.\d+)?$/.test(raw)) {
    return Number(raw)
  }
  if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
    return safeJsonParse(raw, raw)
  }
  return raw
}
