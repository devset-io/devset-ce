/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.api;

import io.devset.ce.be.common.domain.SchemaType;
import io.devset.ce.be.schema.api.dto.SchemaCreateByPathRequestDto;
import io.devset.ce.be.schema.domain.SchemaDefinition;
import io.devset.ce.be.workflow.api.dto.WorkflowSchemaResponseDto;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Maps between schema API DTOs and domain records.
 * <p>
 * Handles all layer-boundary conversions for the schema controller:
 * request DTO to domain for create/replace operations, and domain to response DTO
 * for all read operations.
 */
@Mapper(componentModel = "spring")
public interface SchemaDtoMapper {

    /**
     * Maps a create request (id from body, version null) to a domain definition.
     *
     * @param dto the create request DTO
     * @return the domain definition with version and protobufRootMessage set to null
     */
    @Mapping(target = "version", ignore = true)
    @Mapping(target = "protobufRootMessage", ignore = true)
    SchemaDefinition toDomain(WorkflowSchemaResponseDto dto);

    /**
     * Maps a by-path create request (id from path) to a domain definition.
     * Uses {@link SchemaType#fromNullable} to convert the String type field.
     *
     * @param schemaId schema identifier from the URL path
     * @param dto      the request body
     * @return the domain definition with version and protobufRootMessage set to null
     */
    default SchemaDefinition toDomainByPath(String schemaId, SchemaCreateByPathRequestDto dto) {
        return new SchemaDefinition(schemaId, null, SchemaType.fromNullable(dto.type()), dto.schema(), dto.descriptor());
    }

    /**
     * Maps a replace request (id from path, version from body) to a domain definition.
     *
     * @param schemaId schema identifier from the URL path
     * @param dto      the replacement body
     * @return the domain definition preserving version from the request body
     */
    default SchemaDefinition toReplace(String schemaId, WorkflowSchemaResponseDto dto) {
        return new SchemaDefinition(schemaId, dto.version(), dto.type(), dto.schema(), dto.descriptor());
    }

    /**
     * Maps a domain definition to a response DTO.
     *
     * @param domain the schema domain record
     * @return the response DTO
     */
    WorkflowSchemaResponseDto toResponse(SchemaDefinition domain);
}
