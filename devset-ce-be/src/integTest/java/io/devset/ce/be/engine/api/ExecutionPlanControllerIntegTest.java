/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.config.DevsetCeBeApplication;
import io.devset.ce.be.kafka.application.DynamicKafkaProducerManager;
import io.devset.ce.be.rabbit.application.DynamicRabbitProducerManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
class ExecutionPlanControllerIntegTest {

    private static final Duration RUN_COMPLETION_TIMEOUT = Duration.ofSeconds(5);
    private static final long POLL_INTERVAL_MILLIS = 50L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DynamicKafkaProducerManager dynamicKafkaProducerManager;

    @MockitoBean
    private DynamicRabbitProducerManager dynamicRabbitProducerManager;

    @Test
    void shouldReturnRunsListing() throws Exception {
        mockMvc.perform(get("/api/engine/runs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").isArray())
                .andExpect(jsonPath("$.completed").isArray());
    }

    @Test
    void shouldSimulateWorkflow() throws Exception {
        Map<String, Object> request = workflowPayload();

        MvcResult result = mockMvc.perform(post("/api/engine/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode response = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals("SIMULATION", response.path("runId").asText());
        assertEquals("COMPLETED", response.path("status").asText());
        assertTrue(response.path("executionCount").asInt() > 0);
        assertTrue(response.path("executions").isArray());
        assertFalse(response.path("executions").isEmpty());
    }

    @Test
    void shouldExecuteWorkflowAndQueryRunStatus() throws Exception {
        Map<String, Object> request = workflowPayload();

        MvcResult submitResult = mockMvc.perform(post("/api/engine/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andReturn();

        JsonNode submitJson = objectMapper.readTree(submitResult.getResponse().getContentAsString());
        String runId = submitJson.path("runId").asText();
        assertFalse(runId.isBlank());
        assertEquals("PENDING", submitJson.path("status").asText());
        assertEquals(1, submitJson.path("executions").asInt());

        JsonNode completedRun = waitForRunStatus(runId, "COMPLETED", "FAILED");
        assertNotNull(completedRun);
        assertEquals(runId, completedRun.path("runId").asText());
    }

    @Test
    void shouldReturnRunEventsAfterExecution() throws Exception {
        Map<String, Object> request = workflowPayload();

        MvcResult submitResult = mockMvc.perform(post("/api/engine/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andReturn();

        JsonNode submitJson = objectMapper.readTree(submitResult.getResponse().getContentAsString());
        String runId = submitJson.path("runId").asText();

        waitForRunStatus(runId, "COMPLETED", "FAILED");

        MvcResult eventsResult = mockMvc.perform(get("/api/engine/runs/{runId}/events", runId))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode eventsResponse = objectMapper.readTree(eventsResult.getResponse().getContentAsString());
        assertEquals(runId, eventsResponse.path("runId").asText());
        assertTrue(eventsResponse.path("executions").isArray());
    }

    @Test
    void shouldReturn400WhenRunNotFound() throws Exception {
        mockMvc.perform(get("/api/engine/runs/{runId}", "non-existent-run-id"))
                .andExpect(status().isBadRequest());
    }

    private Map<String, Object> workflowPayload() {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", "integ-test-workflow");
        payload.put("messageType", "kafka");
        payload.put("contentType", "application/json");
        payload.put("producerName", "local");
        payload.put("topic", "devset.engine.it");
        payload.put("executions", 1);
        payload.put("state", Map.of("status", "OPEN"));
        payload.put("pipeline", List.of(Map.of(
                "stage", "init",
                "source", "none",
                "event", "entity-created",
                "emit", true,
                "headers", Map.of("eventType", "CREATED"),
                "set", Map.of("id", "test-id-1")
        )));
        return payload;
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
            for (String terminalStatus : terminalStatuses) {
                if (terminalStatus.equals(status)) {
                    return lastStatus;
                }
            }
            Thread.sleep(POLL_INTERVAL_MILLIS);
        }

        throw new AssertionError("Workflow run did not finish in time. Last status: " + lastStatus);
    }
}
