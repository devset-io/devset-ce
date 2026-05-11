/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlerequest.infrastructure.persistence;

import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.singlerequest.domain.SingleRequestDefinition;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Maps between JPA entities and domain records for single requests.
 */
@Mapper(componentModel = "spring")
public interface SingleRequestEntityMapper {

    /**
     * Converts a persistence entity to a domain record.
     *
     * @param entity the single request entity
     * @return the single request domain definition
     */
    @Mapping(target = "messageType", expression = "java(toMessageType(entity.getMessageType()))")
    @Mapping(target = "contentType", expression = "java(toContentType(entity.getContentType()))")
    SingleRequestDefinition toDomain(SingleRequestEntity entity);

    /**
     * Converts a domain record to a persistence entity.
     *
     * @param domain the single request domain definition
     * @return the single request entity
     */
    @Mapping(target = "messageType", expression = "java(fromMessageType(domain.messageType()))")
    @Mapping(target = "contentType", expression = "java(fromContentType(domain.contentType()))")
    SingleRequestEntity toEntity(SingleRequestDefinition domain);

    /**
     * Converts a string value to a {@link WorkflowMessageType} enum.
     *
     * @param value the external name
     * @return the enum value, or null if input is null
     */
    default WorkflowMessageType toMessageType(String value) {
        return WorkflowMessageType.fromNullable(value);
    }

    /**
     * Converts a string value to a {@link WorkflowContentType} enum.
     *
     * @param value the external name
     * @return the enum value, or null if input is null
     */
    default WorkflowContentType toContentType(String value) {
        return WorkflowContentType.fromNullable(value);
    }

    /**
     * Converts a {@link WorkflowMessageType} enum to its external string name.
     *
     * @param value the enum value
     * @return the external name, or null if input is null
     */
    default String fromMessageType(WorkflowMessageType value) {
        return value == null ? null : value.externalName();
    }

    /**
     * Converts a {@link WorkflowContentType} enum to its external string name.
     *
     * @param value the enum value
     * @return the external name, or null if input is null
     */
    default String fromContentType(WorkflowContentType value) {
        return value == null ? null : value.externalName();
    }
}
