/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.collection.infrastructure.persistence;

import io.devset.ce.be.collection.domain.CollectionDefinition;
import org.mapstruct.Mapper;

/**
 * Maps between JPA entities and domain records for collections.
 */
@Mapper(componentModel = "spring")
public interface CollectionEntityMapper {

    /**
     * Converts a persistence entity to a domain record.
     *
     * @param entity the collection entity
     * @return the collection domain definition
     */
    CollectionDefinition toDomain(CollectionEntity entity);

    /**
     * Converts a domain record to a persistence entity.
     *
     * @param domain the collection domain definition
     * @return the collection entity
     */
    CollectionEntity toEntity(CollectionDefinition domain);
}
