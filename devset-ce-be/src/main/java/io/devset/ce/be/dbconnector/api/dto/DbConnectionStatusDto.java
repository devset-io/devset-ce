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
 * API DTO describing the health and identity of a registered database connection.
 *
 * @param type             database type (e.g. {@code mongodb})
 * @param name             connection name
 * @param connectionString database connection URI
 * @param connected        whether the client is currently connected
 * @param authenticated    whether credentials were provided
 */
public record DbConnectionStatusDto(
        DbConnectionType type,
        String name,
        String connectionString,
        boolean connected,
        boolean authenticated
) {}
