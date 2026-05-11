/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.api.dto;

/**
 * API DTO for schema creation when the id is supplied via the URL path.
 *
 * @param type                schema type name (JSON or Protobuf) or {@code null}
 * @param schema              raw schema contents (JSON tree or protobuf text)
 * @param descriptor          Base64-encoded protobuf FileDescriptorSet, if applicable
 * @param protobufRootMessage fully qualified protobuf root message name, if applicable
 */
public record SchemaCreateByPathRequestDto(
        String type,
        Object schema,
        String descriptor,
        String protobufRootMessage
) {}
