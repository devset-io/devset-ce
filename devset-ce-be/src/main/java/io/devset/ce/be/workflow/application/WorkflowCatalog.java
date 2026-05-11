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
 * Read-only port for resolving workflows by name at runtime.
 * <p>
 * Used by the engine and other modules that need to resolve a workflow by name
 * without going through the full CRUD surface of {@link WorkflowService}.
 */
public interface WorkflowCatalog {

    /**
     * Lists the names of all available workflows, sorted alphabetically.
     *
     * @return sorted list of workflow names, possibly empty
     */
    List<String> listNames();

    /**
     * Loads a workflow by its catalog name.
     *
     * @param name the workflow name; a trailing {@code .json} suffix is stripped
     * @return the workflow definition
     * @throws WorkflowEngineException
     *         if the name is blank or no workflow with the resolved name exists
     */
    Workflow loadByName(String name);
}
