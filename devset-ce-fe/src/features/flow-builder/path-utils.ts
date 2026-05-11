/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

const TOKEN_REGEX = /([^[\]]+)|\[(\d+)\]/g

const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const isSafeKey = (key: string): boolean => !UNSAFE_KEYS.has(key)

export const tokenizePath = (path: string): Array<string | number> =>
  path.split('.').flatMap((segment) => {
    const tokens: Array<string | number> = []
    let match: RegExpExecArray | null
    while ((match = TOKEN_REGEX.exec(segment)) !== null) {
      if (match[1]) {
        tokens.push(match[1])
      } else if (match[2]) {
        tokens.push(Number(match[2]))
      }
    }
    TOKEN_REGEX.lastIndex = 0
    return tokens
  })

export const readValueAtPath = (root: Record<string, unknown>, path: string): unknown => {
  const tokens = tokenizePath(path)
  let current: unknown = root

  for (const token of tokens) {
    if (Array.isArray(current) && typeof token === 'number') {
      current = current[token]
      continue
    }
    if (current && typeof current === 'object' && !Array.isArray(current) && typeof token === 'string') {
      current = (current as Record<string, unknown>)[token] // SAFETY: current confirmed as non-null object by typeof check in loop
      continue
    }
    return undefined
  }
  return current
}

export const setValueAtPath = (target: unknown, path: string, value: unknown) => {
  const keys = tokenizePath(path)
  if (keys.length === 0) {
    return
  }
  if (keys.some((k) => typeof k === 'string' && !isSafeKey(k))) {
    return
  }

  let current = target as Record<string, unknown> | unknown[] // SAFETY: target is the root object being mutated; type preserved through traversal
  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index]
    const nextKey = keys[index + 1]
    const nextIsArrayIndex = typeof nextKey === 'number'
    const existing =
      Array.isArray(current) && typeof key === 'number'
        ? current[key]
        : !Array.isArray(current) && typeof key === 'string'
          ? current[key]
          : undefined

    const nextValue = existing && typeof existing === 'object' ? existing : nextIsArrayIndex ? [] : {}

    if (Array.isArray(current) && typeof key === 'number') {
      current[key] = nextValue
    } else if (!Array.isArray(current) && typeof key === 'string') {
      current[key] = nextValue
    } else {
      return
    }

    current = nextValue as Record<string, unknown> | unknown[] // SAFETY: nextValue confirmed as object/array by preceding typeof/Array.isArray check
  }

  const lastKey = keys[keys.length - 1]
  if (Array.isArray(current) && typeof lastKey === 'number') {
    current[lastKey] = value
  } else if (!Array.isArray(current) && typeof lastKey === 'string') {
    current[lastKey] = value
  }
}
