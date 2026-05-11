/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlerequest.application;

import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.singlerequest.domain.SingleRequestDefinition;

import java.util.List;

/**
 * Facade for single request operations.
 * <p>
 * A single request is a prepared, reusable message payload bound to a collection.
 * This is the only entry point for single request management from controllers and
 * other modules.
 */
public interface SingleRequestFacade {

    /**
     * Checks whether any single request belongs to the given collection.
     *
     * @param collectionName the collection name to check
     * @return {@code true} if at least one single request references the collection
     */
    boolean existsByCollectionName(String collectionName);

    /**
     * Creates a new single request.
     *
     * @param request the single request definition to persist
     * @return the persisted single request
     * @throws WorkflowEngineException
     *         if a single request with the same name already exists
     */
    SingleRequestDefinition save(SingleRequestDefinition request);

    /**
     * Retrieves a single request by its unique name.
     *
     * @param singleRequestName the single request name
     * @return the single request definition
     * @throws WorkflowEngineException
     *         if the single request is not found
     */
    SingleRequestDefinition get(String singleRequestName);

    /**
     * Retrieves all single requests.
     *
     * @return list of single request definitions, possibly empty
     */
    List<SingleRequestDefinition> getAll();

    /**
     * Replaces an existing single request's content.
     *
     * @param singleRequestName the target single request name (must match
     *                          {@code request.singleRequestName()})
     * @param request           the new single request content
     * @return the updated single request
     * @throws WorkflowEngineException
     *         if the names do not match or the single request does not exist
     */
    SingleRequestDefinition patch(String singleRequestName, SingleRequestDefinition request);

    /**
     * Removes a single request by its unique name.
     *
     * @param singleRequestName the single request name
     * @throws WorkflowEngineException
     *         if the single request is not found
     */
    void remove(String singleRequestName);
}
