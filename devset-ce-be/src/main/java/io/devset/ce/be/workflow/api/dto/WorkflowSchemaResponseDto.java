/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.api.dto;

import io.devset.ce.be.common.domain.SchemaType;

/**
 * API DTO for schema create/replace requests and read responses.
 *
 * @param id                  schema identifier
 * @param version             monotonic schema version
 * @param type                schema type (JSON or Protobuf)
 * @param schema              raw schema contents (JSON tree or protobuf source text)
 * @param descriptor          Base64-encoded protobuf FileDescriptorSet, if applicable
 * @param protobufRootMessage fully qualified protobuf root message name, if applicable
 */
public record WorkflowSchemaResponseDto(
        String id,
        Integer version,
        SchemaType type,
        Object schema,
        String descriptor,
        String protobufRootMessage
) {

}
