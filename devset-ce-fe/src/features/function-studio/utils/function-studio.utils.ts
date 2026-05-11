/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import { buildDefaultStateFnExpressionByName } from '../../flow-builder/config/function-catalog.ts'

export const toTokens = (path: string) => path.match(/[^.[\]]+|\[\d+\]/g) ?? []

export const toPath = (tokens: string[]) =>
  tokens.reduce((acc, token) => {
    if (token.startsWith('[')) {
      return `${acc}${token}`
    }
    if (!acc) {
      return token
    }
    return `${acc}.${token}`
  }, '')

export const parentPath = (path: string) => {
  const tokens = toTokens(path)
  return toPath(tokens.slice(0, -1))
}

export const leafLabel = (path: string) => {
  const tokens = toTokens(path)
  return tokens[tokens.length - 1] ?? path
}

export const relativeLabel = (path: string, scopePath: string) => {
  if (!scopePath) {
    return path
  }
  if (path.startsWith(`${scopePath}.`)) {
    return path.slice(scopePath.length + 1)
  }
  if (path.startsWith(`${scopePath}[`)) {
    return path.slice(scopePath.length)
  }
  return path
}

export const buildDefaultStateFnExpression = (
  fnName: string,
  sourceField: string,
  targetStatePath: string,
): string => buildDefaultStateFnExpressionByName(fnName, sourceField, targetStatePath)
