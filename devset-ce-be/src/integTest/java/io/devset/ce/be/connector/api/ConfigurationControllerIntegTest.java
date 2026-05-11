/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.connector.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.config.DevsetCeBeApplication;
import io.devset.ce.be.kafka.application.DynamicKafkaProducerManager;
import io.devset.ce.be.kafka.application.dto.KafkaConnectionStatusDto;
import io.devset.ce.be.rabbit.application.DynamicRabbitProducerManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
class ConfigurationControllerIntegTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DynamicKafkaProducerManager dynamicKafkaProducerManager;

    @MockitoBean
    private DynamicRabbitProducerManager dynamicRabbitProducerManager;

    @Test
    void shouldTestConnection() throws Exception {
        mockMvc.perform(post("/api/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "kafka",
                                  "name": "local-kafka",
                                  "bootstrapServers": "localhost:9092",
                                  "username": null,
                                  "password": null
                                }
                                """))
                .andExpect(status().isOk());

        verify(dynamicKafkaProducerManager).connect("local-kafka", "localhost:9092", null, null);
    }

    @Test
    void shouldGetConnectionStatus() throws Exception {
        when(dynamicKafkaProducerManager.listConnections()).thenReturn(
                List.of(new KafkaConnectionStatusDto("local-kafka", "localhost:9092", true, false, false))
        );
        when(dynamicRabbitProducerManager.listConnections()).thenReturn(List.of());

        MvcResult result = mockMvc.perform(get("/api/connectors/configurations"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode connections = objectMapper.readTree(result.getResponse().getContentAsString());
        assertTrue(connections.isArray());
        boolean hasKafka = false;
        for (JsonNode connection : connections) {
            if ("local-kafka".equals(connection.path("name").asText())
                    && "kafka".equals(connection.path("type").asText())) {
                hasKafka = true;
                break;
            }
        }
        assertTrue(hasKafka, "Listing must include the registered Kafka connection");
    }

    @Test
    void shouldDeleteConnection() throws Exception {
        mockMvc.perform(delete("/api/connectors/configurations/{type}/{name}", "kafka", "local-kafka"))
                .andExpect(status().isOk());

        verify(dynamicKafkaProducerManager).remove("local-kafka");
    }
}
