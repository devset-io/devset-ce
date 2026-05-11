/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.common.domain;

/**
 * Canonical dot-path keys for the mutable
 * {@link io.devset.ce.be.engine.domain.ExecutionPlanState} map shared across step
 * handlers, expression resolvers, and pipeline compilers.
 *
 * <p>All step handlers read and write state exclusively through this key set.
 * Keys NOT listed here are considered ad-hoc and SHOULD be promoted to constants
 * when used by more than one class.</p>
 *
 * <h3>Root-level keys — written once by ExecutionPlanEngine on startup</h3>
 * <ul>
 *   <li>{@link #WORKFLOW_ID} — workflow definition identifier</li>
 *   <li>{@link #CONTEXT} — deep copy of the caller-supplied input context map</li>
 *   <li>{@link #OUTPUT_EVENTS} — list of raw event maps accumulated during the run</li>
 * </ul>
 *
 * <h3>Event-level keys — written and read by step handlers during execution</h3>
 * <ul>
 *   <li>{@link #CURRENT_EVENT} — map being built for the current event payload;
 *       written by {@code SetFieldStepHandler} and {@code PipelineCompilerImpl} (init step),
 *       read and snapshotted by {@code AppendCurrentEventStepHandler}</li>
 *   <li>{@link #CURRENT_EVENT_PREFIX} — dot-path prefix for fields inside
 *       {@code currentEvent} (e.g. {@code currentEvent.id})</li>
 *   <li>{@link #CURRENT_EVENT_HEADERS} — header map for the current event;
 *       written by {@code SetEventHeadersStepHandler},
 *       read by {@code AppendCurrentEventStepHandler}</li>
 *   <li>{@link #CURRENT_EVENT_KEY} — Kafka message key for the current event;
 *       written by {@code SetFieldStepHandler} (compiled from DSL key),
 *       read by {@code AppendCurrentEventStepHandler}</li>
 *   <li>{@link #LAST_APPENDED_EVENT} — full snapshot (header + payload map) of the most
 *       recently appended event; written by {@code AppendCurrentEventStepHandler},
 *       read by {@code WireFormatStepHandler} (default source) and
 *       {@code SendTargetResolver} (default source path)</li>
 *   <li>{@link #LAST_APPENDED_EVENT_PREFIX} — dot-path prefix for fields inside
 *       {@code lastAppendedEvent} (e.g. {@code lastAppendedEvent.payload})</li>
 * </ul>
 *
 * <h3>Meta keys — written per step, readable by downstream steps</h3>
 * <ul>
 *   <li>{@link #META_PREFIX} — root prefix for all {@code meta.*} entries</li>
 *   <li>{@link #META_LAST_SEND} — prefix for {@code execute-send} metadata
 *       (sub-keys: {@code .count}, {@code .messageType}, {@code .contentType},
 *       {@code .producerName}, {@code .topic}, {@code .exchange}, {@code .routingKey},
 *       {@code .sourcePath}, {@code .simulated});
 *       written by {@code ExecuteSendStepHandler}</li>
 *   <li>{@link #META_LAST_WAIT} — prefix for {@code wait} metadata
 *       (sub-keys: {@code .millis}, {@code .simulated});
 *       written by {@code WaitStepHandler}</li>
 *   <li>{@link #META_LOOP} — prefix for {@code repeat} loop metadata
 *       (sub-keys: {@code .currentIteration}, {@code .totalIterations});
 *       written by {@code RepeatStepHandler}</li>
 *   <li>{@link #META_LAST_WIRE_FORMAT} — prefix for {@code wire-format} metadata
 *       (sub-keys: {@code .type}, {@code .prefixSize}, {@code .prefixSource},
 *       {@code .prefixValue}, {@code .sourcePath}, {@code .targetPath});
 *       written by {@code WireFormatStepHandler}</li>
 * </ul>
 */
public final class ExecutionStateKeys {

    /** Workflow definition identifier; set at the start of every execution. */
    public static final String WORKFLOW_ID = "workflowId";

    /** Deep copy of the caller-supplied input context map. */
    public static final String CONTEXT = "context";

    /** Mutable list of raw event maps accumulated during the run. */
    public static final String OUTPUT_EVENTS = "outputEvents";

    /** Mutable map representing the event payload currently being assembled. */
    public static final String CURRENT_EVENT = "currentEvent";

    /** Dot-path prefix for fields inside {@code currentEvent}, e.g. {@code currentEvent.id}. */
    public static final String CURRENT_EVENT_PREFIX = "currentEvent.";

    /** Header map attached to the current event; keyed by header name. */
    public static final String CURRENT_EVENT_HEADERS = "currentEventHeaders";

    /** Kafka message key for the current event; {@code null} means no key (round-robin). */
    public static final String CURRENT_EVENT_KEY = "currentEventKey";

    /** Snapshot (header + payload) of the most recently appended event. */
    public static final String LAST_APPENDED_EVENT = "lastAppendedEvent";

    /** Dot-path prefix for fields inside {@code lastAppendedEvent}, e.g. {@code lastAppendedEvent.payload}. */
    public static final String LAST_APPENDED_EVENT_PREFIX = "lastAppendedEvent.";

    /** Root prefix for all step metadata entries written into state. */
    public static final String META_PREFIX = "meta.";

    /** Prefix for metadata written by {@code ExecuteSendStepHandler} after each send. */
    public static final String META_LAST_SEND = "meta.lastSend";

    /** Prefix for metadata written by {@code WaitStepHandler} after each wait. */
    public static final String META_LAST_WAIT = "meta.lastWait";

    /** Prefix for metadata written by {@code RepeatStepHandler} on each iteration. */
    public static final String META_LOOP = "meta.loop";

    /** Prefix for metadata written by {@code WireFormatStepHandler} after each wire-format conversion. */
    public static final String META_LAST_WIRE_FORMAT = "meta.lastWireFormat";

    /** Prefix for metadata written by {@code ExecuteQueryStepHandler} after each database query. */
    public static final String META_LAST_QUERY = "meta.lastQuery";

    // --- DSL conditional keys (when/value/default) ---

    /** Config key for conditional guard in DSL set-field and template values. */
    public static final String DSL_WHEN = "when";

    /** Config key for the value branch of a conditional DSL expression. */
    public static final String DSL_VALUE = "value";

    /** Config key for the default branch of a conditional DSL expression. */
    public static final String DSL_DEFAULT = "default";

    private ExecutionStateKeys() {
    }
}
