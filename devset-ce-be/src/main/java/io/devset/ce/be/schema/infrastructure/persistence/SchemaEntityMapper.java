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

import io.devset.ce.be.common.domain.SchemaType;
import io.devset.ce.be.schema.domain.SchemaDefinition;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Maps between JPA entities and domain records for schemas.
 */
@Mapper(componentModel = "spring")
public interface SchemaEntityMapper {

    /**
     * Converts a persistence entity to a domain record.
     *
     * @param entity the schema entity
     * @return the schema domain definition
     */
    @Mapping(source = "schemaId", target = "id")
    @Mapping(source = "schemaVersion", target = "version")
    @Mapping(target = "type", expression = "java(toSchemaType(entity.getSchemaType()))")
    @Mapping(source = "schemaJson", target = "schema")
    @Mapping(source = "schemaDescriptor", target = "descriptor")
    SchemaDefinition toDomain(SchemaEntity entity);

    /**
     * Converts a domain record to a persistence entity.
     *
     * @param domain the schema domain definition
     * @return the schema entity
     */
    @Mapping(source = "id", target = "schemaId")
    @Mapping(source = "version", target = "schemaVersion")
    @Mapping(target = "schemaType", expression = "java(fromSchemaType(domain.type()))")
    @Mapping(source = "schema", target = "schemaJson")
    @Mapping(source = "descriptor", target = "schemaDescriptor")
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "entityVersion", ignore = true)
    SchemaEntity toEntity(SchemaDefinition domain);

    /**
     * Converts a string value to a {@link SchemaType} enum with defaulting.
     *
     * @param value the external name
     * @return the enum value, defaulting to JSON if null
     */
    default SchemaType toSchemaType(String value) {
        return SchemaType.defaulted(SchemaType.fromNullable(value));
    }

    /**
     * Converts a {@link SchemaType} enum to its external string name.
     *
     * @param value the enum value
     * @return the external name, or null if input is null
     */
    default String fromSchemaType(SchemaType value) {
        return value == null ? null : value.externalName();
    }
}
