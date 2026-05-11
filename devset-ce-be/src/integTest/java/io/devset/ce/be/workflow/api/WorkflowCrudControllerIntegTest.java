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
import io.devset.ce.be.config.DevsetCeBeApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
class WorkflowCrudControllerIntegTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldCreateWorkflow() throws Exception {
        String workflowId = "workflow-" + UUID.randomUUID().toString().replace("-", "");
        Map<String, Object> request = workflowPayload(workflowId, "kafka-topic-create");

        MvcResult result = mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode created = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(workflowId, created.path("id").asText());
        assertEquals("kafka-topic-create", created.path("topic").asText());
    }

    @Test
    void shouldGetWorkflowById() throws Exception {
        String workflowId = "workflow-" + UUID.randomUUID().toString().replace("-", "");
        mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workflowPayload(workflowId, "kafka-topic-get"))))
                .andExpect(status().isCreated());

        JsonNode fetched = objectMapper.readTree(mockMvc.perform(get("/api/workflows/{workflowId}", workflowId))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertEquals(workflowId, fetched.path("id").asText());
        assertEquals("kafka-topic-get", fetched.path("topic").asText());
    }

    @Test
    void shouldGetAllWorkflows() throws Exception {
        String workflowId = "workflow-" + UUID.randomUUID().toString().replace("-", "");
        mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workflowPayload(workflowId, "kafka-topic-all"))))
                .andExpect(status().isCreated());

        JsonNode all = objectMapper.readTree(mockMvc.perform(get("/api/workflows"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertTrue(containsWorkflowId(all, workflowId));
    }

    @Test
    void shouldUpdateWorkflow() throws Exception {
        String workflowId = "workflow-" + UUID.randomUUID().toString().replace("-", "");
        mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workflowPayload(workflowId, "original-topic"))))
                .andExpect(status().isCreated());

        Map<String, Object> updated = workflowPayload(workflowId, "updated-topic");
        JsonNode response = objectMapper.readTree(mockMvc.perform(put("/api/workflows/{workflowId}", workflowId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updated)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertEquals("updated-topic", response.path("topic").asText());
    }

    @Test
    void shouldDeleteWorkflow() throws Exception {
        String workflowId = "workflow-" + UUID.randomUUID().toString().replace("-", "");
        mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workflowPayload(workflowId, "kafka-topic-delete"))))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/workflows/{workflowId}", workflowId))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/workflows/{workflowId}", workflowId))
                .andExpect(status().isBadRequest());
    }

    private Map<String, Object> workflowPayload(String id, String topic) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", id);
        payload.put("messageType", "kafka");
        payload.put("contentType", "application/json");
        payload.put("producerName", "local");
        payload.put("topic", topic);
        payload.put("executions", 1);
        payload.put("state", Map.of("status", "OPEN"));
        payload.put("pipeline", List.of(Map.of(
                "stage", "open",
                "event", "entity-opened",
                "source", "none",
                "emit", true,
                "headers", Map.of("eventType", "OPENED"),
                "set", Map.of("id", Map.of("$fn", "uuid()"))
        )));
        return payload;
    }

    private boolean containsWorkflowId(JsonNode entries, String workflowId) {
        for (JsonNode entry : entries) {
            if (workflowId.equals(entry.path("id").asText())) {
                return true;
            }
        }
        return false;
    }
}
