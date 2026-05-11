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

/**
 * Domain record describing a collection.
 * <p>
 * A collection is a named grouping that aggregates single requests. The name is
 * required and validated at construction time.
 *
 * @param collectionName unique, non-blank collection name
 */
public record CollectionDefinition(
        String collectionName
) {

    public CollectionDefinition {
        collectionName = DomainValidation.requireText(collectionName, "collectionName");
    }
}
