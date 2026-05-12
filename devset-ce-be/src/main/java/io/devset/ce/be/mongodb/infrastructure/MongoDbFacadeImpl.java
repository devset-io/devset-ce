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

import com.mongodb.MongoException;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.util.LogSanitizer;
import io.devset.ce.be.mongodb.application.MongoDbFacade;
import io.devset.ce.be.mongodb.application.dto.MongoDbConnectionStatusDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryRequestDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryResultDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbSchemaFieldDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbSchemaRequestDto;
import io.devset.ce.be.mongodb.infrastructure.schema.MongoSchemaIntrospector;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.bson.Document;
import org.bson.json.JsonParseException;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

/**
 * Infrastructure implementation of {@link MongoDbFacade}.
 * <p>
 * Orchestrates {@link MongoConnectionRegistry} for connection management and
 * {@link MongoSchemaIntrospector} for schema discovery. Filter and projection
 * documents are validated against a denylist of operators that allow server-side
 * code execution.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MongoDbFacadeImpl implements MongoDbFacade {

    private static final Set<String> DISALLOWED_OPERATORS = Set.of(
            "$where", "$function", "$accumulator", "$expr"
    );
    private static final Set<String> BLOCKED_DATABASES = Set.of("admin", "local", "config");
    private static final String SYSTEM_COLLECTION_PREFIX = "system.";
    private static final int MAX_DOCUMENTS_RETURNED = 1;

    private final MongoConnectionRegistry registry;
    private final MongoSchemaIntrospector schemaIntrospector;

    @Override
    public void connect(String name, String connectionString, String database, @Nullable String username, @Nullable String password) {
        requireAccessibleDatabase(database);
        registry.register(name, connectionString, database, username, password);
    }

    @Override
    public void remove(String name) {
        registry.remove(name);
    }

    @Override
    public List<MongoDbConnectionStatusDto> listConnections() {
        return registry.listAll();
    }

    @Override
    public MongoDbQueryResultDto executeQuery(MongoDbQueryRequestDto request) {
        requireAccessibleDatabase(request.database());
        requireAccessibleCollection(request.collection());
        Document filter = parseDocumentOrEmpty(request.filter(), "filter");
        Document projection = parseDocumentOrNull(request.projection(), "projection");

        return withClient(request.connectionName(), "query", client -> {
            MongoCollection<Document> collection = client.getDatabase(request.database())
                    .getCollection(request.collection());

            FindIterable<Document> query = collection.find(filter).limit(MAX_DOCUMENTS_RETURNED);
            if (projection != null) {
                query = query.projection(projection);
            }

            List<Map<String, Object>> documents = new ArrayList<>();
            query.into(documents);
            return new MongoDbQueryResultDto(documents, documents.size());
        });
    }

    @Override
    public List<String> listDatabases(String connectionName) {
        return List.of(registry.requireDatabase(connectionName));
    }

    @Override
    public List<String> listCollections(String connectionName, String database) {
        requireAccessibleDatabase(database);
        return withClient(connectionName, "listCollections", client -> {
            List<String> collections = new ArrayList<>();
            client.getDatabase(database).listCollectionNames().into(collections);
            return collections.stream()
                    .filter(name -> !name.startsWith(SYSTEM_COLLECTION_PREFIX))
                    .sorted()
                    .toList();
        });
    }

    @Override
    public List<MongoDbSchemaFieldDto> discoverSchema(MongoDbSchemaRequestDto request) {
        requireAccessibleDatabase(request.database());
        requireAccessibleCollection(request.collection());
        return withClient(request.connectionName(), "discoverSchema", client -> {
            Document sample = client.getDatabase(request.database())
                    .getCollection(request.collection())
                    .find()
                    .limit(1)
                    .first();

            if (sample == null) {
                return List.of();
            }
            return schemaIntrospector.buildSchema(sample);
        });
    }

    private <T> T withClient(String connectionName, String operation, Function<MongoClient, T> action) {
        MongoClient client = registry.requireClient(connectionName);
        try {
            return action.apply(client);
        } catch (MongoException e) {
            String safeMessage = MongoUriSanitizer.redactInText(e.getMessage());
            log.warn("MongoDB {} failed for connection={}: {}", LogSanitizer.sanitize(operation), LogSanitizer.sanitize(connectionName), safeMessage);
            throw new WorkflowEngineException(
                    "MongoDB " + operation + " failed for connection=" + connectionName + ": " + safeMessage);
        }
    }

    private Document parseDocumentOrEmpty(@Nullable String json, String field) {
        if (json == null || json.isBlank()) {
            return new Document();
        }
        Document parsed = parseJson(json, field);
        rejectDisallowedOperators(parsed, field);
        return parsed;
    }

    @Nullable
    private Document parseDocumentOrNull(@Nullable String json, String field) {
        if (json == null || json.isBlank()) {
            return null;
        }
        Document parsed = parseJson(json, field);
        rejectDisallowedOperators(parsed, field);
        return parsed;
    }

    private Document parseJson(String json, String field) {
        try {
            return Document.parse(json);
        } catch (JsonParseException e) {
            throw new WorkflowEngineException("Invalid MongoDB JSON in " + field, e);
        }
    }

    private void requireAccessibleDatabase(String database) {
        if (database != null && BLOCKED_DATABASES.contains(database)) {
            throw new WorkflowEngineException("Access to system database '" + database + "' is not allowed");
        }
    }

    private void requireAccessibleCollection(String collection) {
        if (collection != null && collection.startsWith(SYSTEM_COLLECTION_PREFIX)) {
            throw new WorkflowEngineException("Access to system collection '" + collection + "' is not allowed");
        }
    }

    private void rejectDisallowedOperators(Object node, String field) {
        if (node instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = String.valueOf(entry.getKey());
                if (DISALLOWED_OPERATORS.contains(key)) {
                    throw new WorkflowEngineException(
                            "Disallowed MongoDB operator '" + key + "' in " + field);
                }
                rejectDisallowedOperators(entry.getValue(), field);
            }
        } else if (node instanceof Iterable<?> iterable) {
            for (Object item : iterable) {
                rejectDisallowedOperators(item, field);
            }
        }
    }
}
