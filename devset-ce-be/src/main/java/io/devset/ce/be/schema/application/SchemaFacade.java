/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.application;

import io.devset.ce.be.common.domain.ProtobufSchemaDescriptor;
import io.devset.ce.be.schema.domain.SchemaDefinition;

import java.util.List;

/**
 * Facade for schema operations.
 * <p>
 * Provides CRUD, loading and protobuf descriptor resolution for schemas.
 * This is the only entry point for schema operations from other modules.
 */
public interface SchemaFacade {

    /**
     * Creates a new schema or updates an existing one with the same ID.
     *
     * @param definition the schema definition to create
     * @return the persisted schema definition
     */
    SchemaDefinition create(SchemaDefinition definition);

    /**
     * Replaces an existing schema definition.
     *
     * @param definition the replacement schema definition
     * @return the updated schema definition
     */
    SchemaDefinition replace(SchemaDefinition definition);

    /**
     * Retrieves all schema definitions ordered by ID and version.
     *
     * @return list of all schema definitions
     */
    List<SchemaDefinition> findAll();

    /**
     * Deletes all versions of a schema by its ID.
     *
     * @param schemaId the schema identifier
     */
    void delete(String schemaId);

    /**
     * Loads the latest version of a schema by its ID.
     *
     * @param schemaId the schema identifier
     * @return the latest schema definition
     */
    SchemaDefinition loadLatest(String schemaId);

    /**
     * Loads the protobuf descriptor metadata for a registered schema.
     * Validates that the schema is of type PROTOBUF and has a valid descriptor.
     *
     * @param schemaId the schema identifier
     * @return the protobuf descriptor and root message name
     */
    ProtobufSchemaDescriptor loadProtobufDescriptor(String schemaId);

    /**
     * Resolves protobuf metadata from raw schema text.
     * Generates a Base64-encoded FileDescriptorSet and determines the root message.
     *
     * @param schemaText the protobuf schema definition text
     * @return the resolved protobuf descriptor and root message name
     */
    ProtobufSchemaDescriptor resolveProtobufMetadata(String schemaText);
}
