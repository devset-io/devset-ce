/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.api;

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
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
class SchemaControllerIntegTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldCreateSchema() throws Exception {
        String schemaId = "schema-" + UUID.randomUUID().toString().replace("-", "");
        Map<String, Object> request = jsonSchemaPayload(schemaId, 1);

        MvcResult result = mockMvc.perform(post("/api/schemas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode created = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(schemaId, created.path("id").asText());
        assertEquals("json", created.path("type").asText());
    }

    @Test
    void shouldCreateSchemaByPath() throws Exception {
        String schemaId = "schema-" + UUID.randomUUID().toString().replace("-", "");
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("type", "json");
        request.put("schema", Map.of("type", "object"));
        request.put("descriptor", null);
        request.put("protobufRootMessage", null);

        MvcResult result = mockMvc.perform(post("/api/schemas/{schemaId}", schemaId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode created = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(schemaId, created.path("id").asText());
    }

    @Test
    void shouldReplaceSchema() throws Exception {
        String schemaId = "schema-" + UUID.randomUUID().toString().replace("-", "");
        mockMvc.perform(post("/api/schemas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(jsonSchemaPayload(schemaId, 1))))
                .andExpect(status().isCreated());

        Map<String, Object> replacement = jsonSchemaPayload(schemaId, 1);
        MvcResult result = mockMvc.perform(put("/api/schemas/{schemaId}", schemaId)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(replacement)))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode replaced = objectMapper.readTree(result.getResponse().getContentAsString());
        assertEquals(schemaId, replaced.path("id").asText());
        assertTrue(replaced.path("version").asInt() >= 1,
                "Replaced schema must carry a positive version");
    }

    @Test
    void shouldDeleteSchema() throws Exception {
        String schemaId = "schema-" + UUID.randomUUID().toString().replace("-", "");
        mockMvc.perform(post("/api/schemas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(jsonSchemaPayload(schemaId, 1))))
                .andExpect(status().isCreated());

        mockMvc.perform(delete("/api/schemas/{schemaId}", schemaId))
                .andExpect(status().isNoContent());
    }

    @Test
    void shouldFindAllSchemas() throws Exception {
        String schemaId = "schema-" + UUID.randomUUID().toString().replace("-", "");
        mockMvc.perform(post("/api/schemas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(jsonSchemaPayload(schemaId, 1))))
                .andExpect(status().isCreated());

        JsonNode all = objectMapper.readTree(mockMvc.perform(get("/api/schemas"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());

        assertTrue(containsSchemaId(all, schemaId));
    }

    private Map<String, Object> jsonSchemaPayload(String id, Integer version) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("id", id);
        payload.put("version", version);
        payload.put("type", "json");
        payload.put("schema", Map.of("type", "object", "properties", Map.of("name", Map.of("type", "string"))));
        payload.put("descriptor", null);
        payload.put("protobufRootMessage", null);
        return payload;
    }

    private boolean containsSchemaId(JsonNode entries, String schemaId) {
        for (JsonNode entry : entries) {
            if (schemaId.equals(entry.path("id").asText())) {
                return true;
            }
        }
        return false;
    }
}
