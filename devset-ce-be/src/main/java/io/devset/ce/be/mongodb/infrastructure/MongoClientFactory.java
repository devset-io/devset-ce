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

import com.mongodb.ConnectionString;
import com.mongodb.MongoClientSettings;
import com.mongodb.MongoCredential;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Creates {@link MongoClient} instances from a {@link MongoConnectionConfig}.
 * <p>
 * Authentication database is derived from the connection string's {@code authSource}
 * parameter, falling back to {@code admin} when not specified. Conservative timeouts
 * are applied so that engine steps fail fast on network problems instead of hanging
 * for the driver default of 30 s.
 */
@Component
public class MongoClientFactory {

    private static final long SERVER_SELECTION_TIMEOUT_MS = 5_000L;
    private static final long CONNECT_TIMEOUT_MS = 5_000L;
    private static final long READ_TIMEOUT_MS = 10_000L;

    /**
     * Creates a new {@link MongoClient} from the given configuration.
     *
     * @param config connection parameters
     * @return a connected MongoClient — caller owns its lifecycle
     */
    public MongoClient create(MongoConnectionConfig config) {
        ConnectionString connString = new ConnectionString(config.connectionString());
        MongoClientSettings.Builder settingsBuilder = MongoClientSettings.builder()
                .applyConnectionString(connString)
                .applyToClusterSettings(b -> b.serverSelectionTimeout(SERVER_SELECTION_TIMEOUT_MS, TimeUnit.MILLISECONDS))
                .applyToSocketSettings(b -> b
                        .connectTimeout((int) CONNECT_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                        .readTimeout((int) READ_TIMEOUT_MS, TimeUnit.MILLISECONDS));

        if (config.authenticated()) {
            String authDb = resolveAuthDb(connString, config.database());
            settingsBuilder.credential(
                    MongoCredential.createCredential(
                            config.username(), authDb, config.password().toCharArray()
                    )
            );
        }

        return MongoClients.create(settingsBuilder.build());
    }

    /**
     * Resolves the authentication database from the connection string.
     * Checks the embedded credential first, then the {@code authSource} query
     * parameter, then the configured database name, falling back to {@code admin}
     * when none is present.
     *
     * @param connString       parsed connection string
     * @param configuredDatabase database name from the connection configuration
     * @return authentication database name
     */
    private String resolveAuthDb(ConnectionString connString, String configuredDatabase) {
        if (connString.getCredential() != null) {
            return connString.getCredential().getSource();
        }
        String authSource = extractQueryParam(connString.getConnectionString(), "authSource");
        if (authSource != null && !authSource.isBlank()) {
            return authSource;
        }
        String database = connString.getDatabase();
        if (database != null && !database.isBlank()) {
            return database;
        }
        if (configuredDatabase != null && !configuredDatabase.isBlank()) {
            return configuredDatabase;
        }
        return "admin";
    }

    /**
     * Extracts a query parameter value from a MongoDB connection string.
     *
     * @param connectionString raw connection string
     * @param param            parameter name to look up
     * @return parameter value, or {@code null} if not present
     */
    private String extractQueryParam(String connectionString, String param) {
        int queryStart = connectionString.indexOf('?');
        if (queryStart < 0) {
            return null;
        }
        for (String pair : connectionString.substring(queryStart + 1).split("&")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2 && kv[0].equals(param)) {
                return kv[1];
            }
        }
        return null;
    }
}
