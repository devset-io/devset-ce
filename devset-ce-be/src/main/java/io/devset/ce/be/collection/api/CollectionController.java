/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.collection.api;

import io.devset.ce.be.collection.api.dto.CollectionRequestDto;
import io.devset.ce.be.collection.application.CollectionFacade;
import io.devset.ce.be.collection.domain.CollectionDefinition;
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
 * REST API for creating, retrieving, and deleting collections.
 * Delegates all operations to {@link CollectionFacade}.
 */
@RestController
@RequestMapping("/collection")
@RequiredArgsConstructor
public class CollectionController {

    private final CollectionFacade collectionFacade;
    private final CollectionDtoMapper collectionDtoMapper;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CollectionRequestDto create(@RequestBody CollectionRequestDto request) {
        CollectionDefinition created = collectionFacade.create(collectionDtoMapper.toDomain(request));
        return collectionDtoMapper.toResponse(created);
    }

    @GetMapping
    public List<CollectionRequestDto> getAll() {
        return collectionFacade.getAll()
                .stream()
                .map(collectionDtoMapper::toResponse)
                .toList();
    }

    @GetMapping("/{collectionName}")
    public CollectionRequestDto get(@PathVariable String collectionName) {
        return collectionDtoMapper.toResponse(collectionFacade.get(collectionName));
    }

    /**
     * Replaces only the {@code collectionContext} of an existing collection.
     * Other fields on the request body (including {@code collectionName}) are ignored.
     *
     * @param collectionName name from the path; identifies the collection to update
     * @param request        request body — only {@code collectionContext} is read
     * @return the updated collection definition
     */
    @PatchMapping("/{collectionName}")
    public CollectionRequestDto update(
            @PathVariable String collectionName,
            @RequestBody CollectionRequestDto request
    ) {
        CollectionDefinition replacement = new CollectionDefinition(collectionName, request.collectionContext());
        return collectionDtoMapper.toResponse(collectionFacade.update(replacement));
    }

    @DeleteMapping("/{collectionName}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@PathVariable String collectionName) {
        collectionFacade.remove(collectionName);
    }
}
