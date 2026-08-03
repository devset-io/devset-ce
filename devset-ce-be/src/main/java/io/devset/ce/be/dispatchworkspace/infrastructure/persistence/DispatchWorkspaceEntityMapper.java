/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.infrastructure.persistence;

import io.devset.ce.be.dispatchworkspace.domain.DispatchWorkspace;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * Maps between the JPA entity and the domain record for the dispatch workspace.
 */
@Mapper(componentModel = "spring")
public interface DispatchWorkspaceEntityMapper {

    /**
     * Converts a persistence entity to a domain record.
     *
     * @param entity the workspace entity
     * @return the workspace domain record
     */
    DispatchWorkspace toDomain(DispatchWorkspaceEntity entity);

    /**
     * Converts a domain record to a persistence entity. The singleton {@code id} is not sourced from
     * the domain and is assigned by the service layer.
     *
     * @param domain the workspace domain record
     * @return the workspace entity, without its id set
     */
    @Mapping(target = "id", ignore = true)
    DispatchWorkspaceEntity toEntity(DispatchWorkspace domain);
}
