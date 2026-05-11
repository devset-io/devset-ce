/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dbconnector.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.config.DevsetCeBeApplication;
import io.devset.ce.be.kafka.application.DynamicKafkaProducerManager;
import io.devset.ce.be.rabbit.application.DynamicRabbitProducerManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.MongoDBContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
@Testcontainers
class DbConfigurationControllerIntegTest {

    @Container
    static MongoDBContainer mongoContainer = new MongoDBContainer("mongo:7.0");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DynamicKafkaProducerManager dynamicKafkaProducerManager;

    @MockitoBean
    private DynamicRabbitProducerManager dynamicRabbitProducerManager;

    @Test
    void shouldOpenMongoDbConnectionAndListIt() throws Exception {
        mockMvc.perform(post("/api/db/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "mongodb",
                                  "name": "integ-mongo",
                                  "connectionString": "%s",
                                  "database": "testdb",
                                  "username": null,
                                  "password": null
                                }
                                """.formatted(mongoContainer.getConnectionString())))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(get("/api/db/connectors/configurations"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode connections = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(connections.isArray());

        boolean found = false;
        for (JsonNode conn : connections) {
            if ("integ-mongo".equals(conn.path("name").asText())
                    && "mongodb".equals(conn.path("type").asText())) {
                found = true;
                assertTrue(conn.path("connected").asBoolean());
                break;
            }
        }
        assertTrue(found, "Listing must include the registered MongoDB connection");
    }

    @Test
    void shouldDeleteMongoDbConnection() throws Exception {
        mockMvc.perform(post("/api/db/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "mongodb",
                                  "name": "to-delete",
                                  "connectionString": "%s",
                                  "database": "testdb",
                                  "username": null,
                                  "password": null
                                }
                                """.formatted(mongoContainer.getConnectionString())))
                .andExpect(status().isOk());

        mockMvc.perform(delete("/api/db/connectors/configurations/{type}/{name}", "mongodb", "to-delete"))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(get("/api/db/connectors/configurations"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode connections = objectMapper.readTree(result.getResponse().getContentAsString());
        for (JsonNode conn : connections) {
            if ("to-delete".equals(conn.path("name").asText())) {
                throw new AssertionError("Connection 'to-delete' should have been removed");
            }
        }
    }

    @Test
    void shouldRegisterConnectionThenQueryRealMongoDB() throws Exception {
        mockMvc.perform(post("/api/db/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "mongodb",
                                  "name": "query-mongo",
                                  "connectionString": "%s",
                                  "database": "testdb",
                                  "username": null,
                                  "password": null
                                }
                                """.formatted(mongoContainer.getConnectionString())))
                .andExpect(status().isOk());

        // Seed data via the query endpoint won't work — insert directly
        try (var client = com.mongodb.client.MongoClients.create(mongoContainer.getConnectionString())) {
            client.getDatabase("e2edb").getCollection("items")
                    .insertOne(new org.bson.Document("sku", "ABC-123").append("qty", 10));
        }

        MvcResult result = mockMvc.perform(post("/api/mongodb/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "connectionName": "query-mongo",
                                  "database": "e2edb",
                                  "collection": "items",
                                  "filter": "{\\"sku\\": \\"ABC-123\\"}"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(1, response.path("count").asInt());
        assertEquals("ABC-123", response.path("documents").get(0).path("sku").asText());
        assertEquals(10, response.path("documents").get(0).path("qty").asInt());
    }
}
