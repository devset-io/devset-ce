/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlerequest.api;

import io.devset.ce.be.singlerequest.api.dto.SingleRequestDto;
import io.devset.ce.be.singlerequest.application.SingleRequestFacade;
import io.devset.ce.be.singlerequest.domain.SingleRequestDefinition;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for single request CRUD operations.
 * <p>
 * Delegates ALL logic to {@link SingleRequestFacade}. DTO↔domain conversion is handled
 * by {@link SingleRequestDtoMapper}.
 */
@RestController
@RequestMapping("/single-requests")
@RequiredArgsConstructor
public class SingleRequestController {

    private final SingleRequestFacade singleRequestFacade;
    private final SingleRequestDtoMapper singleRequestDtoMapper;

    /**
     * Creates a new single request.
     *
     * @param request single request payload
     * @return the persisted single request
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SingleRequestDto save(@RequestBody SingleRequestDto request) {
        SingleRequestDefinition saved = singleRequestFacade.save(singleRequestDtoMapper.toDomain(request));
        return singleRequestDtoMapper.toResponse(saved);
    }

    /**
     * Lists all single requests.
     *
     * @return list of single requests, possibly empty
     */
    @GetMapping
    public List<SingleRequestDto> getAll() {
        return singleRequestFacade.getAll()
                .stream()
                .map(singleRequestDtoMapper::toResponse)
                .toList();
    }

    /**
     * Retrieves a single request by name.
     *
     * @param singleRequestName single request name
     * @return the single request
     */
    @GetMapping("/{singleRequestName}")
    public SingleRequestDto get(@PathVariable String singleRequestName) {
        return singleRequestDtoMapper.toResponse(singleRequestFacade.get(singleRequestName));
    }

    /**
     * Replaces an existing single request.
     *
     * @param singleRequestName target single request name
     * @param request           new single request content
     * @return the updated single request
     */
    @PatchMapping("/{singleRequestName}")
    public SingleRequestDto patch(@PathVariable String singleRequestName, @RequestBody SingleRequestDto request) {
        SingleRequestDefinition updated = singleRequestFacade.patch(singleRequestName, singleRequestDtoMapper.toDomain(request));
        return singleRequestDtoMapper.toResponse(updated);
    }

    /**
     * Removes a single request by name.
     *
     * @param singleRequestName single request name
     */
    @DeleteMapping("/{singleRequestName}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable String singleRequestName) {
        singleRequestFacade.remove(singleRequestName);
    }
}
