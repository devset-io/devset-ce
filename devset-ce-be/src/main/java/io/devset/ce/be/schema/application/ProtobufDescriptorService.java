/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.application;

import com.google.protobuf.Descriptors;
import org.springframework.lang.Nullable;

/**
 * Service for resolving protobuf message descriptors from Base64-encoded FileDescriptorSets.
 * <p>
 * Implemented by the schema infrastructure layer. Consumers in other modules
 * depend on this interface rather than importing infrastructure protobuf utilities directly.
 */
public interface ProtobufDescriptorService {

    /**
     * Resolves the top-level protobuf message descriptor from a Base64-encoded FileDescriptorSet.
     *
     * @param descriptorBase64    Base64-encoded protobuf FileDescriptorSet
     * @param protobufRootMessage optional root message name to select when multiple top-level messages exist
     * @param stepId              step identifier used in error messages
     * @return the resolved protobuf message descriptor
     */
    Descriptors.Descriptor resolveTopLevelMessageDescriptor(
            String descriptorBase64,
            @Nullable String protobufRootMessage,
            String stepId
    );
}
