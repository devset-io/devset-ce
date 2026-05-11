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
 * Persistence port for user-authored workflow DSL requests.
 * <p>
 * Defines the CRUD contract that the application layer uses to manage workflow
 * definitions. Implemented in infrastructure by a JPA-backed adapter.
 * This is not a repository — repositories remain internal to infrastructure.
 */
public interface WorkflowService {

    /**
     * Persists a new workflow DSL request.
     *
     * @param request the workflow to create
     * @return the persisted workflow
     * @throws WorkflowEngineException
     *         if a workflow with the same id already exists
     */
    Workflow create(Workflow request);

    /**
     * Retrieves a workflow by its id.
     *
     * @param workflowId the workflow id
     * @return the workflow
     * @throws WorkflowEngineException if the workflow is not found
     */
    Workflow getByWorkflowId(String workflowId);

    /**
     * Retrieves all persisted workflows.
     *
     * @return list of workflows, possibly empty
     */
    List<Workflow> findAll();

    /**
     * Replaces an existing workflow's content.
     *
     * @param workflowId the target workflow id (must match {@code request.id()})
     * @param request    the new workflow content
     * @return the updated workflow
     * @throws WorkflowEngineException
     *         if {@code workflowId} does not match {@code request.id()},
     *         or the workflow does not exist
     */
    Workflow update(String workflowId, Workflow request);

    /**
     * Deletes a workflow by its id.
     *
     * @param workflowId the workflow id
     * @throws WorkflowEngineException if the workflow is not found
     */
    void delete(String workflowId);
}
