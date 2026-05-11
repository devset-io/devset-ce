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

import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.config.DevsetCeBeApplication;
import io.devset.ce.be.rabbit.application.DynamicRabbitProducerManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.LinkedHashMap;
import java.util.Map;

import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
class RabbitSendMessageIntegTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DynamicRabbitProducerManager dynamicRabbitProducerManager;

    @Test
    void shouldSendMessageToRabbit() throws Exception {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("producerName", "local-rabbit");
        request.put("queueName", "devset.rabbit.it");
        request.put("exchange", null);
        request.put("routingKey", null);
        request.put("message", "{\"id\":1}");

        mockMvc.perform(post("/api/rabbit/message/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(dynamicRabbitProducerManager).sendMessage(
                "local-rabbit",
                "devset.rabbit.it",
                null,
                null,
                "{\"id\":1}"
        );
    }
}
