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

import io.devset.ce.be.engine.application.steps.helpers.ConditionEvaluator;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;
import io.devset.ce.be.engine.application.steps.impl.send.KafkaSendExecutor;
import io.devset.ce.be.engine.application.steps.impl.send.RabbitSendExecutor;
import io.devset.ce.be.engine.application.steps.impl.send.SendConfig;
import io.devset.ce.be.engine.application.steps.impl.send.SendEnvelopeBuilder;
import io.devset.ce.be.engine.application.steps.impl.send.SendEnvelopeBuilder.SendEnvelope;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.engine.application.steps.impl.send.SendTargetResolver;
import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Handles {@code execute-send} steps that dispatch event payloads to Kafka or RabbitMQ.
 * <p>
 * Orchestrates: condition check → config resolution ({@link SendTargetResolver}) →
 * payload extraction → per-item dispatch ({@link KafkaSendExecutor} / {@link RabbitSendExecutor}) →
 * meta update. Simulation mode is enforced here; executors are not invoked when active.
 */
@Component
@RequiredArgsConstructor
public final class ExecuteSendStepHandler implements ExecutionPlanStepHandler {

    private final SendTargetResolver targetResolver;
    private final KafkaSendExecutor kafkaExecutor;
    private final RabbitSendExecutor rabbitExecutor;
    private final ConditionEvaluator conditionEvaluator;

    @Override
    public StepType supports() {
        return StepType.EXECUTE_SEND;
    }

    @Override
    public void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context) {
        ensureNotInterrupted(step.id());
        if (step.config().containsKey(CONDITION) && !conditionEvaluator.matches(step.config(), context, step.id())) {
            return;
        }
        SendConfig config = targetResolver.resolve(step);
        Object payload = context.state().get(config.sourcePath());
        int sentCount = dispatch(step, context, config, payload);
        publishSendMeta(context, config, sentCount);
    }

    private int dispatch(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context, SendConfig config, Object payload) {
        if (payload instanceof List<?> values) {
            for (Object value : values) {
                ensureNotInterrupted(step.id());
                sendOne(config, value, step.id(), context.simulationMode());
            }
            return values.size();
        }
        sendOne(config, payload, step.id(), context.simulationMode());
        return 1;
    }

    private void sendOne(SendConfig config, Object value, String stepId, boolean simulationMode) {
        if (simulationMode) {
            return;
        }
        SendEnvelope envelope = SendEnvelopeBuilder.from(value);
        if (config.messageType() == WorkflowMessageType.KAFKA) {
            kafkaExecutor.execute(config, envelope, stepId);
        } else {
            rabbitExecutor.execute(config, envelope, stepId);
        }
    }

    private void publishSendMeta(ExecutionPlanRuntimeContext context, SendConfig config, int sentCount) {
        context.state().put(ExecutionStateKeys.META_LAST_SEND + ".count", sentCount);
        context.state().put(ExecutionStateKeys.META_LAST_SEND + ".messageType", config.messageType().externalName());
        context.state().put(ExecutionStateKeys.META_LAST_SEND + ".contentType", config.contentType().externalName());
        context.state().put(ExecutionStateKeys.META_LAST_SEND + ".producerName", config.producerName());
        context.state().put(ExecutionStateKeys.META_LAST_SEND + ".topic", config.topic());
        context.state().put(ExecutionStateKeys.META_LAST_SEND + ".exchange", config.exchange());
        context.state().put(ExecutionStateKeys.META_LAST_SEND + ".routingKey", config.routingKey());
        context.state().put(ExecutionStateKeys.META_LAST_SEND + ".sourcePath", config.sourcePath());
        context.state().put(ExecutionStateKeys.META_LAST_SEND + ".simulated", context.simulationMode());
    }

    private void ensureNotInterrupted(String stepId) {
        if (Thread.currentThread().isInterrupted()) {
            throw new WorkflowEngineException("execute-send interrupted for step: " + stepId);
        }
    }
}
