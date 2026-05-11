/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.protobuf.DescriptorProtos;
import com.google.protobuf.Descriptors;
import com.google.protobuf.DynamicMessage;
import io.devset.ce.be.config.DevsetCeBeApplication;
import io.devset.ce.be.kafka.application.DynamicKafkaProducerManager;
import io.devset.ce.be.rabbit.application.DynamicRabbitProducerManager;
import io.devset.ce.be.schema.infrastructure.protobuf.ProtoDescriptorUtils;
import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
class SingleStepControllerIntegTest {

    private static final Duration RUN_COMPLETION_TIMEOUT = Duration.ofSeconds(5);
    private static final long POLL_INTERVAL_MILLIS = 50L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DynamicKafkaProducerManager dynamicKafkaProducerManager;

    @MockitoBean
    private DynamicRabbitProducerManager dynamicRabbitProducerManager;

    @Test
    void shouldExecuteSingleStepAndExposeHistory() throws Exception {
        Map<String, Object> request = new LinkedHashMap<>();
        request.put("workflowId", "single-step-json-it");
        request.put("producerName", "local");
        request.put("topic", "devset.single.json.it");
        request.put("state", Map.of(
                "status", "OPEN",
                "value", Map.of("$fn", "int(1,10)")
        ));
        request.put("headers", Map.of("eventType", "SINGLE_STEP"));
        request.put("workflowState", Map.of("tenant", "acme"));

        MvcResult submitResult = mockMvc.perform(post("/api/single-step/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andReturn();

        JsonNode submitJson = objectMapper.readTree(submitResult.getResponse().getContentAsString());
        String runId = submitJson.path("runId").asText();
        assertFalse(runId.isBlank());
        assertFalse(submitJson.path("historyId").asText().isBlank());
        assertEquals("PENDING", submitJson.path("status").asText());
        assertEquals(1, submitJson.path("executions").asInt());

        JsonNode completedRun = waitForRunStatus(runId, "COMPLETED", "FAILED");
        assertEquals("COMPLETED", completedRun.path("status").asText());

        verify(dynamicKafkaProducerManager, timeout(1_000).times(1))
                .sendMessage(eq("local"), eq("devset.single.json.it"), any(), anyMap(), anyString());

        JsonNode history = fetchHistory();
        JsonNode entry = findHistoryByRunId(history, runId);
        assertNotNull(entry);
        assertEquals("single-step-json-it", entry.path("workflowId").asText());
        assertEquals("application/json", entry.path("contentType").asText());
        assertEquals("OPEN", entry.path("state").path("status").asText());
        assertEquals("int(1,10)", entry.path("state").path("value").path("$fn").asText());
        assertEquals("SINGLE_STEP", entry.path("headers").path("eventType").asText());
        assertEquals("acme", entry.path("workflowState").path("tenant").asText());
    }

    @Test
    void shouldExecuteSingleStepWithInlineProtobufSchemaAndStoreProtoInHistory() throws Exception {
        Assumptions.assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        String workflowId = "single-step-proto-it-" + UUID.randomUUID().toString().replace("-", "");
        String queueName = "single-step-proto-queue";
        String producerName = "rabbit-local";
        String protoSchema = """
                syntax = "proto3";

                package example;

                message UserEvent {
                  string userId = 1;
                  string action = 2;
                }
                """;

        Map<String, Object> request = new LinkedHashMap<>();
        request.put("workflowId", workflowId);
        request.put("messageType", "rabbit");
        request.put("contentType", "application/x-protobuf");
        request.put("producerName", producerName);
        request.put("topic", queueName);
        request.put("state", Map.of(
                "userId", "user-1",
                "action", "OPEN"
        ));
        request.put("protoSchema", protoSchema);

        MvcResult submitResult = mockMvc.perform(post("/api/single-step/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andReturn();

        JsonNode submitJson = objectMapper.readTree(submitResult.getResponse().getContentAsString());
        String runId = submitJson.path("runId").asText();
        assertFalse(runId.isBlank());
        assertEquals(protoSchema, submitJson.path("protoSchema").asText());

        JsonNode completedRun = waitForRunStatus(runId, "COMPLETED", "FAILED");
        assertEquals("COMPLETED", completedRun.path("status").asText());

        ArgumentCaptor<byte[]> payloadCaptor = ArgumentCaptor.forClass(byte[].class);
        verify(dynamicRabbitProducerManager, timeout(1_000).times(1)).sendBinaryMessage(
                eq(producerName),
                eq(queueName),
                isNull(),
                isNull(),
                payloadCaptor.capture(),
                eq("application/x-protobuf")
        );

        String descriptor = ProtoDescriptorUtils.generateDescriptorBase64(protoSchema);
        Descriptors.Descriptor messageDescriptor = messageDescriptor(descriptor);
        DynamicMessage event = DynamicMessage.parseFrom(messageDescriptor, payloadCaptor.getValue());
        assertEquals("user-1", event.getField(messageDescriptor.findFieldByName("userId")));
        assertEquals("OPEN", event.getField(messageDescriptor.findFieldByName("action")));

        JsonNode history = fetchHistory();
        JsonNode entry = findHistoryByRunId(history, runId);
        assertNotNull(entry);
        assertEquals(protoSchema, entry.path("protoSchema").asText());
        assertEquals("example.UserEvent", entry.path("protobufRootMessage").asText());
    }

    private JsonNode fetchHistory() throws Exception {
        return objectMapper.readTree(mockMvc.perform(get("/api/single-step/history"))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString());
    }

    private JsonNode findHistoryByRunId(JsonNode history, String runId) {
        for (JsonNode entry : history) {
            if (runId.equals(entry.path("runId").asText())) {
                return entry;
            }
        }
        return null;
    }

    private JsonNode waitForRunStatus(String runId, String... terminalStatuses) throws Exception {
        long deadline = System.nanoTime() + RUN_COMPLETION_TIMEOUT.toNanos();
        JsonNode lastStatus = null;

        while (System.nanoTime() < deadline) {
            MvcResult result = mockMvc.perform(get("/api/engine/runs/{runId}", runId))
                    .andExpect(status().isOk())
                    .andReturn();

            lastStatus = objectMapper.readTree(result.getResponse().getContentAsString());
            String status = lastStatus.path("status").asText();
            for (String terminalStatus : terminalStatuses) {
                if (terminalStatus.equals(status)) {
                    return lastStatus;
                }
            }
            Thread.sleep(POLL_INTERVAL_MILLIS);
        }

        throw new AssertionError("Workflow run did not finish in time. Last status: " + lastStatus);
    }

    private Descriptors.Descriptor messageDescriptor(String descriptor) throws Exception {
        DescriptorProtos.FileDescriptorSet descriptorSet = DescriptorProtos.FileDescriptorSet.parseFrom(
                Base64.getDecoder().decode(descriptor)
        );
        DescriptorProtos.FileDescriptorProto proto = descriptorSet.getFile(0);
        Descriptors.FileDescriptor fileDescriptor = Descriptors.FileDescriptor.buildFrom(
                proto,
                new Descriptors.FileDescriptor[0]
        );
        return fileDescriptor.findMessageTypeByName("UserEvent");
    }
}
