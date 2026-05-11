/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.mongodb.application.dto;

/**
 * Request to discover the field structure of a MongoDB collection.
 *
 * @param connectionName name of the registered MongoDB connection
 * @param database       target database name
 * @param collection     target collection name
 */
public record MongoDbSchemaRequestDto(
        String connectionName,
        String database,
        String collection
) {}
