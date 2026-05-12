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
import com.mongodb.client.MongoClient;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.util.LogSanitizer;
import io.devset.ce.be.mongodb.application.dto.MongoDbConnectionStatusDto;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory registry of named MongoDB connections.
 * <p>
 * Owns a long-lived {@link MongoClient} per registered name. The driver itself
 * pools connections internally, so a single client should be reused across
 * queries instead of being recreated per call. Re-registering with a different
 * configuration closes the previous client and opens a fresh one.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MongoConnectionRegistry {

    private final MongoClientFactory clientFactory;

    private final Map<String, MongoConnectionConfig> configs = new ConcurrentHashMap<>();
    private final Map<String, MongoClient> clients = new ConcurrentHashMap<>();

    /**
     * Registers or replaces a named connection. If the new configuration matches
     * the existing one, the active client is reused.
     *
     * @param name             connection name
     * @param connectionString MongoDB URI
     * @param database         target database name
     * @param username         optional username
     * @param password         optional password
     */
    public synchronized void register(
            String name, String connectionString, String database, @Nullable String username, @Nullable String password
    ) {
        MongoConnectionConfig newConfig = new MongoConnectionConfig(connectionString, database, username, password);
        MongoConnectionConfig existing = configs.get(name);

        if (newConfig.equals(existing)) {
            log.debug("MongoDB connection config already registered: name={}", name);
            return;
        }

        MongoClient client;
        try {
            client = clientFactory.create(newConfig);
        } catch (MongoException | IllegalArgumentException e) {
            String safeMessage = MongoUriSanitizer.redactInText(e.getMessage());
            log.warn("MongoDB client creation failed: name={}: {}", name, safeMessage);
            throw new WorkflowEngineException(
                    "Failed to create MongoDB client for connection=" + name + ": " + safeMessage);
        }
        closeQuietly(clients.remove(name), name);
        configs.put(name, newConfig);
        clients.put(name, client);
        log.info("MongoDB connection registered: name={}", name);
    }

    /**
     * Removes a named connection and closes its client.
     *
     * @param name connection name
     * @throws WorkflowEngineException if the connection does not exist
     */
    public synchronized void remove(String name) {
        if (configs.remove(name) == null) {
            throw new WorkflowEngineException("MongoDB connector not found: " + name);
        }
        closeQuietly(clients.remove(name), name);
    }

    /**
     * Returns all registered connections as status DTOs sorted by name.
     * The connection URI is sanitized so that any embedded credentials are
     * stripped before being returned.
     *
     * @return sorted list of connection statuses
     */
    public List<MongoDbConnectionStatusDto> listAll() {
        return configs.entrySet()
                .stream()
                .map(entry -> new MongoDbConnectionStatusDto(
                        entry.getKey(),
                        MongoUriSanitizer.redact(entry.getValue().connectionString()),
                        clients.containsKey(entry.getKey()),
                        entry.getValue().authenticated()
                ))
                .sorted(Comparator.comparing(MongoDbConnectionStatusDto::name))
                .toList();
    }

    /**
     * Returns the cached client for the given connection name.
     *
     * @param connectionName connection name
     * @return live MongoClient
     * @throws WorkflowEngineException if the connection is not registered
     */
    public MongoClient requireClient(String connectionName) {
        MongoClient client = clients.get(connectionName);
        if (client == null) {
            throw new WorkflowEngineException("MongoDB connection not found: " + connectionName);
        }
        return client;
    }

    /**
     * Returns the configured database name for the given connection.
     *
     * @param connectionName connection name
     * @return database name
     * @throws WorkflowEngineException if the connection is not registered
     */
    public String requireDatabase(String connectionName) {
        MongoConnectionConfig config = configs.get(connectionName);
        if (config == null) {
            throw new WorkflowEngineException("MongoDB connection not found: " + connectionName);
        }
        return config.database();
    }

    @PreDestroy
    void closeAll() {
        clients.forEach((name, client) -> closeQuietly(client, name));
        clients.clear();
        configs.clear();
    }

    private void closeQuietly(@Nullable MongoClient client, String name) {
        if (client == null) {
            return;
        }
        try {
            client.close();
        } catch (RuntimeException e) {
            log.warn("Failed to close MongoDB client: name={}", LogSanitizer.sanitize(name), e);
        }
    }
}
