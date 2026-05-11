/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.api;

import io.devset.ce.be.schema.api.dto.SchemaCreateByPathRequestDto;
import io.devset.ce.be.schema.application.SchemaFacade;
import io.devset.ce.be.workflow.api.dto.WorkflowSchemaResponseDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for schema CRUD operations.
 * <p>
 * Delegates ALL logic to {@link SchemaFacade}. DTO↔domain conversion is performed
 * by {@link SchemaDtoMapper}.
 */
@RestController
@RequestMapping("/schemas")
@RequiredArgsConstructor
public class SchemaController {

    private final SchemaFacade schemaFacade;
    private final SchemaDtoMapper mapper;

    /**
     * Creates a new schema. The schema id is taken from the request body.
     *
     * @param request schema payload
     * @return the persisted schema
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkflowSchemaResponseDto create(@RequestBody WorkflowSchemaResponseDto request) {
        return mapper.toResponse(schemaFacade.create(mapper.toDomain(request)));
    }

    /**
     * Creates a new schema with the id taken from the URL path.
     *
     * @param schemaId schema id from the path
     * @param request  schema body without id
     * @return the persisted schema
     */
    @PostMapping("/{schemaId}")
    @ResponseStatus(HttpStatus.CREATED)
    public WorkflowSchemaResponseDto createByPath(
            @PathVariable String schemaId,
            @RequestBody SchemaCreateByPathRequestDto request
    ) {
        return mapper.toResponse(schemaFacade.create(mapper.toDomainByPath(schemaId, request)));
    }

    /**
     * Replaces an existing schema.
     *
     * @param schemaId schema id from the path
     * @param request  replacement schema body
     * @return the updated schema
     */
    @PutMapping("/{schemaId}")
    public WorkflowSchemaResponseDto replace(
            @PathVariable String schemaId,
            @RequestBody WorkflowSchemaResponseDto request
    ) {
        return mapper.toResponse(schemaFacade.replace(mapper.toReplace(schemaId, request)));
    }

    /**
     * Lists all registered schemas.
     *
     * @return list of schemas, possibly empty
     */
    @GetMapping
    public List<WorkflowSchemaResponseDto> findAll() {
        return schemaFacade.findAll().stream().map(mapper::toResponse).toList();
    }

    /**
     * Deletes all versions of a schema by its id.
     *
     * @param schemaId schema id from the path
     */
    @DeleteMapping("/{schemaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String schemaId) {
        schemaFacade.delete(schemaId);
    }
}
