/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

export const API_BASE = '/api'

type ApiErrorPayload = {
  message?: unknown
}

type ApiFetchOptions = RequestInit & {
  errorLabel?: string
}

export const apiPath = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${normalized}`
}

export const readApiErrorMessage = async (
  response: Response,
  fallbackLabel = 'Request failed',
): Promise<string> => {
  try {
    const payload = (await response.json()) as ApiErrorPayload // SAFETY: response body is validated as error payload by the preceding non-ok status check
    if (typeof payload?.message === 'string' && payload.message.trim().length > 0) {
      return payload.message
    }
  } catch {
    // Intentional: response body may not be JSON — fall through to text() attempt below
  }

  try {
    const text = await response.text()
    if (text.trim().length > 0) {
      return text.trim()
    }
  } catch {
    // Intentional: response body stream may be consumed or unavailable — return generic fallback
  }

  return `${fallbackLabel} (${response.status})`
}

export const fetchApi = async (path: string, options: ApiFetchOptions = {}): Promise<Response> => {
  const { errorLabel, ...requestInit } = options
  const response = await fetch(apiPath(path), requestInit)

  if (!response.ok) {
    throw new Error(await readApiErrorMessage(response, errorLabel))
  }

  return response
}
