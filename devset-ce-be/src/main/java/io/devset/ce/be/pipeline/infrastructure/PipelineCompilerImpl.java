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

import io.devset.ce.be.common.domain.DomainValidation;
import io.devset.ce.be.common.domain.ExecutionPlanConnectorRef;
import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.Stage;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.pipeline.domain.PipelineCompiler;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Compiles a {@link Workflow} DSL definition into a flat {@link ExecutionPlanInput}
 * that the engine walks step by step.
 * <p>
 * One class covers the full compilation flow: workflow state assignments, stage bodies,
 * the emit phase (headers, append, wire-format, send), repeat wrapping, and connector
 * resolution. Value forms ({@code $ref}, {@code $fn}, templates, {@code when}) are
 * delegated to {@link PipelineValueCompiler}.
 * <p>
 * <b>Adding a new DSL stage field:</b>
 * <ol>
 *   <li>Add the field to the {@link Stage} record.</li>
 *   <li>Handle it here in {@link #compileStageBody} (or the appropriate emit/wire-format
 *       method) — emit one or more {@link ExecutionPlanDefinition.ExecutionStepDefinition}s.</li>
 *   <li>Add a test case to {@code PipelineCompilerImplTest}.</li>
 * </ol>
 */
@Component
public final class PipelineCompilerImpl implements PipelineCompiler {

    // ── step config keys shared by emit/send/wire-format ────────────────────

    private static final String HEADERS = "headers";
    private static final String MESSAGE_TYPE = "messageType";
    private static final String CONTENT_TYPE = "contentType";
    private static final String PRODUCER_NAME = "producerName";
    private static final String TOPIC = "topic";
    private static final String EXCHANGE = "exchange";
    private static final String ROUTING_KEY = "routingKey";
    private static final String SCHEMA_ID = "schemaId";
    private static final String CONDITION = "condition";
    private static final String TYPE = "type";
    private static final String SIZE = "size";
    private static final String SOURCE = "source";
    private static final String PREFIX = "prefix";
    private static final String PREFIX_VALUE = "prefixValue";
    private static final String SOURCE_PATH = "sourcePath";
    private static final String TIMES = "times";
    private static final String STEPS = "steps";
    private static final String REPEAT_WHILE = "repeatWhile";
    private static final String REPEAT_UNTIL = "repeatUntil";
    private static final String PREFIX_SOURCE_MESSAGE_TYPE = "messageType";
    private static final String PREFIX_SOURCE_MESSAGE_PREFIX = "messagePrefix";

    // ── query DSL keys ─────────────────────────────────────────────────────

    private static final String QUERY_CONNECTION = "connection";
    private static final String QUERY_DATABASE = "database";
    private static final String QUERY_COLLECTION = "collection";
    private static final String QUERY_FIND = "find";
    private static final String QUERY_SELECT = "select";
    private static final String CONFIG_CONNECTION_NAME = "connectionName";

    // ── wire-format constraints ─────────────────────────────────────────────

    private static final String BINARY_PREFIX = "binary-prefix";
    private static final int WIRE_FORMAT_PREFIX_SIZE = 2;
    private static final int MAX_PREFIX_VALUE = 65_535;
    private static final String LAST_APPENDED_EVENT_PAYLOAD = "lastAppendedEvent.payload";

    // ── repeat default iteration cap when only condition is set ─────────────

    private static final int DEFAULT_REPEAT_TIMES_WITH_CONDITION = 10_000;

    private final PipelineConnectorRefMapper connectorRefMapper;
    private final PipelineValueCompiler valueCompiler;

    PipelineCompilerImpl(PipelineConnectorRefMapper connectorRefMapper, PipelineValueCompiler valueCompiler) {
        this.connectorRefMapper = connectorRefMapper;
        this.valueCompiler = valueCompiler;
    }

    // ── entry point ─────────────────────────────────────────────────────────

    @Override
    public ExecutionPlanInput compile(Workflow request) {
        Objects.requireNonNull(request, "request must not be null");
        WorkflowCompilationContext ctx = WorkflowCompilationContext.from(request);

        List<ExecutionPlanDefinition.ExecutionStepDefinition> steps = new ArrayList<>(
                valueCompiler.compileAssignmentSteps(
                        "workflow-state",
                        request.state(),
                        PipelineValueCompiler.STATE_ROOT,
                        null
                )
        );
        for (int index = 0; index < request.pipeline().size(); index++) {
            steps.addAll(compileStage(index, request.pipeline().get(index), ctx));
        }

        return new ExecutionPlanInput(
                new ExecutionPlanDefinition(request.id(), steps),
                Map.of(),
                resolveConnectors(request)
        );
    }

    // ── stage compilation ───────────────────────────────────────────────────

    private List<ExecutionPlanDefinition.ExecutionStepDefinition> compileStage(
            int stageIndex, Stage stage, WorkflowCompilationContext ctx
    ) {
        String stageName = requireStageName(stage.stage());
        String prefix = stageKey(stageName) + "-" + (stageIndex + 1);
        List<ExecutionPlanDefinition.ExecutionStepDefinition> steps = new ArrayList<>();

        steps.add(step(prefix + "-init-event", StepType.SET_FIELD,
                Map.of(PipelineValueCompiler.TARGET_PATH, PipelineValueCompiler.CURRENT_EVENT_ROOT,
                        PipelineValueCompiler.VALUE, new LinkedHashMap<>()), stageName));
        steps.add(step(prefix + "-init-headers", StepType.SET_FIELD,
                Map.of(PipelineValueCompiler.TARGET_PATH, ExecutionStateKeys.CURRENT_EVENT_HEADERS,
                        PipelineValueCompiler.VALUE, new LinkedHashMap<>()), stageName));
        if (ctx.messageType() == WorkflowMessageType.KAFKA) {
            steps.add(step(prefix + "-init-key", StepType.SET_FIELD,
                    Map.of(PipelineValueCompiler.TARGET_PATH, ExecutionStateKeys.CURRENT_EVENT_KEY,
                            PipelineValueCompiler.VALUE, ""), stageName));
        }

        if (usesPreviousStage(stage, stageName)) {
            steps.add(step(prefix + "-copy-last-payload", StepType.COPY_FIELD,
                    Map.of(SOURCE_PATH, ExecutionStateKeys.LAST_APPENDED_EVENT_PREFIX + "payload",
                            PipelineValueCompiler.TARGET_PATH, PipelineValueCompiler.CURRENT_EVENT_ROOT), stageName));
        }

        Integer repeat = stage.repeat();
        if (repeat != null && repeat <= 0) {
            throw new WorkflowEngineException("repeat must be > 0 (got " + repeat + ") for stage: " + stageName);
        }
        boolean hasRepeatConditions = !stage.repeatWhile().isEmpty() || !stage.repeatUntil().isEmpty();
        Integer repeatTimes = repeat;
        if (repeatTimes == null && hasRepeatConditions) {
            repeatTimes = DEFAULT_REPEAT_TIMES_WITH_CONDITION;
        }

        List<ExecutionPlanDefinition.ExecutionStepDefinition> body = compileStageBody(prefix, stage, stageName, ctx);

        if (repeatTimes == null || repeatTimes == 1) {
            steps.addAll(body);
        } else {
            steps.add(buildRepeatStep(prefix, stage, stageName, repeatTimes, body));
        }

        return steps;
    }

    private List<ExecutionPlanDefinition.ExecutionStepDefinition> compileStageBody(
            String prefix, Stage stage, String stageName, WorkflowCompilationContext ctx
    ) {
        List<ExecutionPlanDefinition.ExecutionStepDefinition> steps = new ArrayList<>();
        if (!stage.query().isEmpty()) {
            steps.add(compileQueryStep(prefix, stage, stageName));
        }

        steps.addAll(valueCompiler.compileAssignmentSteps(
                prefix, stage.set(), PipelineValueCompiler.CURRENT_EVENT_ROOT, stageName));
        steps.addAll(valueCompiler.compileAssignmentSteps(
                prefix + "-state", stage.state(), PipelineValueCompiler.STATE_ROOT, stageName));

        if (valueCompiler.shouldEmit(stage.emit())) {
            Map<String, Object> emitCondition = valueCompiler.compileEmitCondition(stage.emit(), stage.stage());
            steps.addAll(compileEmit(prefix, stage, stageName, ctx, emitCondition));
        }

        if (stage.waitDuration() != null && !stage.waitDuration().isBlank()) {
            steps.add(step(prefix + "-wait", StepType.WAIT,
                    Map.of("millis", parseDurationMillis(stage.waitDuration())), stageName));
        }

        return steps;
    }

    private ExecutionPlanDefinition.ExecutionStepDefinition buildRepeatStep(
            String prefix, Stage stage, String stageName, int repeatTimes,
            List<ExecutionPlanDefinition.ExecutionStepDefinition> body
    ) {
        LinkedHashMap<String, Object> repeatConfig = new LinkedHashMap<>();
        repeatConfig.put(TIMES, repeatTimes);
        repeatConfig.put(STEPS, List.copyOf(body));
        if (!stage.repeatWhile().isEmpty()) {
            repeatConfig.put(REPEAT_WHILE, valueCompiler.compileConditionMap(stage.repeatWhile(), stageName, REPEAT_WHILE));
        }
        if (!stage.repeatUntil().isEmpty()) {
            repeatConfig.put(REPEAT_UNTIL, valueCompiler.compileConditionMap(stage.repeatUntil(), stageName, REPEAT_UNTIL));
        }
        return step(prefix + "-repeat", StepType.REPEAT, repeatConfig, stageName);
    }

    private boolean usesPreviousStage(Stage stage, String stageName) {
        String source = DomainValidation.requireText(stage.source(), "source");
        return switch (source) {
            case "none" -> false;
            case "previous-stage" -> true;
            default -> throw new WorkflowEngineException("Unsupported source '" + source + "' for stage: " + stageName);
        };
    }

    // ── emit phase (headers → key → append → wire-format → send) ──────────────

    private List<ExecutionPlanDefinition.ExecutionStepDefinition> compileEmit(
            String prefix, Stage stage, String stageName,
            WorkflowCompilationContext ctx, Map<String, Object> emitCondition
    ) {
        List<ExecutionPlanDefinition.ExecutionStepDefinition> steps = new ArrayList<>();
        String stageSchemaId = stage.schemaId();

        if (!stage.headers().isEmpty()) {
            LinkedHashMap<String, Object> headersConfig = new LinkedHashMap<>();
            headersConfig.put(HEADERS, valueCompiler.compileTemplateMap(stage.headers()));
            if (emitCondition != null) {
                headersConfig.put(CONDITION, emitCondition);
            }
            steps.add(step(prefix + "-headers", StepType.SET_EVENT_HEADERS, headersConfig, stageName));
        }

        if (stage.key() != null && ctx.messageType() == WorkflowMessageType.KAFKA) {
            steps.add(valueCompiler.compileSingleAssignment(
                    prefix + "-key", ExecutionStateKeys.CURRENT_EVENT_KEY, stage.key(), stageName));
        }

        LinkedHashMap<String, Object> appendConfig = new LinkedHashMap<>();
        if (emitCondition != null) {
            appendConfig.put(CONDITION, emitCondition);
        }
        steps.add(step(prefix + "-append", StepType.APPEND_CURRENT_EVENT, appendConfig, stageName));

        if (!stage.wireFormat().isEmpty()) {
            steps.add(buildWireFormatStep(prefix, stage, stageName, ctx, stageSchemaId, emitCondition));
        }

        steps.add(step(prefix + "-send", StepType.EXECUTE_SEND,
                buildSendConfig(stageName, ctx, stageSchemaId, emitCondition), stageName));

        return steps;
    }

    private LinkedHashMap<String, Object> buildSendConfig(
            String stageName, WorkflowCompilationContext ctx,
            String stageSchemaId, Map<String, Object> emitCondition
    ) {
        LinkedHashMap<String, Object> sendConfig = new LinkedHashMap<>();
        sendConfig.put(MESSAGE_TYPE, ctx.messageType().externalName());
        sendConfig.put(CONTENT_TYPE, ctx.contentType().externalName());
        sendConfig.put(PRODUCER_NAME, ctx.producerName());
        putIfPresent(sendConfig, TOPIC, ctx.topic());
        if (ctx.isRabbit()) {
            putIfPresent(sendConfig, EXCHANGE, ctx.exchange());
            putIfPresent(sendConfig, ROUTING_KEY, ctx.routingKey());
        }
        if (ctx.isProtobuf()) {
            if (stageSchemaId == null || stageSchemaId.isBlank()) {
                throw new WorkflowEngineException("schemaId must be defined in stage for protobuf contentType. stage: " + stageName);
            }
            sendConfig.put(SCHEMA_ID, stageSchemaId);
        } else {
            putIfPresent(sendConfig, SCHEMA_ID, stageSchemaId);
        }
        if (emitCondition != null) {
            sendConfig.put(CONDITION, emitCondition);
        }
        return sendConfig;
    }

    // ── wire-format validation and step ─────────────────────────────────────

    private ExecutionPlanDefinition.ExecutionStepDefinition buildWireFormatStep(
            String prefix, Stage stage, String stageName,
            WorkflowCompilationContext ctx, String stageSchemaId, Map<String, Object> emitCondition
    ) {
        WireFormatValidation validated = validateWireFormat(stage, stageName, ctx, stageSchemaId);
        LinkedHashMap<String, Object> wireConfig = new LinkedHashMap<>();
        wireConfig.put(TYPE, validated.type());
        wireConfig.put(SIZE, validated.prefixSize());
        wireConfig.put(SOURCE, validated.prefixSource());
        if (validated.prefixValue() != null) {
            wireConfig.put(PREFIX_VALUE, validated.prefixValue());
        }
        wireConfig.put(MESSAGE_TYPE, ctx.messageType().externalName());
        wireConfig.put(CONTENT_TYPE, ctx.contentType().externalName());
        wireConfig.put(SCHEMA_ID, stageSchemaId);
        wireConfig.put(SOURCE_PATH, LAST_APPENDED_EVENT_PAYLOAD);
        wireConfig.put(PipelineValueCompiler.TARGET_PATH, LAST_APPENDED_EVENT_PAYLOAD);
        if (emitCondition != null) {
            wireConfig.put(CONDITION, emitCondition);
        }
        return step(prefix + "-wire-format", StepType.WIRE_FORMAT, wireConfig, stageName);
    }

    private WireFormatValidation validateWireFormat(
            Stage stage, String stageName, WorkflowCompilationContext ctx, String stageSchemaId
    ) {
        if (!ctx.isProtobuf()) {
            throw new WorkflowEngineException("wireFormat requires contentType application/x-protobuf for stage: " + stageName);
        }
        if (stageSchemaId == null || stageSchemaId.isBlank()) {
            throw new WorkflowEngineException("wireFormat requires schemaId in stage for stage: " + stageName);
        }
        Object rawType = stage.wireFormat().get(TYPE);
        if (!(rawType instanceof String type) || type.isBlank()) {
            throw new WorkflowEngineException("wireFormat.type must be defined for stage: " + stageName);
        }
        if (!BINARY_PREFIX.equals(type)) {
            throw new WorkflowEngineException("Unsupported wireFormat.type '" + type + "' for stage: " + stageName);
        }
        Object rawPrefix = stage.wireFormat().get(PREFIX);
        if (!(rawPrefix instanceof Map<?, ?> rawPrefixMap)) {
            throw new WorkflowEngineException("wireFormat.prefix must be an object for stage: " + stageName);
        }
        int prefixSize = asInt(rawPrefixMap.get(SIZE), "wireFormat.prefix.size", stageName);
        if (prefixSize != WIRE_FORMAT_PREFIX_SIZE) {
            throw new WorkflowEngineException("wireFormat.prefix.size must be " + WIRE_FORMAT_PREFIX_SIZE + " (got " + prefixSize + ") for stage: " + stageName);
        }
        Object rawSource = rawPrefixMap.get(SOURCE);
        if (!(rawSource instanceof String prefixSource) || prefixSource.isBlank()) {
            throw new WorkflowEngineException("wireFormat.prefix.source must be defined for stage: " + stageName);
        }
        Integer prefixValue = resolvePrefixValue(rawPrefixMap, prefixSource, stageName);
        return new WireFormatValidation(type, prefixSize, prefixSource, prefixValue);
    }

    private Integer resolvePrefixValue(Map<?, ?> rawPrefixMap, String prefixSource, String stageName) {
        if (PREFIX_SOURCE_MESSAGE_TYPE.equals(prefixSource)) {
            return null;
        }
        if (PREFIX_SOURCE_MESSAGE_PREFIX.equals(prefixSource)) {
            int output = asInt(rawPrefixMap.get(PipelineValueCompiler.VALUE), "wireFormat.prefix.value", stageName);
            if (output < 0 || output > MAX_PREFIX_VALUE) {
                throw new WorkflowEngineException("wireFormat.prefix.value must be in range 0.." + MAX_PREFIX_VALUE + " (got " + output + ") for stage: " + stageName);
            }
            return output;
        }
        throw new WorkflowEngineException("Unsupported wireFormat.prefix.source '" + prefixSource + "' for stage: " + stageName);
    }

    // ── query compilation ───────────────────────────────────────────────────

    private ExecutionPlanDefinition.ExecutionStepDefinition compileQueryStep(
            String prefix, Stage stage, String stageName
    ) {
        Map<String, Object> queryBlock = stage.query();
        LinkedHashMap<String, Object> config = new LinkedHashMap<>();

        Object connection = queryBlock.get(QUERY_CONNECTION);
        if (connection == null || String.valueOf(connection).isBlank()) {
            throw new WorkflowEngineException("query.connection must be defined for stage: " + stageName);
        }
        config.put(CONFIG_CONNECTION_NAME, String.valueOf(connection));

        Object database = queryBlock.get(QUERY_DATABASE);
        if (database == null || String.valueOf(database).isBlank()) {
            throw new WorkflowEngineException("query.database must be defined for stage: " + stageName);
        }
        config.put(QUERY_DATABASE, String.valueOf(database));

        Object collection = queryBlock.get(QUERY_COLLECTION);
        if (collection == null || String.valueOf(collection).isBlank()) {
            throw new WorkflowEngineException("query.collection must be defined for stage: " + stageName);
        }
        config.put(QUERY_COLLECTION, String.valueOf(collection));

        Object find = queryBlock.get(QUERY_FIND);
        if (find instanceof Map<?, ?>) {
            config.put(QUERY_FIND, find);
        }

        Object select = queryBlock.get(QUERY_SELECT);
        if (select instanceof Map<?, ?>) {
            config.put(QUERY_SELECT, select);
        }

        return step(prefix + "-query", StepType.EXECUTE_QUERY, config, stageName);
    }

    // ── connectors ──────────────────────────────────────────────────────────

    private Set<ExecutionPlanConnectorRef> resolveConnectors(Workflow request) {
        boolean emits = request.pipeline().stream().anyMatch(stage -> valueCompiler.shouldEmit(stage.emit()));
        if (!emits) {
            return Set.of();
        }
        return Set.of(connectorRefMapper.toConnectorRef(request));
    }

    // ── package-private static helpers (used by PipelineValueCompiler imports too) ──

    static ExecutionPlanDefinition.ExecutionStepDefinition step(
            String id, StepType type, Map<String, Object> config, String stageName
    ) {
        return new ExecutionPlanDefinition.ExecutionStepDefinition(id, type, config, stageName);
    }

    static String requireStageName(String stage) {
        if (stage == null || stage.isBlank()) {
            throw new WorkflowEngineException("stage must not be blank");
        }
        return stage.trim();
    }

    static String stageKey(String stage) {
        String normalized = requireStageName(stage)
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        if (normalized.isEmpty()) {
            throw new WorkflowEngineException("stage must contain at least one letter or digit");
        }
        return normalized;
    }

    static long parseDurationMillis(String value) {
        String normalized = value.trim().toLowerCase(Locale.ROOT);
        if (normalized.endsWith("ms")) {
            return Long.parseLong(normalized.substring(0, normalized.length() - 2));
        }
        if (normalized.endsWith("s")) {
            return Long.parseLong(normalized.substring(0, normalized.length() - 1)) * 1_000L;
        }
        if (normalized.endsWith("m")) {
            return Long.parseLong(normalized.substring(0, normalized.length() - 1)) * 60_000L;
        }
        throw new WorkflowEngineException("Unsupported wait duration: " + value);
    }

    static void putIfPresent(Map<String, Object> map, String key, String value) {
        if (value != null && !value.isBlank()) {
            map.put(key, value);
        }
    }

    private static int asInt(Object value, String fieldName, String stageName) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (RuntimeException exception) {
            throw new WorkflowEngineException(fieldName + " must be a number for stage: " + stageName);
        }
    }

    // private record groups validated wire-format fields
    private record WireFormatValidation(String type, int prefixSize, String prefixSource, Integer prefixValue) {}
}
