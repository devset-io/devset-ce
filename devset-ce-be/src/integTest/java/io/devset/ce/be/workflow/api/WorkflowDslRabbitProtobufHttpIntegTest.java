/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.protobuf.DescriptorProtos;
import com.google.protobuf.Descriptors;
import com.google.protobuf.DynamicMessage;
import io.devset.ce.be.config.DevsetCeBeApplication;
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
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = DevsetCeBeApplication.class)
@AutoConfigureMockMvc
class WorkflowDslRabbitProtobufHttpIntegTest {

    private static final Duration RUN_COMPLETION_TIMEOUT = Duration.ofSeconds(5);
    private static final long POLL_INTERVAL_MILLIS = 50L;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private DynamicRabbitProducerManager dynamicRabbitProducerManager;

    @Test
    void shouldStoreSchemaAndSendProtobufPayloadToRabbitFromDslExecution() throws Exception {
        Assumptions.assumeTrue(ProtoDescriptorUtils.isProtocAvailable());
        String input = UUID.randomUUID().toString().replace("-", "");
        String schemaId = "schema-rabbit-proto-" + input;
        String workflowId = "workflow-rabbit-proto-" + input;
        String producerName = "rabbit-connection-" + input;
        String queueName = "queue-rabbit-proto-" + input;
        String schema = """
                syntax = "proto3";

                package example;

                message UserEvent {
                  string userId = 1;
                  string action = 2;
                }
                """;

        Map<String, Object> object = new LinkedHashMap<>();
        object.put("id", schemaId);
        object.put("type", "protobuf");
        object.put("schema", schema);
        MvcResult createSchemaResult = mockMvc.perform(post("/api/schemas")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(object)))
                .andExpect(status().isCreated())
                .andReturn();
        JsonNode createdSchema = objectMapper.readTree(createSchemaResult.getResponse().getContentAsString());
        String descriptor = createdSchema.path("descriptor").asText();
        assertFalse(descriptor.isBlank());

        object = new LinkedHashMap<>();
        object.put("type", "rabbit");
        object.put("name", producerName);
        object.put("host", "localhost");
        object.put("port", 5672);
        object.put("virtualHost", "/");
        mockMvc.perform(post("/api/connectors/configurations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(object)))
                .andExpect(status().isOk());

        verify(dynamicRabbitProducerManager).connect(
                eq(producerName),
                eq("localhost"),
                eq(5672),
                eq("/"),
                isNull(),
                isNull()
        );

        MvcResult result = mockMvc.perform(post("/api/engine/execute")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "id": "%s",
                                  "messageType": "rabbit",
                                  "contentType": "application/x-protobuf",
                                  "producerName": "%s",
                                  "topic": "%s",
                                  "executions": 1,
                                  "pipeline": [
                                    {
                                      "stage": "open",
                                      "event": "user-opened",
                                      "source": "none",
                                      "emit": true,
                                      "schemaId": "%s",
                                      "set": {
                                        "userId": "user-1",
                                        "action": "OPEN"
                                      }
                                    }
                                  ]
                                }
                                """.formatted(workflowId, producerName, queueName, schemaId)))
                .andExpect(status().isAccepted())
                .andReturn();

        JsonNode state = objectMapper.readTree(result.getResponse().getContentAsString());
        String runId = state.path("runId").asText();
        assertNotNull(runId);

        JsonNode output = waitForRunStatus(runId, "COMPLETED", "FAILED");
        assertEquals("COMPLETED", output.path("status").asText());
        assertEquals(1, output.path("completedExecutions").asInt());
        assertEquals(0, output.path("failedExecutions").asInt());

        ArgumentCaptor<byte[]> value = ArgumentCaptor.forClass(byte[].class);
        verify(dynamicRabbitProducerManager, timeout(1_000).times(1)).sendBinaryMessage(
                eq(producerName),
                eq(queueName),
                isNull(),
                isNull(),
                value.capture(),
                eq("application/x-protobuf")
        );

        Descriptors.Descriptor response = messageDescriptor(descriptor);
        DynamicMessage entity = DynamicMessage.parseFrom(response, value.getValue());
        assertEquals("user-1", entity.getField(response.findFieldByName("userId")));
        assertEquals("OPEN", entity.getField(response.findFieldByName("action")));
    }

    private JsonNode waitForRunStatus(String runId, String... terminalStatuses) throws Exception {
        long deadline = System.nanoTime() + RUN_COMPLETION_TIMEOUT.toNanos();
        JsonNode object = null;

        while (System.nanoTime() < deadline) {
            MvcResult input = mockMvc.perform(get("/api/engine/runs/{runId}", runId))
                    .andExpect(status().isOk())
                    .andReturn();

            object = objectMapper.readTree(input.getResponse().getContentAsString());
            String output = object.path("status").asText();
            for (String state : terminalStatuses) {
                if (state.equals(output)) {
                    return object;
                }
            }

            Thread.sleep(POLL_INTERVAL_MILLIS);
        }

        throw new AssertionError("Workflow run did not finish in time. Last status: " + object);
    }

    private Descriptors.Descriptor messageDescriptor(String descriptor) throws Exception {
        DescriptorProtos.FileDescriptorSet object = DescriptorProtos.FileDescriptorSet.parseFrom(
                Base64.getDecoder().decode(descriptor)
        );
        DescriptorProtos.FileDescriptorProto input = object.getFile(0);
        Descriptors.FileDescriptor output = Descriptors.FileDescriptor.buildFrom(
                input,
                new Descriptors.FileDescriptor[0]
        );
        return output.findMessageTypeByName("UserEvent");
    }
}
