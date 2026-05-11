/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Spring Data repository for {@link SchemaEntity}.
 * Only internal to {@code schema/infrastructure/persistence/} — never referenced from
 * other packages or modules (application depends on
 * {@link io.devset.ce.be.schema.application.SchemaFacade} instead).
 */
@Repository
public interface SchemaRepository extends JpaRepository<SchemaEntity, Long> {

    /**
     * Returns all schemas ordered by schema identifier then version (ascending).
     *
     * @return schemas in stable alphabetical and version order
     */
    List<SchemaEntity> findAllByOrderBySchemaIdAscSchemaVersionAsc();

    /**
     * Finds any schema row matching the given logical schema identifier.
     *
     * @param schemaId logical schema identifier
     * @return the matching entity, or empty if none exists
     */
    Optional<SchemaEntity> findBySchemaId(String schemaId);

    /**
     * Finds the latest version of the schema with the given logical identifier.
     *
     * @param schemaId logical schema identifier
     * @return the highest-versioned entity, or empty if none exists
     */
    Optional<SchemaEntity> findFirstBySchemaIdOrderBySchemaVersionDesc(String schemaId);
}
