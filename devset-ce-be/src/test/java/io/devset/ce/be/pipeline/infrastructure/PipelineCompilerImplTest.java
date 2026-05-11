/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.pipeline.infrastructure;

import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.Stage;
import io.devset.ce.be.common.domain.WorkflowContentType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.common.domain.ExecutionPlanConnectorRef;
import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.common.domain.StepType;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertThrows;

class PipelineCompilerImplTest {

    @Test
    void shouldAttachConnectorMetadataWhenWorkflowEmits() {
        ExecutionPlanInput input = compiler().compile(workflow(stage().emit(true)));

        assertEquals(Set.of(new ExecutionPlanConnectorRef(ConnectionType.KAFKA, "local")), input.connectors());
    }

    @Test
    void shouldSkipConnectorMetadataWhenWorkflowNeverEmits() {
        ExecutionPlanInput input = compiler().compile(workflow(stage().emit(false)));

        assertEquals(Set.of(), input.connectors());
    }

    @Test
    void shouldCompileDslFunctionsFromSetToSetFieldSteps() {
        LinkedHashMap<String, Object> set = new LinkedHashMap<>();
        set.put("id", Map.of("$fn", "uuid()"));
        set.put("userId", Map.of("$fn", "int(1,400)"));
        set.put("quantity", Map.of("$fn", "long(0,144)"));
        set.put("flagged", Map.of("$fn", "bit()"));

        ExecutionPlanInput input = compiler().compile(workflow(stage().set(set)));

        assertEquals(7, input.definition().steps().size());
        assertEquals(StepType.SET_FIELD, input.definition().steps().get(1).type());
        assertEquals(StepType.SET_FIELD, input.definition().steps().get(2).type());
        assertEquals(StepType.SET_FIELD, input.definition().steps().get(3).type());
        assertEquals(StepType.SET_FIELD, input.definition().steps().get(4).type());
        assertEquals(StepType.SET_FIELD, input.definition().steps().get(5).type());
        assertEquals(StepType.SET_FIELD, input.definition().steps().get(6).type());
        assertEquals(ExecutionStateKeys.CURRENT_EVENT, input.definition().steps().get(0).config().get("targetPath"));
        assertEquals(ExecutionStateKeys.CURRENT_EVENT_HEADERS, input.definition().steps().get(1).config().get("targetPath"));
        assertEquals(ExecutionStateKeys.CURRENT_EVENT_KEY, input.definition().steps().get(2).config().get("targetPath"));
        assertEquals("currentEvent.id", input.definition().steps().get(3).config().get("targetPath"));
        assertEquals("currentEvent.userId", input.definition().steps().get(4).config().get("targetPath"));
        assertEquals("uuid()", input.definition().steps().get(3).config().get("valueExpression"));
        assertEquals("int(1,400)", input.definition().steps().get(4).config().get("valueExpression"));
        assertEquals("long(0,144)", input.definition().steps().get(5).config().get("valueExpression"));
        assertEquals("bit()", input.definition().steps().get(6).config().get("valueExpression"));
    }

    @Test
    void shouldCompileConditionalSetToSetFieldWithWhenConfig() {
        LinkedHashMap<String, Object> set = new LinkedHashMap<>();
        set.put("resolvedResult", Map.of(
                "when", Map.of(
                        "$fn", "lte(currentEvent.value,currentEvent.limitValue)"
                ),
                "value", Map.of("$ref", "value"),
                "default", 0
        ));

        ExecutionPlanInput input = compiler().compile(workflow(stage().set(set)));

        Map<String, Object> config = input.definition().steps().get(3).config();
        assertEquals("currentEvent.resolvedResult", config.get("targetPath"));
        assertEquals("currentEvent.value", config.get("valuePath"));
        assertEquals(0, config.get("defaultValue"));
        Map<String, Object> when = assertInstanceOf(Map.class, config.get("when"));
        assertEquals("lte(currentEvent.value,currentEvent.limitValue)", when.get("$fn"));
    }

    @Test
    void shouldCompileConditionalSetDefaultsForReferenceFunctionAndTemplate() {
        LinkedHashMap<String, Object> set = new LinkedHashMap<>();
        set.put("resolvedResult", Map.of(
                "when", Map.of(
                        "$fn", "lte(currentEvent.value,currentEvent.limitValue)"
                ),
                "value", Map.of("$ref", "value"),
                "default", Map.of("$ref", "fallbackValue")
        ));
        set.put("entityId", Map.of(
                "when", Map.of(
                        "$fn", "eq(currentEvent.status,'OPEN')"
                ),
                "value", "ACTIVE",
                "default", Map.of("$fn", "uuid()")
        ));
        set.put("valuePayload", Map.of(
                "when", Map.of(
                        "$fn", "gt(currentEvent.value,currentEvent.limitValue)"
                ),
                "value", "REJECTED",
                "default", Map.of(
                        "kind", "FALLBACK",
                        "value", Map.of("$ref", "fallbackValue")
                )
        ));

        ExecutionPlanInput input = compiler().compile(workflow(stage().set(set)));

        Map<String, Object> resolvedResultConfig = input.definition().steps().get(3).config();
        Map<String, Object> entityIdConfig = input.definition().steps().get(4).config();
        Map<String, Object> valuePayloadConfig = input.definition().steps().get(5).config();

        assertEquals("currentEvent.fallbackValue", resolvedResultConfig.get("defaultValuePath"));
        assertEquals("uuid()", entityIdConfig.get("defaultValueExpression"));
        assertEquals(
                Map.of(
                        "kind", "FALLBACK",
                        "value", Map.of("$path", "currentEvent.fallbackValue")
                ),
                valuePayloadConfig.get("defaultValueTemplate")
        );
    }

    @Test
    void shouldCompileEmitConditionAndRepeatConditions() {
        ExecutionPlanInput input = compiler().compile(workflow(stage()
                .repeat(5)
                .repeatWhile(Map.of("$fn", "lt(currentEvent.value,10)"))
                .repeatUntil(Map.of("$fn", "gte(currentEvent.value,6)"))
                .headers(Map.of("eventType", "OPENED"))
                .set(Map.of("value", Map.of("$fn", "int(1,4)")))
                .emit(Map.of("$fn", "lte(currentEvent.value,3)"))
        ));

        Map<String, Object> repeatConfig = input.definition().steps().getLast().config();
        @SuppressWarnings("unchecked")
        List<ExecutionPlanDefinition.ExecutionStepDefinition> nestedSteps =
                (List<ExecutionPlanDefinition.ExecutionStepDefinition>) repeatConfig.get("steps");
        Map<String, Object> headersConfig = nestedSteps.get(1).config();
        Map<String, Object> appendConfig = nestedSteps.get(2).config();
        Map<String, Object> sendConfig = nestedSteps.get(3).config();

        assertEquals(Map.of("$fn", "lt(currentEvent.value,10)"), repeatConfig.get("repeatWhile"));
        assertEquals(Map.of("$fn", "gte(currentEvent.value,6)"), repeatConfig.get("repeatUntil"));
        assertEquals(Map.of("$fn", "lte(currentEvent.value,3)"), headersConfig.get("condition"));
        assertEquals(Map.of("$fn", "lte(currentEvent.value,3)"), appendConfig.get("condition"));
        assertEquals(Map.of("$fn", "lte(currentEvent.value,3)"), sendConfig.get("condition"));
        assertEquals("kafka", sendConfig.get("messageType"));
        assertEquals("application/json", sendConfig.get("contentType"));
    }

    @Test
    void shouldCompileRabbitMessageTypeToSendStepConfig() {
        ExecutionPlanInput output = compiler().compile(
                workflowBuilder().messageType(WorkflowMessageType.RABBIT).topic("queue-1")
                        .stages(stage().emit(true))
                        .build()
        );

        Map<String, Object> result = output.definition().steps().getLast().config();
        assertEquals("rabbit", result.get("messageType"));
        assertEquals("application/json", result.get("contentType"));
    }

    @Test
    void shouldCompileRabbitExchangeAndRoutingKeyToSendStepConfig() {
        ExecutionPlanInput output = compiler().compile(
                workflowBuilder()
                        .messageType(WorkflowMessageType.RABBIT)
                        .contentType(WorkflowContentType.JSON)
                        .topic(null)
                        .exchange("events.exchange")
                        .routingKey("entity.opened")
                        .stages(stage().emit(true))
                        .build()
        );

        Map<String, Object> result = output.definition().steps().getLast().config();
        assertEquals("rabbit", result.get("messageType"));
        assertEquals("events.exchange", result.get("exchange"));
        assertEquals("entity.opened", result.get("routingKey"));
    }

    @Test
    void shouldCompileRabbitExchangeOnlyToSendStepConfig() {
        ExecutionPlanInput output = compiler().compile(
                workflowBuilder()
                        .messageType(WorkflowMessageType.RABBIT)
                        .contentType(WorkflowContentType.JSON)
                        .topic(null)
                        .exchange("events.exchange")
                        .stages(stage().emit(true))
                        .build()
        );

        Map<String, Object> result = output.definition().steps().getLast().config();
        assertEquals("rabbit", result.get("messageType"));
        assertEquals("events.exchange", result.get("exchange"));
    }

    @Test
    void shouldCompileWireFormatStepBeforeSend() {
        ExecutionPlanInput output = compiler().compile(
                workflowBuilder()
                        .messageType(WorkflowMessageType.RABBIT)
                        .contentType(WorkflowContentType.PROTOBUF)
                        .topic("queue-1")
                        .stages(stage().emit(true)
                                .wireFormat(Map.of(
                                        "type", "binary-prefix",
                                        "prefix", Map.of("size", 2, "source", "messageType")
                                ))
                                .schemaId("user-event-schema"))
                        .build()
        );

        assertEquals(StepType.WIRE_FORMAT, output.definition().steps().get(3).type());
        assertEquals("binary-prefix", output.definition().steps().get(3).config().get("type"));
        assertEquals(2, output.definition().steps().get(3).config().get("size"));
        assertEquals("messageType", output.definition().steps().get(3).config().get("source"));
        assertEquals("application/x-protobuf", output.definition().steps().get(3).config().get("contentType"));
        assertEquals(StepType.EXECUTE_SEND, output.definition().steps().get(4).type());
    }

    @Test
    void shouldCompileWireFormatWithMessagePrefixSource() {
        ExecutionPlanInput output = compiler().compile(
                workflowBuilder()
                        .messageType(WorkflowMessageType.RABBIT)
                        .contentType(WorkflowContentType.PROTOBUF)
                        .topic("queue-1")
                        .stages(stage().emit(true)
                                .wireFormat(Map.of(
                                        "type", "binary-prefix",
                                        "prefix", Map.of("size", 2, "source", "messagePrefix", "value", 513)
                                ))
                                .schemaId("user-event-schema"))
                        .build()
        );

        assertEquals(StepType.WIRE_FORMAT, output.definition().steps().get(3).type());
        assertEquals("messagePrefix", output.definition().steps().get(3).config().get("source"));
        assertEquals(513, output.definition().steps().get(3).config().get("prefixValue"));
    }

    @Test
    void shouldThrowWhenWireFormatUsedWithJsonContentType() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> compiler().compile(
                        workflowBuilder()
                                .messageType(WorkflowMessageType.RABBIT)
                                .contentType(WorkflowContentType.JSON)
                                .topic("queue-1")
                                .stages(stage().emit(true)
                                        .wireFormat(Map.of(
                                                "type", "binary-prefix",
                                                "prefix", Map.of("size", 2, "source", "messageType")
                                        )))
                                .build()
                )
        );

        assertEquals("wireFormat requires contentType application/x-protobuf for stage: open", output.getMessage());
    }

    @Test
    void shouldCompileProtobufContentTypeToSendStepConfig() {
        ExecutionPlanInput output = compiler().compile(
                workflowBuilder()
                        .messageType(WorkflowMessageType.KAFKA)
                        .contentType(WorkflowContentType.PROTOBUF)
                        .stages(stage().emit(true).schemaId("user-event-schema"))
                        .build()
        );

        Map<String, Object> result = output.definition().steps().getLast().config();
        assertEquals("application/x-protobuf", result.get("contentType"));
    }

    @Test
    void shouldCompileSchemaIdToSendStepConfig() {
        ExecutionPlanInput output = compiler().compile(
                workflowBuilder()
                        .messageType(WorkflowMessageType.KAFKA)
                        .stages(stage().emit(true).schemaId("user-event-schema"))
                        .build()
        );

        Map<String, Object> result = output.definition().steps().getLast().config();
        assertEquals("user-event-schema", result.get("schemaId"));
    }

    @Test
    void shouldThrowWhenProtobufContentTypeAndStageSchemaIdIsMissing() {
        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> compiler().compile(
                        workflowBuilder()
                                .messageType(WorkflowMessageType.KAFKA)
                                .contentType(WorkflowContentType.PROTOBUF)
                                .stages(stage().emit(true))
                                .build()
                )
        );

        assertEquals("schemaId must be defined in stage for protobuf contentType. stage: open", output.getMessage());
    }

    @Test
    void shouldCompileStateBlockToStateTargetPaths() {
        LinkedHashMap<String, Object> state = new LinkedHashMap<>();
        state.put("entity.inputValue", Map.of("$fn", "int(100,300)"));
        state.put("entity.accumulatedValue", Map.of(
                "when", Map.of("$fn", "eq(state.entity.accumulatedValue,0)"),
                "value", 10,
                "default", Map.of("$ref", "value")
        ));

        ExecutionPlanInput input = compiler().compile(workflow(
                stage().set(Map.of("value", 5)).state(state)
        ));

        Map<String, Object> firstStateConfig = input.definition().steps().get(4).config();
        Map<String, Object> secondStateConfig = input.definition().steps().get(5).config();

        assertEquals("state.entity.inputValue", firstStateConfig.get("targetPath"));
        assertEquals("int(100,300)", firstStateConfig.get("valueExpression"));
        assertEquals("state.entity.accumulatedValue", secondStateConfig.get("targetPath"));
        assertEquals(10, secondStateConfig.get("value"));
        assertEquals("currentEvent.value", secondStateConfig.get("defaultValuePath"));
        assertEquals(Map.of("$fn", "eq(state.entity.accumulatedValue,0)"), secondStateConfig.get("when"));
    }

    @Test
    void shouldUseDefaultRepeatTimesWhenRepeatConditionExistsWithoutRepeatValue() {
        ExecutionPlanInput input = compiler().compile(workflow(
                stage()
                        .repeatWhile(Map.of("$fn", "lt(currentEvent.value,10)"))
                        .set(Map.of("value", Map.of("$fn", "int(1,4)")))
                        .emit(true)
        ));

        Map<String, Object> repeatConfig = input.definition().steps().getLast().config();
        assertEquals(10_000, repeatConfig.get("times"));
        assertEquals(Map.of("$fn", "lt(currentEvent.value,10)"), repeatConfig.get("repeatWhile"));
    }

    @Test
    void shouldCompileWorkflowLevelStateBeforePipelineStages() {
        LinkedHashMap<String, Object> workflowState = new LinkedHashMap<>();
        workflowState.put("context.label", "name1");
        workflowState.put("context.offset", Map.of("$fn", "int(1,10)"));

        ExecutionPlanInput input = compiler().compile(
                workflowBuilder()
                        .workflowState(workflowState)
                        .stages(stage().set(Map.of("seedValue", Map.of("$fn", "add(state.context.offset,0)"))))
                        .build()
        );

        assertEquals(6, input.definition().steps().size());
        assertEquals(StepType.SET_FIELD, input.definition().steps().get(0).type());
        assertEquals(StepType.SET_FIELD, input.definition().steps().get(1).type());
        assertEquals("state.context.label", input.definition().steps().get(0).config().get("targetPath"));
        assertEquals("state.context.offset", input.definition().steps().get(1).config().get("targetPath"));
        assertEquals("int(1,10)", input.definition().steps().get(1).config().get("valueExpression"));
        assertEquals(ExecutionStateKeys.CURRENT_EVENT, input.definition().steps().get(2).config().get("targetPath"));
        assertEquals(ExecutionStateKeys.CURRENT_EVENT_HEADERS, input.definition().steps().get(3).config().get("targetPath"));
        assertEquals(ExecutionStateKeys.CURRENT_EVENT_KEY, input.definition().steps().get(4).config().get("targetPath"));
        assertEquals("currentEvent.seedValue", input.definition().steps().get(5).config().get("targetPath"));
        assertEquals("add(state.context.offset,0)", input.definition().steps().get(5).config().get("valueExpression"));
    }

    @Test
    void shouldCompileKeyToSetFieldStepWhenKafka() {
        ExecutionPlanInput input = compiler().compile(workflow(
                stage().set(Map.of("id", 1)).emit(true).key("user-123")
        ));

        List<ExecutionPlanDefinition.ExecutionStepDefinition> steps = input.definition().steps();
        // Find the key set-field step (should be in the emit phase, before append)
        boolean foundKeyStep = steps.stream().anyMatch(s ->
                s.type() == StepType.SET_FIELD
                        && ExecutionStateKeys.CURRENT_EVENT_KEY.equals(s.config().get("targetPath"))
                        && "user-123".equals(s.config().get("value"))
        );
        assertEquals(true, foundKeyStep);
    }

    @Test
    void shouldCompileKeyWithRefExpression() {
        ExecutionPlanInput input = compiler().compile(workflow(
                stage().set(Map.of("id", 1)).emit(true).key(Map.of("$ref", "id"))
        ));

        List<ExecutionPlanDefinition.ExecutionStepDefinition> steps = input.definition().steps();
        boolean foundKeyStep = steps.stream().anyMatch(s ->
                s.type() == StepType.SET_FIELD
                        && ExecutionStateKeys.CURRENT_EVENT_KEY.equals(s.config().get("targetPath"))
                        && "currentEvent.id".equals(s.config().get("valuePath"))
        );
        assertEquals(true, foundKeyStep);
    }

    @Test
    void shouldNotCompileKeyStepWhenRabbit() {
        ExecutionPlanInput input = compiler().compile(
                workflowBuilder()
                        .messageType(WorkflowMessageType.RABBIT)
                        .topic("queue-1")
                        .stages(stage().set(Map.of("id", 1)).emit(true).key("ignored"))
                        .build()
        );

        List<ExecutionPlanDefinition.ExecutionStepDefinition> steps = input.definition().steps();
        // The key step should NOT be in the emit phase for Rabbit
        boolean foundKeyStepInEmit = steps.stream().anyMatch(s ->
                s.type() == StepType.SET_FIELD
                        && ExecutionStateKeys.CURRENT_EVENT_KEY.equals(s.config().get("targetPath"))
                        && "ignored".equals(s.config().get("value"))
        );
        assertEquals(false, foundKeyStepInEmit);
    }

    @Test
    void shouldThrowWhenEmitHasUnsupportedType() {
        WorkflowEngineException exception = assertThrows(WorkflowEngineException.class,
                () -> compiler().compile(workflow(stage().emit("yes"))));

        assertEquals("emit must be boolean or object", exception.getMessage());
    }

    @Test
    void shouldThrowWhenRepeatConditionDoesNotUseFn() {
        WorkflowEngineException exception = assertThrows(WorkflowEngineException.class,
                () -> compiler().compile(workflow(
                        stage().repeat(2).repeatWhile(Map.of("ref", "currentEvent.value"))
                )));

        assertEquals("repeatWhile must use '$fn' for stage: open", exception.getMessage());
    }

    @Test
    void shouldThrowWhenConditionalSetHasInvalidWhen() {
        LinkedHashMap<String, Object> set = new LinkedHashMap<>();
        set.put("resolvedResult", Map.of(
                "when", Map.of("ref", "currentEvent.value"),
                "value", 1
        ));

        WorkflowEngineException exception = assertThrows(WorkflowEngineException.class,
                () -> compiler().compile(workflow(stage().set(set))));

        assertEquals("when must use '$fn' for set field: open-1.resolvedResult", exception.getMessage());
    }

    @Test
    void shouldCompileWaitDurationToMillis() {
        ExecutionPlanInput input = compiler().compile(workflow(stage().waitDuration("15s")));

        assertEquals(StepType.WAIT, input.definition().steps().getLast().type());
        assertEquals(15_000L, input.definition().steps().getLast().config().get("millis"));
    }

    // -- test factories --

    private PipelineCompilerImpl compiler() {
        return new PipelineCompilerImpl(Mappers.getMapper(PipelineConnectorRefMapper.class), new PipelineValueCompiler());
    }

    private Workflow workflow(StageBuilder stageBuilder) {
        return workflowBuilder().stages(stageBuilder).build();
    }

    private WorkflowBuilder workflowBuilder() {
        return new WorkflowBuilder();
    }

    private StageBuilder stage() {
        return new StageBuilder();
    }

    private static final class StageBuilder {
        private String stageName = "open";
        private String event = "entity-opened";
        private String source = "none";
        private Integer repeat = null;
        private Map<String, Object> repeatWhile = Map.of();
        private Map<String, Object> repeatUntil = Map.of();
        private Map<String, Object> headers = Map.of();
        private Object key = null;
        private Map<String, Object> set = Map.of();
        private Map<String, Object> state = Map.of();
        private Object emit = false;
        private String waitDuration = null;
        private Map<String, Object> wireFormat = Map.of();
        private String schemaId = null;

        StageBuilder repeat(Integer repeat) { this.repeat = repeat; return this; }
        StageBuilder repeatWhile(Map<String, Object> v) { this.repeatWhile = v; return this; }
        StageBuilder repeatUntil(Map<String, Object> v) { this.repeatUntil = v; return this; }
        StageBuilder headers(Map<String, Object> v) { this.headers = v; return this; }
        StageBuilder key(Object v) { this.key = v; return this; }
        StageBuilder set(Map<String, Object> v) { this.set = v; return this; }
        StageBuilder state(Map<String, Object> v) { this.state = v; return this; }
        StageBuilder emit(Object v) { this.emit = v; return this; }
        StageBuilder waitDuration(String v) { this.waitDuration = v; return this; }
        StageBuilder wireFormat(Map<String, Object> v) { this.wireFormat = v; return this; }
        StageBuilder schemaId(String v) { this.schemaId = v; return this; }

        Stage build() {
            return new Stage(stageName, event, source, repeat, repeatWhile, repeatUntil,
                    headers, key, set, state, emit, waitDuration, wireFormat, schemaId, null);
        }
    }

    private static final class WorkflowBuilder {
        private String id = "workflow-1";
        private WorkflowMessageType messageType = WorkflowMessageType.KAFKA;
        private WorkflowContentType contentType = null;
        private String producerName = "local";
        private String topic = "topic-1";
        private String exchange = null;
        private String routingKey = null;
        private String schemaId = null;
        private Integer executions = 1;
        private Map<String, Object> workflowState = Map.of();
        private StageBuilder[] stageBuilders;

        WorkflowBuilder messageType(WorkflowMessageType v) { this.messageType = v; return this; }
        WorkflowBuilder contentType(WorkflowContentType v) { this.contentType = v; return this; }
        WorkflowBuilder topic(String v) { this.topic = v; return this; }
        WorkflowBuilder exchange(String v) { this.exchange = v; return this; }
        WorkflowBuilder routingKey(String v) { this.routingKey = v; return this; }
        WorkflowBuilder workflowState(Map<String, Object> v) { this.workflowState = v; return this; }
        WorkflowBuilder stages(StageBuilder... builders) { this.stageBuilders = builders; return this; }

        Workflow build() {
            List<Stage> stages = stageBuilders == null
                    ? List.of(new StageBuilder().build())
                    : java.util.Arrays.stream(stageBuilders).map(StageBuilder::build).toList();
            return new Workflow(id, messageType, contentType, producerName, topic,
                    exchange, routingKey, schemaId, executions, workflowState, stages);
        }
    }
}
