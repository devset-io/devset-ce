/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ProtobufSchemaDescriptor;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.schema.application.SchemaFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Enriches protobuf-typed execution steps with schema descriptors loaded from the schema registry.
 * <p>
 * When a step of type {@code EXECUTE_SEND} or {@code WIRE_FORMAT} uses protobuf content but has
 * no embedded {@code schemaDescriptor}, this loader resolves the descriptor (and optional root
 * message name) via the {@link SchemaFacade} using the step's {@code schemaId}. Results are
 * cached per schema ID within a single invocation to avoid redundant lookups.
 */
@Component
@RequiredArgsConstructor
public final class ProtobufStepConfigEnricher {

    private final SchemaFacade schemaFacade;

    /**
     * Enriches protobuf steps in the given input with schema descriptors.
     *
     * @param input the execution plan input to enrich
     * @return enriched input, or the same instance if no changes were needed
     */
    public ExecutionPlanInput load(ExecutionPlanInput input) {
        Map<String, ProtobufSchemaDescriptor> cache = new HashMap<>();
        boolean changed = false;
        List<ExecutionPlanDefinition.ExecutionStepDefinition> output = new ArrayList<>(input.definition().steps().size());

        for (ExecutionPlanDefinition.ExecutionStepDefinition step : input.definition().steps()) {
            ExecutionPlanDefinition.ExecutionStepDefinition enriched = enrichStep(step, cache);
            if (enriched != step) {
                changed = true;
            }
            output.add(enriched);
        }

        if (!changed) {
            return input;
        }
        return new ExecutionPlanInput(
                new ExecutionPlanDefinition(input.definition().workflowId(), output),
                input.context(),
                input.connectors()
        );
    }

    private ExecutionPlanDefinition.ExecutionStepDefinition enrichStep(
            ExecutionPlanDefinition.ExecutionStepDefinition step,
            Map<String, ProtobufSchemaDescriptor> cache
    ) {
        if (step.config().get("steps") instanceof List<?> nested) {
            List<?> enriched = nested.stream()
                    .map(e -> e instanceof ExecutionPlanDefinition.ExecutionStepDefinition s ? enrichStep(s, cache) : e)
                    .toList();
            if (!enriched.equals(nested)) {
                LinkedHashMap<String, Object> config = new LinkedHashMap<>(step.config());
                config.put("steps", enriched);
                return new ExecutionPlanDefinition.ExecutionStepDefinition(step.id(), step.type(), config, step.stageName());
            }
            return step;
        }
        if (!isProtobufStep(step)) {
            return step;
        }
        String schemaDescriptor = StepSupport.optionalString(step.config().get(ExecutionPlanStepHandler.SCHEMA_DESCRIPTOR));
        if (schemaDescriptor != null) {
            return step;
        }
        String schemaId = StepSupport.optionalString(step.config().get(ExecutionPlanStepHandler.SCHEMA_ID));
        if (schemaId == null) {
            throw new WorkflowEngineException("Missing config 'schemaId' for protobuf step: " + step.id());
        }
        ProtobufSchemaDescriptor metadata = cache.computeIfAbsent(schemaId, schemaFacade::loadProtobufDescriptor);
        LinkedHashMap<String, Object> config = new LinkedHashMap<>(step.config());
        config.put(ExecutionPlanStepHandler.SCHEMA_DESCRIPTOR, metadata.descriptor());
        if (metadata.protobufRootMessage() != null && !metadata.protobufRootMessage().isBlank()) {
            config.put(ExecutionPlanStepHandler.PROTOBUF_ROOT_MESSAGE, metadata.protobufRootMessage());
        }
        return new ExecutionPlanDefinition.ExecutionStepDefinition(step.id(), step.type(), config, step.stageName());
    }

    private boolean isProtobufStep(ExecutionPlanDefinition.ExecutionStepDefinition step) {
        if (step.type() != StepType.EXECUTE_SEND && step.type() != StepType.WIRE_FORMAT) {
            return false;
        }
        String contentType = StepSupport.optionalString(step.config().get(ExecutionPlanStepHandler.CONTENT_TYPE));
        if (contentType == null) {
            return false;
        }
        return WorkflowContentType.PROTOBUF.externalName().equalsIgnoreCase(contentType)
                || WorkflowContentType.PROTOBUF.name().equalsIgnoreCase(contentType);
    }
}
