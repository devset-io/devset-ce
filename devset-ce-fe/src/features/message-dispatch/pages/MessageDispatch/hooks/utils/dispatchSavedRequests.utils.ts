/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

import type {
  CollectionSummary,
  SingleRequestPayload,
} from '../../../../services/message-dispatch.service'

export const sortCollections = (items: CollectionSummary[]): CollectionSummary[] =>
  [...items].sort((left, right) => left.collectionName.localeCompare(right.collectionName))

export const sortSingleRequests = (items: SingleRequestPayload[]): SingleRequestPayload[] =>
  [...items].sort((left, right) => left.singleRequestName.localeCompare(right.singleRequestName))
