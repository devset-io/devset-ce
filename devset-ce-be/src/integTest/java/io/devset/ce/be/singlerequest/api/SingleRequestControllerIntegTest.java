/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlerequest.api;

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
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
class SingleRequestControllerIntegTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldCreateSingleRequestInsideCollectionAndApplyDefaults() throws Exception {
        String collectionName = "collection-" + UUID.randomUUID().toString().replace("-", "");
        String singleRequestName = "single-request-" + UUID.randomUUID().toString().replace("-", "");

        mockMvc.perform(post("/api/collection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("collectionName", collectionName))))
                .andExpect(status().isCreated());

        Map<String, Object> saveRequest = baseRequest(singleRequestName, collectionName);
        MvcResult savedResult = mockMvc.perform(post("/api/single-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(saveRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode saved = objectMapper.readTree(savedResult.getResponse().getContentAsString());
        assertEquals(singleRequestName, saved.path("singleRequestName").asText());
        assertEquals(collectionName, saved.path("collectionName").asText());
        assertEquals("single-step", saved.path("stage").asText());
        assertEquals("single-step-event", saved.path("event").asText());

        JsonNode fetched = objectMapper.readTree(mockMvc.perform(get("/api/single-requests/{singleRequestName}", singleRequestName))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertEquals(singleRequestName, fetched.path("singleRequestName").asText());
        assertEquals(collectionName, fetched.path("collectionName").asText());

        Map<String, Object> patchRequest = baseRequest(singleRequestName, collectionName);
        patchRequest.put("topic", "devset.single.request.patched");

        JsonNode patched = objectMapper.readTree(mockMvc.perform(patch("/api/single-requests/{singleRequestName}", singleRequestName)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patchRequest)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertEquals("devset.single.request.patched", patched.path("topic").asText());

        MvcResult blockedRemoveCollection = mockMvc.perform(delete("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isBadRequest())
                .andReturn();
        JsonNode blockedError = objectMapper.readTree(blockedRemoveCollection.getResponse().getContentAsString());
        assertNotNull(blockedError.path("message").asText());
        assertTrue(blockedError.path("message").asText().contains("cannot be removed"));

        mockMvc.perform(delete("/api/single-requests/{singleRequestName}", singleRequestName))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldAllowSavingRabbitDraftWithoutDestination() throws Exception {
        String collectionName = "collection-" + UUID.randomUUID().toString().replace("-", "");
        String singleRequestName = "single-request-" + UUID.randomUUID().toString().replace("-", "");

        mockMvc.perform(post("/api/collection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("collectionName", collectionName))))
                .andExpect(status().isCreated());

        Map<String, Object> draftRequest = new LinkedHashMap<>();
        draftRequest.put("singleRequestName", singleRequestName);
        draftRequest.put("collectionName", collectionName);
        draftRequest.put("messageType", "rabbit");

        MvcResult savedResult = mockMvc.perform(post("/api/single-requests")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(draftRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode saved = objectMapper.readTree(savedResult.getResponse().getContentAsString());
        assertEquals(singleRequestName, saved.path("singleRequestName").asText());
        assertEquals(collectionName, saved.path("collectionName").asText());
        assertTrue(saved.path("topic").isNull());
        assertTrue(saved.path("routingKey").isNull());
        assertTrue(saved.path("exchange").isNull());
    }

    private Map<String, Object> baseRequest(String singleRequestName, String collectionName) {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("singleRequestName", singleRequestName);
        request.put("collectionName", collectionName);
        request.put("messageType", "kafka");
        request.put("contentType", "application/json");
        request.put("producerName", "local");
        request.put("topic", "devset.single.request.topic");
        request.put("exchange", null);
        request.put("routingKey", null);
        request.put("executions", 1);
        request.put("stage", null);
        request.put("event", null);
        request.put("state", Map.of("status", "OPEN"));
        request.put("headers", Map.of("eventType", "SINGLE_DISPATCH"));
        request.put("wireFormat", Map.of("type", "none"));
        request.put("workflowState", Map.of("tenant", "acme"));
        request.put("protoSchema", null);
        return request;
    }
}
