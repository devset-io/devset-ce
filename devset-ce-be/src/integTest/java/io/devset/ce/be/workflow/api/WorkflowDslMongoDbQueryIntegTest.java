/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.api;

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
import org.mockito.ArgumentCaptor;
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

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test for the full DSL pipeline with {@code execute-query} step
 * backed by a real MongoDB testcontainer.
 * <p>
 * Flow: seed MongoDB → register DB connection → register Kafka connector →
 * execute DSL workflow with query stage → verify Kafka send with enriched data.
 */
@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
@Testcontainers
class WorkflowDslMongoDbQueryIntegTest {

    private static final Duration RUN_COMPLETION_TIMEOUT = Duration.ofSeconds(5);
    private static final long POLL_INTERVAL_MILLIS = 50L;

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
            client.getDatabase("testdb").getCollection("customers").insertMany(List.of(
                    new Document("customerId", "cust-1")
                            .append("name", "Alice")
                            .append("email", "alice@devset.io")
                            .append("phone", "+48111"),
                    new Document("customerId", "cust-2")
                            .append("name", "Bob")
                            .append("email", "bob@devset.io")
                            .append("phone", "+48222")
            ));
        }
    }

    @Test
    void shouldExecuteDslWithQueryStageAndEnrichEventFromMongoDB() throws Exception {
        String input = UUID.randomUUID().toString().replace("-", "");
        String producerName = "kafka-" + input;
        String topic = "enriched-" + input;
        String workflowId = "query-flow-" + input;
        String mongoConnectionName = "mongo-" + input;

        // 1. Register MongoDB connection
        mockMvc.perform(post("/api/db/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "mongodb",
                                  "name": "%s",
                                  "connectionString": "%s",
                                  "database": "testdb"
                                }
                                """.formatted(mongoConnectionName, mongoContainer.getConnectionString())))
                .andExpect(status().isOk());

        // 2. Register Kafka connector (mocked)
        mockMvc.perform(post("/api/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "kafka",
                                  "name": "%s",
                                  "bootstrapServers": "localhost:9092"
                                }
                                """.formatted(producerName)))
                .andExpect(status().isOk());

        // 3. Execute DSL workflow with query stage
        MvcResult executeResult = mockMvc.perform(post("/api/engine/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "id": "%s",
                                  "producerName": "%s",
                                  "topic": "%s",
                                  "executions": 1,
                                  "state": {
                                    "lookupCustomerId": "cust-1",
                                    "fallbackEmail": "unknown@devset.io"
                                  },
                                  "pipeline": [
                                    {
                                      "stage": "fetch-customer",
                                      "source": "none",
                                      "query": {
                                        "connection": "%s",
                                        "database": "testdb",
                                        "collection": "customers",
                                        "find": {
                                          "customerId": {"$path": "state.lookupCustomerId"}
                                        },
                                        "select": {
                                          "state.customerName": "name",
                                          "state.customerEmail": {
                                            "field": "email",
                                            "default": {"$path": "state.fallbackEmail"}
                                          }
                                        }
                                      },
                                      "set": {
                                        "enrichedName": {"$ref": "customerName"},
                                        "enrichedEmail": {"$ref": "customerEmail"},
                                        "orderId": {"$fn": "uuid()"}
                                      },
                                      "emit": true
                                    }
                                  ]
                                }
                                """.formatted(workflowId, producerName, topic, mongoConnectionName)))
                .andExpect(status().isAccepted())
                .andReturn();

        JsonNode executeResponse = objectMapper.readTree(executeResult.getResponse().getContentAsString());
        String runId = executeResponse.path("runId").asText();
        assertNotNull(runId);

        // 4. Wait for completion
        JsonNode runStatus = waitForRunStatus(runId, "COMPLETED", "FAILED");
        assertEquals("COMPLETED", runStatus.path("status").asText(),
                "Run failed: " + runStatus.path("errorMessage").asText(""));
        assertEquals(1, runStatus.path("completedExecutions").asInt());
        assertEquals(0, runStatus.path("failedExecutions").asInt());

        // 5. Verify Kafka send — event should contain enriched data from MongoDB
        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(dynamicKafkaProducerManager, timeout(1_000).times(1)).sendMessage(
                eq(producerName), eq(topic), any(), anyMap(), messageCaptor.capture()
        );

        JsonNode sentEvent = objectMapper.readTree(messageCaptor.getValue());
        assertEquals("Alice", sentEvent.path("enrichedName").asText());
        assertEquals("alice@devset.io", sentEvent.path("enrichedEmail").asText());
        assertNotNull(sentEvent.path("orderId").asText());
    }

    @Test
    void shouldApplySelectDefaultsWhenMongoDocumentNotFound() throws Exception {
        String input = UUID.randomUUID().toString().replace("-", "");
        String producerName = "kafka-def-" + input;
        String topic = "default-" + input;
        String workflowId = "query-default-" + input;
        String mongoConnectionName = "mongo-def-" + input;

        mockMvc.perform(post("/api/db/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "mongodb",
                                  "name": "%s",
                                  "connectionString": "%s",
                                  "database": "testdb"
                                }
                                """.formatted(mongoConnectionName, mongoContainer.getConnectionString())))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "kafka",
                                  "name": "%s",
                                  "bootstrapServers": "localhost:9092"
                                }
                                """.formatted(producerName)))
                .andExpect(status().isOk());

        MvcResult executeResult = mockMvc.perform(post("/api/engine/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "id": "%s",
                                  "producerName": "%s",
                                  "topic": "%s",
                                  "executions": 1,
                                  "state": {
                                    "fallbackEmail": "no-reply@devset.io"
                                  },
                                  "pipeline": [
                                    {
                                      "stage": "fetch-missing",
                                      "source": "none",
                                      "query": {
                                        "connection": "%s",
                                        "database": "testdb",
                                        "collection": "customers",
                                        "find": {
                                          "customerId": "non-existent-id"
                                        },
                                        "select": {
                                          "state.customerEmail": {
                                            "field": "email",
                                            "default": {"$path": "state.fallbackEmail"}
                                          }
                                        }
                                      },
                                      "set": {
                                        "email": {"$ref": "customerEmail"}
                                      },
                                      "emit": true
                                    }
                                  ]
                                }
                                """.formatted(workflowId, producerName, topic, mongoConnectionName)))
                .andExpect(status().isAccepted())
                .andReturn();

        String runId = objectMapper.readTree(executeResult.getResponse().getContentAsString())
                .path("runId").asText();

        JsonNode runStatus = waitForRunStatus(runId, "COMPLETED", "FAILED");
        assertEquals("COMPLETED", runStatus.path("status").asText(),
                "Run failed: " + runStatus.path("errorMessage").asText(""));

        ArgumentCaptor<String> messageCaptor = ArgumentCaptor.forClass(String.class);
        verify(dynamicKafkaProducerManager, timeout(1_000).atLeastOnce()).sendMessage(
                eq(producerName), eq(topic), any(), anyMap(), messageCaptor.capture()
        );

        JsonNode sentEvent = objectMapper.readTree(messageCaptor.getValue());
        assertEquals("no-reply@devset.io", sentEvent.path("email").asText());
    }

    private JsonNode waitForRunStatus(String runId, String... terminalStatuses) throws Exception {
        long deadline = System.nanoTime() + RUN_COMPLETION_TIMEOUT.toNanos();
        JsonNode lastStatus = null;

        while (System.nanoTime() < deadline) {
            MvcResult result = mockMvc.perform(get("/api/engine/runs/{runId}", runId))
                    .andExpect(status().isOk())
                    .andReturn();

            lastStatus = objectMapper.readTree(result.getResponse().getContentAsString());
            String status = lastStatus.path("status").asText();
            for (String terminal : terminalStatuses) {
                if (terminal.equals(status)) {
                    return lastStatus;
                }
            }
            Thread.sleep(POLL_INTERVAL_MILLIS);
        }

        throw new AssertionError("Workflow run did not finish in time. Last status: " + lastStatus);
    }
}
