/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.config.cache;

/**
 * Constants for Ehcache cache names used across the application.
 */
public final class CacheNames {

    public static final String COLLECTION_BY_NAME = "collection.by-name";
    public static final String COLLECTION_ALL = "collection.all";
    public static final String SINGLE_REQUEST_BY_NAME = "single-request.by-name";
    public static final String SINGLE_REQUEST_ALL = "single-request.all";
    public static final String WORKFLOW_BY_ID = "workflow.by-id";
    public static final String WORKFLOW_ALL = "workflow.all";
    public static final String WORKFLOW_CATALOG_BY_NAME = "workflow-catalog.by-name";
    public static final String WORKFLOW_CATALOG_NAMES = "workflow-catalog.names";
    public static final String SCHEMA_LATEST_BY_ID = "schema.latest-by-id";
    public static final String SCHEMA_ALL = "schema.all";
    public static final String SINGLE_STEP_HISTORY = "single-step.history";

    private CacheNames() {
    }
}
