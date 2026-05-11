/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.domain;

import io.devset.ce.be.common.domain.WorkflowContentType;

/**
 * Outcome of an ad-hoc single step execution.
 * <p>
 * Returned by the single step facade after dispatching the request. Carries the run
 * and history identifiers so callers can correlate the execution with persisted
 * history entries.
 *
 * @param historyId           unique identifier of the persisted history entry
 * @param runId               identifier of the underlying engine run
 * @param status              textual status of the run
 * @param executions          number of executions that were requested
 * @param workflowId          synthetic or provided workflow identifier
 * @param contentType         content type used for serialization
 * @param schemaId            registered schema id when resolved from the registry
 * @param protoSchema         inline protobuf schema text when provided
 * @param protobufRootMessage root protobuf message name when applicable
 */
public record SingleStepExecutionResult(
        String historyId,
        String runId,
        String status,
        int executions,
        String workflowId,
        WorkflowContentType contentType,
        String schemaId,
        String protoSchema,
        String protobufRootMessage
) {
}
