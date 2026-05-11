/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.api;

import io.devset.ce.be.singlestep.api.dto.SingleStepExecuteRequestDto;
import io.devset.ce.be.singlestep.api.dto.SingleStepExecuteResponseDto;
import io.devset.ce.be.singlestep.api.dto.SingleStepHistoryResponseDto;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionHistory;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionRequest;
import io.devset.ce.be.singlestep.domain.SingleStepExecutionResult;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * MapStruct mapper for single step API DTOs.
 * <p>
 * Translates between the API field names ({@code stage}, {@code event}) and the domain
 * field names ({@code stageName}, {@code eventName}).
 */
@Mapper(componentModel = "spring")
public interface SingleStepDtoMapper {

    /**
     * Converts an execute request DTO into the domain request.
     *
     * @param request incoming execute request DTO
     * @return domain execution request
     */
    @Mapping(target = "stageName", source = "stage")
    @Mapping(target = "eventName", source = "event")
    SingleStepExecutionRequest toDomainRequest(SingleStepExecuteRequestDto request);

    /**
     * Converts a domain execution result into the API response DTO.
     *
     * @param result domain execution result
     * @return execute response DTO
     */
    SingleStepExecuteResponseDto toExecuteResponse(SingleStepExecutionResult result);

    /**
     * Converts a persisted history entry into the API history response DTO.
     *
     * @param history persisted history entry
     * @return history response DTO
     */
    @Mapping(target = "stage", source = "stageName")
    @Mapping(target = "event", source = "eventName")
    SingleStepHistoryResponseDto toHistoryResponse(SingleStepExecutionHistory history);
}
