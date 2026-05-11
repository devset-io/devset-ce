/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.mongodb.infrastructure;

import org.springframework.lang.Nullable;

/**
 * Immutable MongoDB connection parameters.
 *
 * @param connectionString MongoDB URI
 * @param database         target database name
 * @param username         optional authentication username
 * @param password         optional authentication password
 */
record MongoConnectionConfig(
        String connectionString,
        String database,
        @Nullable String username,
        @Nullable String password
) {

    /**
     * Returns {@code true} if both username and password are provided.
     *
     * @return whether the connection uses credentials
     */
    boolean authenticated() {
        return username != null && password != null;
    }
}
