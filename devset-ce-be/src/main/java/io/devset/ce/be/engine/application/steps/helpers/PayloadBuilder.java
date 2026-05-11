/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.helpers;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.protobuf.Descriptors;
import com.google.protobuf.DynamicMessage;
import com.google.protobuf.InvalidProtocolBufferException;
import com.google.protobuf.util.JsonFormat;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.schema.application.ProtobufDescriptorService;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * Builds serialized payloads for execution plan steps.
 * <p>
 * Supports JSON serialization via Jackson and protobuf binary serialization
 * via the {@link ProtobufDescriptorService}.
 */
@Component
@RequiredArgsConstructor
public final class PayloadBuilder {

    private final ObjectMapper objectMapper;
    private final ProtobufDescriptorService protobufDescriptorService;

    /**
     * Serializes a value to a JSON string.
     *
     * @param value  the value to serialize
     * @param stepId step identifier used in error messages
     * @return JSON string representation
     */
    public String toJson(
            Object value,
            String stepId
    ) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new WorkflowEngineException("Failed to serialize payload for step: " + stepId);
        }
    }

    /**
     * Serializes a value to protobuf binary bytes using the provided schema descriptor.
     *
     * @param value               the value to serialize
     * @param schemaDescriptor    Base64-encoded protobuf FileDescriptorSet
     * @param protobufRootMessage optional root message name
     * @param stepId              step identifier used in error messages
     * @return protobuf binary representation
     */
    public byte[] toProtobufBytes(
            Object value,
            @Nullable String schemaDescriptor,
            @Nullable String protobufRootMessage,
            String stepId
    ) {
        if (schemaDescriptor == null || schemaDescriptor.isBlank()) {
            throw new WorkflowEngineException("Missing config 'schemaDescriptor' for protobuf send step: " + stepId);
        }

        Descriptors.Descriptor descriptorMessage = protobufDescriptorService.resolveTopLevelMessageDescriptor(
                schemaDescriptor,
                protobufRootMessage,
                stepId
        );
        String payloadJson = toJson(value, stepId);
        try {
            DynamicMessage.Builder output = DynamicMessage.newBuilder(descriptorMessage);
            JsonFormat.parser().merge(payloadJson, output);
            return output.build().toByteArray();
        } catch (InvalidProtocolBufferException exception) {
            throw new WorkflowEngineException(
                    "Failed to map payload to protobuf message '" + descriptorMessage.getFullName() + "' for step: " + stepId
            );
        }
    }

}
