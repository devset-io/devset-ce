/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.config.DevsetCeBeApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Integration test covering the full HTTP → JSON → JPA-converter → SQLite round-trip for the
 * message-dispatch workspace endpoints. The workspace is a single shared row, so each test seeds its
 * own state via {@code PUT} before asserting, making the tests order-independent.
 */
@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
class DispatchWorkspaceControllerIntegTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldRoundTripWorkspaceThroughPutAndGet() throws Exception {
        Map<String, Object> withHistory = tab("tab-1", "orders", "create-order", "hist-42", "Create order", 0);
        Map<String, Object> withoutHistory = tab("tab-2", "orders", "cancel-order", null, null, 1);
        Map<String, Object> workspace = new LinkedHashMap<>();
        workspace.put("activeTabId", "tab-2");
        workspace.put("tabs", List.of(withHistory, withoutHistory));

        JsonNode saved = objectMapper.readTree(mockMvc.perform(put("/api/dispatch-workspace")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(workspace)))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
        assertEquals("tab-2", saved.path("activeTabId").asText());
        assertEquals(2, saved.path("tabs").size());

        JsonNode fetched = objectMapper.readTree(mockMvc.perform(get("/api/dispatch-workspace"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertEquals("tab-2", fetched.path("activeTabId").asText());
        assertEquals(2, fetched.path("tabs").size());

        JsonNode firstTab = fetched.path("tabs").get(0);
        assertEquals("tab-1", firstTab.path("id").asText());
        assertEquals("orders", firstTab.path("collectionName").asText());
        assertEquals("create-order", firstTab.path("singleRequestName").asText());
        assertEquals("hist-42", firstTab.path("activeHistoryId").asText());
        assertEquals("Create order", firstTab.path("title").asText());
        assertEquals(0, firstTab.path("order").asInt());

        JsonNode secondTab = fetched.path("tabs").get(1);
        assertEquals("tab-2", secondTab.path("id").asText());
        assertEquals("cancel-order", secondTab.path("singleRequestName").asText());
        assertTrue(secondTab.path("activeHistoryId").isNull());
        assertTrue(secondTab.path("title").isNull());
        assertEquals(1, secondTab.path("order").asInt());
    }

    @Test
    void shouldReplaceWorkspaceWholesaleAndReturnEmptyWhenTabsCleared() throws Exception {
        Map<String, Object> seeded = new LinkedHashMap<>();
        seeded.put("activeTabId", "tab-1");
        seeded.put("tabs", List.of(tab("tab-1", "orders", "create-order", null, null, 0)));
        mockMvc.perform(put("/api/dispatch-workspace")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(seeded)))
                .andExpect(status().isOk());

        Map<String, Object> emptied = new LinkedHashMap<>();
        emptied.put("activeTabId", null);
        emptied.put("tabs", List.of());
        mockMvc.perform(put("/api/dispatch-workspace")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(emptied)))
                .andExpect(status().isOk());

        JsonNode fetched = objectMapper.readTree(mockMvc.perform(get("/api/dispatch-workspace"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertTrue(fetched.path("activeTabId").isNull());
        assertTrue(fetched.path("tabs").isArray());
        assertEquals(0, fetched.path("tabs").size());
    }

    private Map<String, Object> tab(
            String id,
            String collectionName,
            String singleRequestName,
            String activeHistoryId,
            String title,
            int order) {
        Map<String, Object> tab = new LinkedHashMap<>();
        tab.put("id", id);
        tab.put("collectionName", collectionName);
        tab.put("singleRequestName", singleRequestName);
        tab.put("activeHistoryId", activeHistoryId);
        tab.put("title", title);
        tab.put("order", order);
        return tab;
    }
}
