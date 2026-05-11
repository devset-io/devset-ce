/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dbconnector.api.dto;

import io.devset.ce.be.common.domain.DbConnectionType;

/**
 * API DTO for opening a new database connection.
 *
 * @param type             database type (e.g. {@code mongodb})
 * @param name             connection name used to reference this client
 * @param connectionString database connection URI (e.g. {@code mongodb://host:27017})
 * @param database         database name to use for this connection
 * @param username         optional authentication username
 * @param password         optional authentication password
 */
public record OpenDbConnectionDto(
        DbConnectionType type,
        String name,
        String connectionString,
        String database,
        String username,
        String password
) {}
