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
 * Supported execution plan step types.
 * <p>
 * Each constant corresponds to one {@code ExecutionPlanStepHandler} implementation in
 * the engine. The external name (kebab-case) is the stable wire format used in
 * persisted execution plans.
 */
public enum StepType {
    COPY_FIELD("copy-field"),
    SET_FIELD("set-field"),
    WAIT("wait"),
    EXECUTE_SEND("execute-send"),
    WIRE_FORMAT("wire-format"),
    REPEAT("repeat"),
    SET_EVENT_HEADERS("set-event-headers"),
    APPEND_CURRENT_EVENT("append-current-event"),
    EXECUTE_QUERY("execute-query");

    private final String externalName;

    StepType(String externalName) {
        this.externalName = externalName;
    }

    /**
     * Resolves a {@link StepType} by its {@link #externalName()} or enum {@link #name()}.
     *
     * @param value external name or enum name; must not be {@code null} or blank
     * @return matching step type
     * @throws WorkflowEngineException if the value is blank or does not match any known type
     */
    public static StepType from(String value) {
        if (value == null || value.isBlank()) {
            throw new WorkflowEngineException("Step type must not be blank");
        }
        for (StepType type : values()) {
            if (type.externalName.equals(value) || type.name().equals(value)) {
                return type;
            }
        }
        throw new WorkflowEngineException("Unsupported workflow step type: " + value);
    }

    /**
     * Returns the stable external name (kebab-case) used in persisted plans.
     *
     * @return external name (e.g. {@code set-field})
     */
    public String externalName() {
        return externalName;
    }
}
