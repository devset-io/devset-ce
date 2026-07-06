/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

const toHex = (value: number) => value.toString(16).padStart(2, '0')

const randomBytesHex = (length: number): string => {
  const bytes = new Uint8Array(length)
  globalThis.crypto.getRandomValues(bytes)
  return Array.from(bytes, (byte) => toHex(byte)).join('')
}

/** Generates a unique client identifier string. */
export const createClientId = (): string => {
  const runtimeCrypto = globalThis.crypto
  if (typeof runtimeCrypto.randomUUID === 'function') {
    return runtimeCrypto.randomUUID()
  }
  return `id-${Date.now().toString(36)}-${randomBytesHex(8)}`
}
