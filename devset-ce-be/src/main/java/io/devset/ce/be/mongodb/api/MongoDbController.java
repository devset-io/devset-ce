/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.mongodb.api;

import io.devset.ce.be.mongodb.application.MongoDbFacade;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryRequestDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryResultDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbSchemaFieldDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbSchemaRequestDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for MongoDB query operations.
 * <p>
 * Delegates ALL logic to {@link MongoDbFacade}.
 */
@RestController
@RequestMapping("mongodb")
@RequiredArgsConstructor
public class MongoDbController {

    private final MongoDbFacade mongoDbFacade;

    /**
     * Executes a find query against a MongoDB collection.
     *
     * @param request query parameters
     * @return matching documents
     */
    @PostMapping("/query")
    MongoDbQueryResultDto executeQuery(@RequestBody MongoDbQueryRequestDto request) {
        return mongoDbFacade.executeQuery(request);
    }

    /**
     * Discovers the field structure of a MongoDB collection by sampling a document.
     *
     * @param request connection, database and collection identifiers
     * @return list of fields with paths, types and nested children
     */
    @PostMapping("/schema")
    List<MongoDbSchemaFieldDto> discoverSchema(@RequestBody MongoDbSchemaRequestDto request) {
        return mongoDbFacade.discoverSchema(request);
    }

    /**
     * Lists all database names for a registered MongoDB connection.
     *
     * @param connectionName registered connection name
     * @return sorted list of database names
     */
    @GetMapping("/{connectionName}/databases")
    List<String> listDatabases(@PathVariable String connectionName) {
        return mongoDbFacade.listDatabases(connectionName);
    }

    /**
     * Lists all collection names in a database for a registered MongoDB connection.
     *
     * @param connectionName registered connection name
     * @param database       database name
     * @return sorted list of collection names
     */
    @GetMapping("/{connectionName}/{database}/collections")
    List<String> listCollections(@PathVariable String connectionName, @PathVariable String database) {
        return mongoDbFacade.listCollections(connectionName, database);
    }
}
