/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.impl;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;
import io.devset.ce.be.engine.application.steps.helpers.ConditionEvaluator;
import io.devset.ce.be.engine.application.steps.helpers.PayloadBuilder;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Handles {@code wire-format} steps that prepend a binary prefix to a protobuf payload.
 * <p>
 * Currently supports only the {@code binary-prefix} type with a 2-byte big-endian prefix.
 * The prefix value is derived either from the message type or from an explicit config value.
 */
@Component
@RequiredArgsConstructor
public final class WireFormatStepHandler implements ExecutionPlanStepHandler {

    private static final String TYPE = "type";
    private static final String SIZE = "size";
    private static final String SOURCE = "source";
    private static final String PREFIX_VALUE = "prefixValue";
    private static final String BINARY_PREFIX = "binary-prefix";
    private static final String SOURCE_MESSAGE_PREFIX = "messagePrefix";
    private static final String DEFAULT_SOURCE_PATH = ExecutionStateKeys.LAST_APPENDED_EVENT_PREFIX + "payload";

    private final StepSupport stepSupport;
    private final PayloadBuilder payloadBuilder;
    private final ConditionEvaluator conditionEvaluator;

    @Override
    public StepType supports() {
        return StepType.WIRE_FORMAT;
    }

    @Override
    public void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context) {
        if (step.config().containsKey(CONDITION) && !conditionEvaluator.matches(step.config(), context, step.id())) {
            return;
        }

        String type = stepSupport.requiredText(step, TYPE);
        if (!BINARY_PREFIX.equals(type)) {
            throw new WorkflowEngineException("Unsupported wire format for step: " + step.id() + " -> " + type);
        }
        int size = stepSupport.intConfig(step, SIZE);
        if (size != 2) {
            throw new WorkflowEngineException("Only 2-byte prefix is supported for step: " + step.id());
        }
        String source = stepSupport.requiredText(step, SOURCE);
        WorkflowContentType contentType = WorkflowContentType.from(stepSupport.requiredText(step, CONTENT_TYPE));
        if (contentType != WorkflowContentType.PROTOBUF) {
            throw new WorkflowEngineException("wire-format requires protobuf contentType for step: " + step.id());
        }
        int prefix = resolvePrefix(step, source);
        String sourcePath = String.valueOf(step.config().getOrDefault(SOURCE_PATH, DEFAULT_SOURCE_PATH));
        String targetPath = String.valueOf(step.config().getOrDefault(TARGET_PATH, sourcePath));
        Object payload = context.state().get(sourcePath);
        String schemaDescriptor = StepSupport.optionalString(step.config().get(SCHEMA_DESCRIPTOR));
        String protobufRootMessage = StepSupport.optionalString(step.config().get(PROTOBUF_ROOT_MESSAGE));
        byte[] payloadBytes = payloadBuilder.toProtobufBytes(payload, schemaDescriptor, protobufRootMessage, step.id());
        byte[] output = new byte[payloadBytes.length + 2];
        output[0] = (byte) ((prefix >> 8) & 0xFF);
        output[1] = (byte) (prefix & 0xFF);
        System.arraycopy(payloadBytes, 0, output, 2, payloadBytes.length);
        context.state().put(targetPath, output);
        context.state().put(ExecutionStateKeys.META_LAST_WIRE_FORMAT + ".type", type);
        context.state().put(ExecutionStateKeys.META_LAST_WIRE_FORMAT + ".prefixSize", size);
        context.state().put(ExecutionStateKeys.META_LAST_WIRE_FORMAT + ".prefixSource", source);
        context.state().put(ExecutionStateKeys.META_LAST_WIRE_FORMAT + ".prefixValue", prefix);
        context.state().put(ExecutionStateKeys.META_LAST_WIRE_FORMAT + ".sourcePath", sourcePath);
        context.state().put(ExecutionStateKeys.META_LAST_WIRE_FORMAT + ".targetPath", targetPath);
    }

    private int toPrefix(WorkflowMessageType messageType) {
        return switch (messageType) {
            case KAFKA -> 1;
            case RABBIT -> 2;
        };
    }

    private int resolvePrefix(ExecutionPlanDefinition.ExecutionStepDefinition step, String source) {
        if (MESSAGE_TYPE.equals(source)) {
            WorkflowMessageType messageType = WorkflowMessageType.from(stepSupport.requiredText(step, MESSAGE_TYPE));
            return toPrefix(messageType);
        }
        if (SOURCE_MESSAGE_PREFIX.equals(source)) {
            int output = stepSupport.intConfig(step, PREFIX_VALUE);
            if (output < 0 || output > 65_535) {
                throw new WorkflowEngineException("prefixValue must be in range 0..65535 for step: " + step.id());
            }
            return output;
        }
        throw new WorkflowEngineException("Unsupported wire prefix source for step: " + step.id() + " -> " + source);
    }
}
