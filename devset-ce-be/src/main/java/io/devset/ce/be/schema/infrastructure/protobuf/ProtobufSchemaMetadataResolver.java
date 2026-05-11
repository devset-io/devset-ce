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

import com.google.protobuf.DescriptorProtos;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.experimental.UtilityClass;

import java.util.List;

/**
 * Utility for resolving protobuf schema metadata (descriptor and root message) from raw
 * schema text.
 * <p>
 * When the descriptor is missing, it is generated from the proto source via
 * {@link ProtoDescriptorUtils}. The first top-level message in the primary file is chosen
 * as the default root message name.
 */
@UtilityClass
public final class ProtobufSchemaMetadataResolver {

    /**
     * Resolves the Base64 descriptor and top-level root message for the given protobuf schema.
     *
     * @param schemaText       raw {@code .proto} source; must be non-blank
     * @param schemaDescriptor existing Base64 descriptor; generated from {@code schemaText} when blank
     * @return descriptor and resolved protobuf root message name
     * @throws WorkflowEngineException if the schema text is blank, the descriptor is invalid,
     *                                 or no top-level message is present
     */
    public static ProtobufSchemaMetadata resolve(String schemaText, String schemaDescriptor) {
        if (schemaText == null || schemaText.isBlank()) {
            throw new WorkflowEngineException("Schema body for type 'protobuf' must be a non-empty string");
        }
        String descriptorOutput = schemaDescriptor;
        if (descriptorOutput == null || descriptorOutput.isBlank()) {
            descriptorOutput = ProtoDescriptorUtils.generateDescriptorBase64(schemaText);
        }

        DescriptorProtos.FileDescriptorSet fileDescriptorSet = ProtobufDescriptorSetSupport.parseDescriptorSet(
                descriptorOutput,
                "Schema descriptor for type 'protobuf' must be valid Base64",
                "Schema descriptor for type 'protobuf' must be a valid FileDescriptorSet"
        );
        List<String> topLevelMessages = ProtobufDescriptorSetSupport.collectTopLevelMessageFullNames(fileDescriptorSet);
        if (topLevelMessages.isEmpty()) {
            throw new WorkflowEngineException("Protobuf schema does not contain any top-level message");
        }
        return new ProtobufSchemaMetadata(descriptorOutput, topLevelMessages.getFirst());
    }

    /**
     * Immutable pair of a Base64-encoded protobuf file descriptor set and the resolved
     * top-level root message full name.
     *
     * @param descriptor          Base64-encoded {@code FileDescriptorSet}
     * @param protobufRootMessage fully qualified name of the root protobuf message
     */
    public record ProtobufSchemaMetadata(
            String descriptor,
            String protobufRootMessage
    ) {
    }
}
