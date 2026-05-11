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
import io.devset.ce.be.singlestep.application.SingleStepFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for ad-hoc single step execution.
 * <p>
 * Delegates ALL logic to {@link SingleStepFacade}. DTO↔domain conversion is handled by
 * {@link SingleStepDtoMapper}.
 */
@RestController
@RequestMapping("/single-step")
@RequiredArgsConstructor
public class SingleStepController {

    private final SingleStepFacade singleStepFacade;
    private final SingleStepDtoMapper singleStepDtoMapper;

    /**
     * Executes a single step synchronously and returns the outcome.
     *
     * @param request execution request with connector, payload and headers
     * @return execution result including run and history identifiers
     */
    @PostMapping("/execute")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public SingleStepExecuteResponseDto execute(@RequestBody SingleStepExecuteRequestDto request) {
        return singleStepDtoMapper.toExecuteResponse(
                singleStepFacade.execute(singleStepDtoMapper.toDomainRequest(request))
        );
    }

    /**
     * Returns the history of past single step executions.
     *
     * @return history entries ordered by recency, possibly empty
     */
    @GetMapping("/history")
    public List<SingleStepHistoryResponseDto> history() {
        return singleStepFacade.history()
                .stream()
                .map(singleStepDtoMapper::toHistoryResponse)
                .toList();
    }
}
