/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.api.dto;

import io.devset.ce.be.common.domain.WorkflowContentType;

/**
 * API DTO returned after executing a single step.
 * Carries identifiers correlating the execution with the persisted history.
 *
 * @param historyId           persisted history entry identifier
 * @param runId               underlying engine run identifier
 * @param status              textual run status
 * @param executions          number of executions that were requested
 * @param workflowId          synthetic or provided workflow identifier
 * @param contentType         content type used for serialization
 * @param schemaId            registered schema id, when resolved from the registry
 * @param protoSchema         inline protobuf schema text, when provided
 * @param protobufRootMessage root protobuf message name, when applicable
 */
public record SingleStepExecuteResponseDto(
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
