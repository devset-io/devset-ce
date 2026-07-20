/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.examples.application;

/**
 * Facade for predefined example data operations.
 * <p>
 * Predefined examples are reference schemas, a workflow, a collection and single
 * requests bundled with the application so a first-time user always starts with
 * working data. This is the only entry point for example seeding from the startup
 * initializer.
 */
public interface PredefinedExamplesFacade {

    /**
     * Seeds the predefined examples when the instance contains no data at all.
     * Does nothing if any schema, workflow, collection or single request exists.
     * A failing entry is logged and skipped, never propagated, so seeding never
     * prevents the application from starting.
     */
    void seedFreshInstance();
}
