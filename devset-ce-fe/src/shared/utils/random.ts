/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

const LOWERCASE_ALPHANUMERIC = 'abcdefghijklmnopqrstuvwxyz0123456789'

const randomBytes = (length: number): Uint8Array => {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return bytes
}

/** Generates a random lowercase alphanumeric string of the given length. */
export const randomLowercaseId = (length: number): string =>
  Array.from(randomBytes(length), (byte) => LOWERCASE_ALPHANUMERIC[byte % LOWERCASE_ALPHANUMERIC.length]).join('')

/**
 * Generates a UUID v4. Falls back to crypto.getRandomValues when
 * crypto.randomUUID is unavailable — it requires a secure context (HTTPS),
 * which this app does not run on.
 */
export const generateUuid = (): string => {
  const runtimeCrypto = globalThis.crypto
  if (typeof runtimeCrypto.randomUUID === 'function') {
    return runtimeCrypto.randomUUID()
  }
  const bytes = randomBytes(16)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
