/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.collection.domain;

import io.devset.ce.be.common.domain.DomainValidation;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Domain record describing a collection.
 * <p>
 * A collection is a named grouping that aggregates single requests. It also carries
 * a free-form {@code collectionContext} map of user-defined values (e.g. {@code userId})
 * that can be referenced from message dispatch payloads, headers, and other configuration
 * within the same collection.
 *
 * @param collectionName    unique, non-blank collection name
 * @param collectionContext user-defined values shared across the collection; never {@code null}
 *                          (a {@code null} input is normalized to an empty map). Null entry
 *                          values are permitted so JSON {@code null}s round-trip cleanly.
 */
public record CollectionDefinition(
        String collectionName,
        Map<String, Object> collectionContext
) {

    public CollectionDefinition {
        collectionName = DomainValidation.requireText(collectionName, "collectionName");
        collectionContext = collectionContext == null
                ? Map.of()
                : Collections.unmodifiableMap(new LinkedHashMap<>(collectionContext));
    }
}
