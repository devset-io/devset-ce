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
 * Holds resolved protobuf schema descriptor metadata.
 * Shared across modules that need protobuf descriptor information.
 *
 * @param descriptor          Base64-encoded protobuf FileDescriptorSet
 * @param protobufRootMessage fully qualified name of the root message type
 */
public record ProtobufSchemaDescriptor(
        String descriptor,
        String protobufRootMessage
) {
}
