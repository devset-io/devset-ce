/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.collection.api.dto;

import java.util.Map;

/**
 * API DTO for collection create requests and read responses.
 *
 * @param collectionName    unique collection name
 * @param collectionContext user-defined values shared across the collection
 *                          (e.g. {@code userId}); may be {@code null} or omitted on input
 */
public record CollectionRequestDto(
        String collectionName,
        Map<String, Object> collectionContext
) {
}
