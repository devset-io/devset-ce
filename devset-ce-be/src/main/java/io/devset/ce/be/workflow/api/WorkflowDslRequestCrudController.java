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

import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.workflow.api.dto.WorkflowDto;
import io.devset.ce.be.workflow.application.WorkflowFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for workflow DSL CRUD operations.
 * <p>
 * Delegates ALL logic to {@link WorkflowFacade}. DTO↔domain conversion is handled by
 * {@link DSLDtoMapper}.
 */
@RestController
@RequestMapping("/workflows")
@RequiredArgsConstructor
public class WorkflowDslRequestCrudController {

    private final WorkflowFacade workflowFacade;
    private final DSLDtoMapper dslDtoMapper;

    /**
     * Creates a new workflow DSL request.
     *
     * @param request workflow payload
     * @return the persisted workflow
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public WorkflowDto create(@RequestBody WorkflowDto request) {
        Workflow domainRequest = dslDtoMapper.toDomainRequest(request);
        return dslDtoMapper.toRequestDto(workflowFacade.createRequest(domainRequest));
    }

    /**
     * Retrieves a workflow DSL request by its id.
     *
     * @param workflowId workflow id
     * @return the workflow
     */
    @GetMapping("/{workflowId}")
    public WorkflowDto getByWorkflowId(@PathVariable String workflowId) {
        return dslDtoMapper.toRequestDto(workflowFacade.getRequest(workflowId));
    }

    /**
     * Lists all workflow DSL requests.
     *
     * @return list of workflows, possibly empty
     */
    @GetMapping
    public List<WorkflowDto> findAll() {
        return workflowFacade.listRequests()
                .stream()
                .map(dslDtoMapper::toRequestDto)
                .toList();
    }

    /**
     * Replaces an existing workflow DSL request.
     *
     * @param workflowId target workflow id
     * @param request    new workflow content
     * @return the updated workflow
     */
    @PutMapping("/{workflowId}")
    public WorkflowDto update(@PathVariable String workflowId, @RequestBody WorkflowDto request) {
        Workflow domainRequest = dslDtoMapper.toDomainRequest(request);
        return dslDtoMapper.toRequestDto(workflowFacade.updateRequest(workflowId, domainRequest));
    }

    /**
     * Deletes a workflow DSL request by its id.
     *
     * @param workflowId workflow id
     */
    @DeleteMapping("/{workflowId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String workflowId) {
        workflowFacade.deleteRequest(workflowId);
    }
}
