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

        JsonNode fetched = objectMapper.readTree(mockMvc.perform(get("/api/collection/{collectionName}", collectionName))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertEquals(collectionName, fetched.path("collectionName").asText());

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

    private boolean containsCollectionName(JsonNode entries, String collectionName) {
        for (JsonNode entry : entries) {
            if (collectionName.equals(entry.path("collectionName").asText())) {
                return true;
            }
        }
        return false;
    }
}
