/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

export const DEFAULT_WORKFLOW_ID_PREFIX = 'new-workflow'
export const DEFAULT_PRODUCER_NAME = 'local'
export const DEFAULT_TOPIC = ''
export const DEFAULT_EXECUTIONS = 1

export const generateDefaultWorkflowId = () => {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const randomPart = Array.from({ length: 7 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  return `${DEFAULT_WORKFLOW_ID_PREFIX}-${randomPart}`
}
