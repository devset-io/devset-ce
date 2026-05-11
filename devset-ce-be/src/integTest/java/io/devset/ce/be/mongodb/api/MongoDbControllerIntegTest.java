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

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import io.devset.ce.be.config.DevsetCeBeApplication;
import io.devset.ce.be.kafka.application.DynamicKafkaProducerManager;
import io.devset.ce.be.rabbit.application.DynamicRabbitProducerManager;
import org.bson.Document;
import org.junit.jupiter.api.BeforeAll;
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

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
@Testcontainers
class MongoDbControllerIntegTest {

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

    @BeforeAll
    static void seedData() {
        try (MongoClient client = MongoClients.create(mongoContainer.getConnectionString())) {
            var collection = client.getDatabase("testdb").getCollection("users");
            collection.insertMany(List.of(
                    new Document("name", "Alice").append("status", "active"),
                    new Document("name", "Bob").append("status", "inactive"),
                    new Document("name", "Charlie").append("status", "active")
            ));
        }
    }

    @Test
    void shouldRegisterConnectionAndQueryDocuments() throws Exception {
        mockMvc.perform(post("/api/db/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "mongodb",
                                  "name": "test-mongo",
                                  "connectionString": "%s",
                                  "database": "testdb",
                                  "username": null,
                                  "password": null
                                }
                                """.formatted(mongoContainer.getConnectionString())))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(post("/api/mongodb/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "connectionName": "test-mongo",
                                  "database": "testdb",
                                  "collection": "users",
                                  "filter": "{\\"status\\": \\"active\\"}"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(1, response.path("count").asInt());
        JsonNode documents = response.path("documents");
        assertEquals(1, documents.size());
        String name = documents.get(0).path("name").asText();
        assertTrue("Alice".equals(name) || "Charlie".equals(name),
                "Result must be one of the active users, was: " + name);
        assertEquals("active", documents.get(0).path("status").asText());
    }

    @Test
    void shouldReturnEmptyResultForNoMatches() throws Exception {
        mockMvc.perform(post("/api/db/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "mongodb",
                                  "name": "test-mongo-empty",
                                  "connectionString": "%s",
                                  "database": "testdb",
                                  "username": null,
                                  "password": null
                                }
                                """.formatted(mongoContainer.getConnectionString())))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(post("/api/mongodb/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "connectionName": "test-mongo-empty",
                                  "database": "testdb",
                                  "collection": "users",
                                  "filter": "{\\"status\\": \\"deleted\\"}"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(0, response.path("count").asInt());
        assertEquals(0, response.path("documents").size());
    }

    @Test
    void shouldReturnAllDocumentsWithEmptyFilter() throws Exception {
        mockMvc.perform(post("/api/db/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "mongodb",
                                  "name": "test-mongo-all",
                                  "connectionString": "%s",
                                  "database": "testdb",
                                  "username": null,
                                  "password": null
                                }
                                """.formatted(mongoContainer.getConnectionString())))
                .andExpect(status().isOk());

        MvcResult result = mockMvc.perform(post("/api/mongodb/query")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "connectionName": "test-mongo-all",
                                  "database": "testdb",
                                  "collection": "users",
                                  "filter": "{}"
                                }
                                """))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(1, response.path("count").asInt());
        assertEquals(1, response.path("documents").size());
    }
}
