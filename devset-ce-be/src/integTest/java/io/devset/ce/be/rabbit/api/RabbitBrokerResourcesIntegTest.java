/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.rabbit.api;

import io.devset.ce.be.config.DevsetCeBeApplication;
import io.devset.ce.be.rabbit.application.DynamicRabbitProducerManager;
import io.devset.ce.be.rabbit.application.dto.RabbitBrokerResourcesDto;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
class RabbitBrokerResourcesIntegTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DynamicRabbitProducerManager dynamicRabbitProducerManager;

    @Test
    void shouldReturnBrokerResourcesWhenAvailable() throws Exception {
        when(dynamicRabbitProducerManager.listBrokerResources("local-rabbit"))
                .thenReturn(new RabbitBrokerResourcesDto(true, List.of("q1", "q2"), List.of("amq.direct")));

        mockMvc.perform(get("/api/rabbit/broker-resources")
                        .param("connectionName", "local-rabbit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(true))
                .andExpect(jsonPath("$.queues.length()").value(2))
                .andExpect(jsonPath("$.queues[0]").value("q1"))
                .andExpect(jsonPath("$.exchanges[0]").value("amq.direct"));
    }

    @Test
    void shouldReturnUnavailableWhenManagementPluginMissing() throws Exception {
        when(dynamicRabbitProducerManager.listBrokerResources("local-rabbit"))
                .thenReturn(RabbitBrokerResourcesDto.unavailable());

        mockMvc.perform(get("/api/rabbit/broker-resources")
                        .param("connectionName", "local-rabbit"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.available").value(false))
                .andExpect(jsonPath("$.queues").isEmpty())
                .andExpect(jsonPath("$.exchanges").isEmpty());
    }

    @Test
    void shouldReturnErrorWhenConnectionNotFound() throws Exception {
        when(dynamicRabbitProducerManager.listBrokerResources("missing"))
                .thenThrow(new WorkflowEngineException("RabbitMQ connector not found: missing"));

        mockMvc.perform(get("/api/rabbit/broker-resources")
                        .param("connectionName", "missing"))
                .andExpect(status().isBadRequest());
    }
}
