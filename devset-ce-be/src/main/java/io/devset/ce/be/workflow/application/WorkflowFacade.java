/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.application;

import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowEngineException;

import java.util.List;

/**
 * Facade for workflow DSL definitions.
 * <p>
 * Exposes two groups of operations: read-only access to the runtime workflow catalog
 * (resolved by name, used by the engine at execution time) and CRUD over user-authored
 * workflow DSL requests. This is the only entry point for workflow operations from
 * controllers and other modules.
 */
public interface WorkflowFacade {

    /**
     * Lists the names of all workflows available in the catalog.
     *
     * @return sorted list of workflow names, possibly empty
     */
    List<String> listCatalog();

    /**
     * Loads a workflow from the catalog by its name.
     *
     * @param name the workflow name (with or without {@code .json} suffix)
     * @return the workflow definition
     * @throws WorkflowEngineException
     *         if the name is blank or no workflow with the given name exists
     */
    Workflow getCatalogEntry(String name);

    /**
     * Creates a new workflow DSL request.
     *
     * @param request the workflow to persist
     * @return the persisted workflow
     * @throws WorkflowEngineException
     *         if a workflow with the same id already exists
     */
    Workflow createRequest(Workflow request);

    /**
     * Retrieves a workflow DSL request by its id.
     *
     * @param workflowId the workflow id
     * @return the workflow
     * @throws WorkflowEngineException if the workflow is not found
     */
    Workflow getRequest(String workflowId);

    /**
     * Lists all persisted workflow DSL requests.
     *
     * @return list of workflows, possibly empty
     */
    List<Workflow> listRequests();

    /**
     * Updates an existing workflow DSL request.
     *
     * @param workflowId the target workflow id (must match {@code request.id()})
     * @param request    the new workflow content
     * @return the updated workflow
     * @throws WorkflowEngineException
     *         if {@code workflowId} does not match {@code request.id()},
     *         or the workflow does not exist
     */
    Workflow updateRequest(String workflowId, Workflow request);

    /**
     * Deletes a workflow DSL request by its id.
     *
     * @param workflowId the workflow id
     * @throws WorkflowEngineException if the workflow is not found
     */
    void deleteRequest(String workflowId);
}
