/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.infrastructure.persistence;

import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionHistory;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.util.Map;

/**
 * MapStruct mapper between {@link SingleStepRequestHistoryEntity} and
 * {@link SingleStepExecutionHistory}.
 * <p>
 * Handles enum externalization for message/content types and normalizes null
 * wire-format maps into empty maps on both directions.
 */
@Mapper(componentModel = "spring")
public interface SingleStepHistoryPersistenceMapper {

    /**
     * Converts a domain history record into a persistence entity.
     *
     * @param history domain history record
     * @return persistence entity
     */
    @Mapping(target = "messageType", expression = "java(asMessageType(history.messageType()))")
    @Mapping(target = "contentType", expression = "java(asContentType(history.contentType()))")
    @Mapping(target = "wireFormat", expression = "java(mapOrEmpty(history.wireFormat()))")
    SingleStepRequestHistoryEntity toEntity(SingleStepExecutionHistory history);

    /**
     * Converts a persistence entity into a domain history record.
     *
     * @param entity persistence entity
     * @return domain history record
     */
    @Mapping(target = "messageType", expression = "java(toMessageType(entity.getMessageType()))")
    @Mapping(target = "contentType", expression = "java(toContentType(entity.getContentType()))")
    @Mapping(target = "wireFormat", expression = "java(mapOrEmpty(entity.getWireFormat()))")
    SingleStepExecutionHistory toDomain(SingleStepRequestHistoryEntity entity);

    /**
     * Converts a {@link WorkflowMessageType} enum to its external string name.
     *
     * @param value enum value
     * @return external name, or {@code null} if input is {@code null}
     */
    default String asMessageType(WorkflowMessageType value) {
        return value == null ? null : value.externalName();
    }

    /**
     * Converts a {@link WorkflowContentType} enum to its external string name.
     *
     * @param value enum value
     * @return external name, or {@code null} if input is {@code null}
     */
    default String asContentType(WorkflowContentType value) {
        return value == null ? null : value.externalName();
    }

    /**
     * Resolves a persisted string to a {@link WorkflowMessageType}, defaulting when unknown.
     *
     * @param value external name
     * @return the enum value with defaulting applied
     */
    default WorkflowMessageType toMessageType(String value) {
        return WorkflowMessageType.defaulted(WorkflowMessageType.fromNullable(value));
    }

    /**
     * Resolves a persisted string to a {@link WorkflowContentType}, defaulting when unknown.
     *
     * @param value external name
     * @return the enum value with defaulting applied
     */
    default WorkflowContentType toContentType(String value) {
        return WorkflowContentType.defaulted(WorkflowContentType.fromNullable(value));
    }

    /**
     * Returns the given map, or an empty map if the input is {@code null}.
     *
     * @param value source map
     * @return non-null map
     */
    default Map<String, Object> mapOrEmpty(Map<String, Object> value) {
        return value == null ? Map.of() : value;
    }
}
