/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.api;

import io.devset.ce.be.workflow.api.dto.WorkflowDto;
import io.devset.ce.be.common.domain.Workflow;
import org.mapstruct.Mapper;

/**
 * MapStruct mapper converting between {@link WorkflowDto} and {@link Workflow}.
 */
@Mapper(componentModel = "spring")
public interface DSLDtoMapper {

    /**
     * Converts an API workflow DTO into the domain record.
     *
     * @param request incoming workflow DTO
     * @return domain workflow
     */
    Workflow toDomainRequest(WorkflowDto request);

    /**
     * Converts a domain workflow into the API workflow DTO.
     *
     * @param request domain workflow
     * @return workflow DTO
     */
    WorkflowDto toRequestDto(Workflow request);
}
