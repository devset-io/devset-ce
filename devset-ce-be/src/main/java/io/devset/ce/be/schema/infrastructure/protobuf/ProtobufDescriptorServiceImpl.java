/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.infrastructure.protobuf;

import com.google.protobuf.Descriptors;
import io.devset.ce.be.schema.application.ProtobufDescriptorService;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Component;

/**
 * Infrastructure implementation of {@link ProtobufDescriptorService}.
 * <p>
 * Delegates to {@link ProtobufMessageDescriptorResolver} for actual protobuf
 * descriptor resolution from Base64-encoded FileDescriptorSets.
 */
@Component
public class ProtobufDescriptorServiceImpl implements ProtobufDescriptorService {

    @Override
    public Descriptors.Descriptor resolveTopLevelMessageDescriptor(
            String descriptorBase64,
            @Nullable String protobufRootMessage,
            String stepId
    ) {
        return ProtobufMessageDescriptorResolver.resolveTopLevelMessageDescriptor(
                descriptorBase64,
                protobufRootMessage,
                stepId
        );
    }
}
