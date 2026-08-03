/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.api;

import io.devset.ce.be.dispatchworkspace.api.dto.DispatchWorkspaceDto;
import io.devset.ce.be.dispatchworkspace.domain.DispatchWorkspace;
import org.mapstruct.Mapper;

/**
 * MapStruct mapper converting between {@link DispatchWorkspaceDto} and {@link DispatchWorkspace}
 * (and their nested tab types).
 */
@Mapper(componentModel = "spring")
public interface DispatchWorkspaceDtoMapper {

    /**
     * Converts an API request DTO into the domain record.
     *
     * @param request incoming DTO
     * @return domain record
     */
    DispatchWorkspace toDomain(DispatchWorkspaceDto request);

    /**
     * Converts a domain record into the API response DTO.
     *
     * @param workspace domain record
     * @return response DTO
     */
    DispatchWorkspaceDto toResponse(DispatchWorkspace workspace);
}
