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
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;

/**
 * Contract for execution plan step handler implementations.
 * <p>
 * Each implementation handles exactly one {@link StepType} and declares it via
 * {@link #supports()} so the dispatcher can auto-register it. Handlers read
 * configuration from the step definition, mutate runtime context state and perform
 * any side-effects. Constant fields define the standard configuration keys shared
 * across handlers.
 * <p>
 * <b>Adding a new step type:</b> add a value to {@link StepType}, create a
 * {@code @Component} implementing this interface, declare it via {@link #supports()}.
 * No registration change needed — the dispatcher picks it up automatically.
 */
public interface ExecutionPlanStepHandler {

    String CONDITION = "condition";
    String MESSAGE_TYPE = "messageType";
    String CONTENT_TYPE = "contentType";
    String SCHEMA_ID = "schemaId";
    String SCHEMA_DESCRIPTOR = "schemaDescriptor";
    String PROTOBUF_ROOT_MESSAGE = "protobufRootMessage";
    String SOURCE_PATH = "sourcePath";
    String TARGET_PATH = "targetPath";
    String HEADER = "header";
    String PAYLOAD = "payload";
    String CURRENT_EVENT_HEADERS = ExecutionStateKeys.CURRENT_EVENT_HEADERS;
    String KEY = "key";

    /**
     * The step type this handler services. Used by the dispatcher for auto-registration.
     */
    StepType supports();

    /**
     * Executes the logic for a single step within an execution plan.
     */
    void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context);
}
