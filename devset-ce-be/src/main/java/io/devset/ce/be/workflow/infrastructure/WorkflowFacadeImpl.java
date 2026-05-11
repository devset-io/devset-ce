/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.infrastructure;

import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.workflow.application.WorkflowCatalog;
import io.devset.ce.be.workflow.application.WorkflowService;
import io.devset.ce.be.workflow.application.WorkflowFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Infrastructure implementation of {@link WorkflowFacade}.
 * <p>
 * Exposes the workflow catalog (read-only view over registered workflow definitions)
 * alongside CRUD operations on stored workflow DSL requests. Delegates catalog lookups
 * to {@link WorkflowCatalog} and persistence operations to {@link WorkflowService}.
 */
@Component
@RequiredArgsConstructor
public class WorkflowFacadeImpl implements WorkflowFacade {

    private final WorkflowCatalog workflowCatalog;
    private final WorkflowService workflowDslRequestCrudService;

    @Override
    public List<String> listCatalog() {
        return workflowCatalog.listNames();
    }

    @Override
    public Workflow getCatalogEntry(String name) {
        return workflowCatalog.loadByName(name);
    }

    @Override
    public Workflow createRequest(Workflow request) {
        return workflowDslRequestCrudService.create(request);
    }

    @Override
    public Workflow getRequest(String workflowId) {
        return workflowDslRequestCrudService.getByWorkflowId(workflowId);
    }

    @Override
    public List<Workflow> listRequests() {
        return workflowDslRequestCrudService.findAll();
    }

    @Override
    public Workflow updateRequest(String workflowId, Workflow request) {
        return workflowDslRequestCrudService.update(workflowId, request);
    }

    @Override
    public void deleteRequest(String workflowId) {
        workflowDslRequestCrudService.delete(workflowId);
    }
}
