/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.pipeline;

import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.workflow.api.dto.WorkflowDto;
import org.mapstruct.Mapper;

/**
 * MapStruct mapper that converts a {@link WorkflowDto} API request into a
 * {@link Workflow} domain object suitable for pipeline compilation.
 */
@Mapper(componentModel = "spring")
public interface WorkflowDtoMapper {

    /**
     * Maps the API-level workflow DTO to the domain model.
     *
     * @param dto incoming workflow request
     * @return domain workflow with validated and normalized fields
     */
    Workflow toDomain(WorkflowDto dto);
}
