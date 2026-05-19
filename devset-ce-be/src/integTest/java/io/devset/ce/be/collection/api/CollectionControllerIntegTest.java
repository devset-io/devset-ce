/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.collection.api;

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
class CollectionControllerIntegTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldCreateGetAndRemoveCollection() throws Exception {
        String collectionName = "single-message-collection-" + UUID.randomUUID().toString().replace("-", "");

        Map<String, Object> createRequest = new LinkedHashMap<>();
        createRequest.put("collectionName", collectionName);

        MvcResult createdResult = mockMvc.perform(post("/api/collection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode created = objectMapper.readTree(createdResult.getResponse().getContentAsString());
        assertEquals(collectionName, created.path("collectionName").asText());
        assertTrue(created.path("collectionContext").isObject());
        assertEquals(0, created.path("collectionContext").size());

        JsonNode fetched = objectMapper.readTree(mockMvc.perform(get("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertEquals(collectionName, fetched.path("collectionName").asText());
        assertTrue(fetched.path("collectionContext").isObject());
        assertEquals(0, fetched.path("collectionContext").size());

        JsonNode allCollections = objectMapper.readTree(mockMvc.perform(get("/api/collection"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertTrue(containsCollectionName(allCollections, collectionName));

        mockMvc.perform(delete("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isNoContent());

        MvcResult notFoundResult = mockMvc.perform(get("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isBadRequest())
                .andReturn();

        JsonNode error = objectMapper.readTree(notFoundResult.getResponse().getContentAsString());
        assertNotNull(error.path("message").asText());
        assertTrue(error.path("message").asText().contains("Collection not found"));
    }

    @Test
    void shouldPersistAndReturnCollectionContext() throws Exception {
        String collectionName = "single-message-collection-" + UUID.randomUUID().toString().replace("-", "");

        Map<String, Object> collectionContext = new LinkedHashMap<>();
        collectionContext.put("userName", "alice");
        collectionContext.put("retries", 3);

        Map<String, Object> collectionRequest = new LinkedHashMap<>();
        collectionRequest.put("collectionName", collectionName);
        collectionRequest.put("collectionContext", collectionContext);

        mockMvc.perform(post("/api/collection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(collectionRequest)))
                .andExpect(status().isCreated());

        JsonNode fetched = objectMapper.readTree(mockMvc.perform(get("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertEquals("alice", fetched.path("collectionContext").path("userName").asText());
        assertEquals(3, fetched.path("collectionContext").path("retries").asInt());

        mockMvc.perform(delete("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isNoContent());
    }
    
    @Test
    void shouldUpdateCollectionContext() throws Exception {
        String collectionName = "single-message-collection-" + UUID.randomUUID().toString().replace("-", "");

        Map<String, Object> initialContext = new LinkedHashMap<>();
        initialContext.put("userName", "alice");

        Map<String, Object> createRequest = new LinkedHashMap<>();
        createRequest.put("collectionName", collectionName);
        createRequest.put("collectionContext", initialContext);

        mockMvc.perform(post("/api/collection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated());

        Map<String, Object> updatedContext = new LinkedHashMap<>();
        updatedContext.put("userName", "bob");
        updatedContext.put("retries", 5);

        Map<String, Object> patchRequest = new LinkedHashMap<>();
        patchRequest.put("collectionContext", updatedContext);

        MvcResult patchedResult = mockMvc.perform(patch("/api/collection/{collectionName}", collectionName)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patchRequest)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode patched = objectMapper.readTree(patchedResult.getResponse().getContentAsString());
        assertEquals(collectionName, patched.path("collectionName").asText());
        assertEquals("bob", patched.path("collectionContext").path("userName").asText());
        assertEquals(5, patched.path("collectionContext").path("retries").asInt());

        JsonNode fetched = objectMapper.readTree(mockMvc.perform(get("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertEquals("bob", fetched.path("collectionContext").path("userName").asText());
        assertEquals(5, fetched.path("collectionContext").path("retries").asInt());

        mockMvc.perform(delete("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldDefaultEmptyMapWhenPatchOmitsCollectionContext() throws Exception {
        String collectionName = "single-message-collection-" + UUID.randomUUID().toString().replace("-", "");

        Map<String, Object> initialContext = new LinkedHashMap<>();
        initialContext.put("userName", "alice");

        Map<String, Object> createRequest = new LinkedHashMap<>();
        createRequest.put("collectionName", collectionName);
        createRequest.put("collectionContext", initialContext);

        mockMvc.perform(post("/api/collection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated());

        MvcResult patchedResult = mockMvc.perform(patch("/api/collection/{collectionName}", collectionName)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode patched = objectMapper.readTree(patchedResult.getResponse().getContentAsString());
        assertTrue(patched.path("collectionContext").isObject());
        assertEquals(0, patched.path("collectionContext").size());

        JsonNode fetched = objectMapper.readTree(mockMvc.perform(get("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertTrue(fetched.path("collectionContext").isObject());
        assertEquals(0, fetched.path("collectionContext").size());

        mockMvc.perform(delete("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldDefaultEmptyMapWhenPatchSendsNullCollectionContext() throws Exception {
        String collectionName = "single-message-collection-" + UUID.randomUUID().toString().replace("-", "");

        Map<String, Object> initialContext = new LinkedHashMap<>();
        initialContext.put("userName", "alice");

        Map<String, Object> createRequest = new LinkedHashMap<>();
        createRequest.put("collectionName", collectionName);
        createRequest.put("collectionContext", initialContext);

        mockMvc.perform(post("/api/collection")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createRequest)))
                .andExpect(status().isCreated());

        MvcResult patchedResult = mockMvc.perform(patch("/api/collection/{collectionName}", collectionName)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"collectionContext\": null}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode patched = objectMapper.readTree(patchedResult.getResponse().getContentAsString());
        assertTrue(patched.path("collectionContext").isObject());
        assertEquals(0, patched.path("collectionContext").size());

        JsonNode fetched = objectMapper.readTree(mockMvc.perform(get("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertTrue(fetched.path("collectionContext").isObject());
        assertEquals(0, fetched.path("collectionContext").size());

        mockMvc.perform(delete("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldRejectUpdateForMissingCollection() throws Exception {
        String collectionName = "missing-collection-" + UUID.randomUUID().toString().replace("-", "");

        Map<String, Object> patchRequest = new LinkedHashMap<>();
        patchRequest.put("collectionContext", Map.of("k", "v"));

        MvcResult result = mockMvc.perform(patch("/api/collection/{collectionName}", collectionName)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(patchRequest)))
                .andExpect(status().isBadRequest())
                .andReturn();

        JsonNode error = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(error.path("message").asText().contains("Collection not found"));
    }

    private boolean containsCollectionName(JsonNode entries, String collectionName) {
        for (JsonNode entry : entries) {
            if (collectionName.equals(entry.path("collectionName").asText())) {
                return true;
            }
        }
        return false;
    }
}
