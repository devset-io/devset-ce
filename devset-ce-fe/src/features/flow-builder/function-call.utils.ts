/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

const ZERO_ARG_FUNCTIONS = new Set(['now', 'nows', 'nowms', 'uuid', 'string', 'bit', 'bool', 'boolean'])

export const normalizeFunctionCallExpression = (expression: string): string => {
  const trimmed = expression.trim()
  if (!trimmed) {
    return ''
  }

  const isIdentifierChar = (char: string | undefined) => Boolean(char && /[a-zA-Z0-9_]/.test(char))
  const isWhitespace = (char: string | undefined) => Boolean(char && /\s/.test(char))
  const shouldSkipAsPropertyAccess = (prevChar: string | undefined) =>
    Boolean(prevChar && (isIdentifierChar(prevChar) || prevChar === '.'))

  let result = ''
  let index = 0
  let inSingleQuote = false
  let inDoubleQuote = false
  let isEscaped = false

  while (index < trimmed.length) {
    const char = trimmed[index]

    if (inSingleQuote || inDoubleQuote) {
      result += char
      if (isEscaped) {
        isEscaped = false
      } else if (char === '\\') {
        isEscaped = true
      } else if ((inSingleQuote && char === "'") || (inDoubleQuote && char === '"')) {
        inSingleQuote = false
        inDoubleQuote = false
      }
      index += 1
      continue
    }

    if (char === "'") {
      inSingleQuote = true
      result += char
      index += 1
      continue
    }
    if (char === '"') {
      inDoubleQuote = true
      result += char
      index += 1
      continue
    }

    if (!/[a-zA-Z]/.test(char)) {
      result += char
      index += 1
      continue
    }

    let end = index + 1
    while (end < trimmed.length && /[a-zA-Z0-9]/.test(trimmed[end])) {
      end += 1
    }

    const token = trimmed.slice(index, end)
    const prevChar = index > 0 ? trimmed[index - 1] : undefined
    let lookahead = end
    while (lookahead < trimmed.length && isWhitespace(trimmed[lookahead])) {
      lookahead += 1
    }
    const nextSignificantChar = lookahead < trimmed.length ? trimmed[lookahead] : undefined

    if (
      ZERO_ARG_FUNCTIONS.has(token) &&
      !shouldSkipAsPropertyAccess(prevChar) &&
      nextSignificantChar !== '('
    ) {
      result += `${token}()`
    } else {
      result += token
    }
    index = end
  }

  return result
}

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export const normalizeFnCallsInDslBlock = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeFnCallsInDslBlock(item)) as T // SAFETY: recursive normalization preserves array shape; T is the original type
  }
  if (!isRecordObject(value)) {
    return value
  }

  const next: Record<string, unknown> = {}
  Object.entries(value).forEach(([key, entryValue]) => {
    if (key === '$fn' && typeof entryValue === 'string') {
      next[key] = normalizeFunctionCallExpression(entryValue)
      return
    }
    next[key] = normalizeFnCallsInDslBlock(entryValue)
  })
  return next as T // SAFETY: object spread preserves shape; T is the original mapped type
}
