/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.collection.application;

import io.devset.ce.be.collection.domain.CollectionDefinition;
import io.devset.ce.be.common.domain.WorkflowEngineException;

import java.util.List;

/**
 * Facade for collection CRUD operations.
 * <p>
 * A collection is a named grouping of single requests. This is the only entry point
 * for collection management from controllers and other modules — internal services
 * and repositories must never be accessed directly.
 */
public interface CollectionFacade {

    /**
     * Checks whether a collection with the given name exists.
     *
     * @param collectionName the collection name to check
     * @return {@code true} if the collection exists
     */
    boolean exists(String collectionName);

    /**
     * Creates a new collection from the given definition.
     *
     * @param request the collection definition to create
     * @return the persisted collection definition
     * @throws WorkflowEngineException
     *         if a collection with the same name already exists
     */
    CollectionDefinition create(CollectionDefinition request);

    /**
     * Replaces the {@code collectionContext} of an existing collection.
     * The {@code collectionName} on the request must match an existing collection.
     *
     * @param request the collection definition with the new context
     * @return the persisted collection definition
     * @throws WorkflowEngineException if the collection is not found
     */
    CollectionDefinition update(CollectionDefinition request);

    /**
     * Retrieves a collection by its unique name.
     *
     * @param collectionName the collection name
     * @return the collection definition
     * @throws WorkflowEngineException if the collection is not found
     */
    CollectionDefinition get(String collectionName);

    /**
     * Retrieves all collections in the system.
     *
     * @return list of all collection definitions, possibly empty
     */
    List<CollectionDefinition> getAll();

    /**
     * Removes a collection by its unique name.
     *
     * @param collectionName the collection name
     * @throws WorkflowEngineException
     *         if the collection is not found, or still contains single requests
     */
    void remove(String collectionName);
}
