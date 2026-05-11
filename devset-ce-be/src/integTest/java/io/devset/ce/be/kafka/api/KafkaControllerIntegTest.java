/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.kafka.api;

import io.devset.ce.be.config.DevsetCeBeApplication;
import io.devset.ce.be.rabbit.application.DynamicRabbitProducerManager;
import org.apache.kafka.clients.admin.AdminClient;
import org.apache.kafka.clients.admin.AdminClientConfig;
import org.apache.kafka.clients.admin.NewTopic;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.KafkaContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
@Testcontainers
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class KafkaControllerIntegTest {

    @Container
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("confluentinc/cp-kafka:7.6.0"));

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private DynamicRabbitProducerManager dynamicRabbitProducerManager;

    @BeforeAll
    static void createTopics() throws Exception {
        try (AdminClient admin = AdminClient.create(Map.of(
                AdminClientConfig.BOOTSTRAP_SERVERS_CONFIG, kafka.getBootstrapServers()
        ))) {
            admin.createTopics(List.of(
                    new NewTopic("orders-topic", 1, (short) 1),
                    new NewTopic("payments-topic", 1, (short) 1)
            )).all().get();
        }
    }

    @Test
    @Order(1)
    void shouldRegisterKafkaConnection() throws Exception {
        mockMvc.perform(post("/api/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "type": "kafka",
                                  "name": "test-kafka",
                                  "bootstrapServers": "%s",
                                  "username": null,
                                  "password": null
                                }
                                """.formatted(kafka.getBootstrapServers())))
                .andExpect(status().isOk());
    }

    @Test
    @Order(2)
    void shouldListTopicsFromBroker() throws Exception {
        mockMvc.perform(get("/api/kafka/topics")
                        .param("connectionName", "test-kafka"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[?(@ == 'orders-topic')]").exists())
                .andExpect(jsonPath("$[?(@ == 'payments-topic')]").exists());
    }

    @Test
    @Order(3)
    void shouldSendMessageAndFetchIt() throws Exception {
        mockMvc.perform(post("/api/kafka/messages/send")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "producerName": "test-kafka",
                                  "topic": "orders-topic",
                                  "headers": {"eventType": "ORDER_CREATED"},
                                  "message": "{\\"orderId\\":123}"
                                }
                                """))
                .andExpect(status().isOk());

        // Small delay for Kafka to commit the message
        Thread.sleep(1000);

        mockMvc.perform(get("/api/kafka/messages")
                        .param("connectionName", "test-kafka")
                        .param("topic", "orders-topic")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].value").value("{\"orderId\":123}"))
                .andExpect(jsonPath("$[0].headers.eventType").value("ORDER_CREATED"));
    }

    @Test
    @Order(4)
    void shouldReturnEmptyListWhenTopicHasNoMessages() throws Exception {
        mockMvc.perform(get("/api/kafka/messages")
                        .param("connectionName", "test-kafka")
                        .param("topic", "payments-topic")
                        .param("limit", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void shouldReturn400WhenConnectionNameMissingForTopics() throws Exception {
        mockMvc.perform(get("/api/kafka/topics"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldReturn400WhenConnectionNameMissingForMessages() throws Exception {
        mockMvc.perform(get("/api/kafka/messages")
                        .param("topic", "test-topic"))
                .andExpect(status().isBadRequest());
    }
}
