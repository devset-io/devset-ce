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
 * Request to execute a find query against a MongoDB collection.
 *
 * @param connectionName name of the registered MongoDB connection to use
 * @param database       target database name
 * @param collection     target collection name
 * @param filter         JSON filter document (e.g. {@code {"status": "active"}}); empty or {@code {}} for all documents
 * @param projection     JSON projection document (e.g. {@code {"email": 1, "_id": 0}}); {@code null} for all fields
 * @param limit          maximum number of documents to return; {@code null} or {@code 0} for no limit
 */
public record MongoDbQueryRequestDto(
        String connectionName,
        String database,
        String collection,
        String filter,
        String projection,
        Integer limit
) {

    /**
     * Convenience constructor without projection and limit.
     */
    public MongoDbQueryRequestDto(String connectionName, String database, String collection, String filter) {
        this(connectionName, database, collection, filter, null, null);
    }
}
