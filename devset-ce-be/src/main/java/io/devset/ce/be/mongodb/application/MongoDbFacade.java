/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.mongodb.application;

import io.devset.ce.be.mongodb.application.dto.MongoDbConnectionStatusDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryRequestDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryResultDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbSchemaFieldDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbSchemaRequestDto;

import java.util.List;

/**
 * Facade for MongoDB operations.
 * <p>
 * This is the single entry point for MongoDB connectivity from other modules.
 * Controllers and cross-module code depend only on this interface,
 * never on internal managers or drivers directly.
 */
public interface MongoDbFacade {

    /**
     * Registers a named MongoDB connection.
     *
     * @param name             connection name used to reference this client
     * @param connectionString MongoDB connection URI (e.g. {@code mongodb://host:27017})
     * @param database         target database name
     * @param username         authentication username; may be {@code null}
     * @param password         authentication password; may be {@code null}
     */
    void connect(String name, String connectionString, String database, String username, String password);

    /**
     * Removes a named MongoDB connection and releases its resources.
     *
     * @param name connection name to remove
     */
    void remove(String name);

    /**
     * Lists all registered MongoDB connections and their status.
     *
     * @return list of connection statuses, possibly empty
     */
    List<MongoDbConnectionStatusDto> listConnections();

    /**
     * Executes a find query and returns matching documents.
     *
     * @param request query parameters including connection, database, collection, and filter
     * @return query result containing matching documents
     */
    MongoDbQueryResultDto executeQuery(MongoDbQueryRequestDto request);

    /**
     * Discovers the field structure of a MongoDB collection by sampling documents.
     *
     * @param request connection, database and collection identifiers
     * @return list of top-level fields with nested children
     */
    List<MongoDbSchemaFieldDto> discoverSchema(MongoDbSchemaRequestDto request);

    /**
     * Returns the database name configured for the given connection.
     *
     * @param connectionName name of the registered connection
     * @return single-element list with the configured database name
     */
    List<String> listDatabases(String connectionName);

    /**
     * Lists all collection names in a given database.
     *
     * @param connectionName name of the registered connection
     * @param database       database name
     * @return sorted list of collection names
     */
    List<String> listCollections(String connectionName, String database);
}
