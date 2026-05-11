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
import com.google.protobuf.Descriptors;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.experimental.UtilityClass;
import org.springframework.lang.Nullable;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Utility for resolving a runtime {@link Descriptors.Descriptor} from a Base64-encoded
 * protobuf {@code FileDescriptorSet}.
 * <p>
 * Handles single top-level message cases automatically and supports disambiguation
 * via explicit {@code protobufRootMessage} (full or simple name) when multiple
 * top-level messages are present.
 */
@UtilityClass
public final class ProtobufMessageDescriptorResolver {

    /**
     * Resolves the top-level protobuf message descriptor to use for serialization.
     * <p>
     * If the descriptor set contains a single top-level message, it is returned.
     * Otherwise, {@code protobufRootMessage} is matched first by full name, then by
     * simple name. Ambiguous or missing matches raise {@link WorkflowEngineException}.
     *
     * @param descriptorBase64    Base64-encoded protobuf {@code FileDescriptorSet}
     * @param protobufRootMessage optional explicit root message name (full or simple)
     * @param stepId              step identifier used in error messages
     * @return the resolved message descriptor
     * @throws WorkflowEngineException if the descriptor is invalid, empty, or cannot be disambiguated
     */
    public static Descriptors.Descriptor resolveTopLevelMessageDescriptor(String descriptorBase64, @Nullable String protobufRootMessage, String stepId) {
        try {
            DescriptorProtos.FileDescriptorSet descriptorSet = ProtobufDescriptorSetSupport.parseDescriptorSet(descriptorBase64, "Schema descriptor is not valid Base64 for step: " + stepId, "Schema descriptor is not a valid FileDescriptorSet for step: " + stepId);
            Map<String, Descriptors.FileDescriptor> fileDescriptors = resolveFileDescriptors(descriptorSet);

            List<Descriptors.Descriptor> topLevelDescriptors = ProtobufDescriptorSetSupport.collectTopLevelMessageDescriptors(descriptorSet, fileDescriptors);
            if (topLevelDescriptors.isEmpty()) {
                throw new WorkflowEngineException("No protobuf top-level message found in descriptor for step: " + stepId);
            }
            if (topLevelDescriptors.size() == 1) {
                return topLevelDescriptors.getFirst();
            }

            if (protobufRootMessage != null && !protobufRootMessage.isBlank()) {
                Descriptors.Descriptor selectedDescriptor = findByMessageName(topLevelDescriptors, protobufRootMessage);
                if (selectedDescriptor != null) {
                    return selectedDescriptor;
                }
                throw new WorkflowEngineException("Configured protobufRootMessage '" + protobufRootMessage + "' not found in schema descriptor for step: " + stepId);
            }

            return topLevelDescriptors.getFirst();
        } catch (Descriptors.DescriptorValidationException exception) {
            throw new WorkflowEngineException("Schema descriptor is invalid for step: " + stepId);
        }
    }

    private static Map<String, Descriptors.FileDescriptor> resolveFileDescriptors(DescriptorProtos.FileDescriptorSet descriptorSet) throws Descriptors.DescriptorValidationException {
        Map<String, DescriptorProtos.FileDescriptorProto> state = new HashMap<>();
        for (DescriptorProtos.FileDescriptorProto object : descriptorSet.getFileList()) {
            state.put(object.getName(), object);
        }
        Map<String, Descriptors.FileDescriptor> cache = new HashMap<>();
        for (String object : state.keySet()) {
            buildFileDescriptor(object, state, cache);
        }
        return cache;
    }

    private static Descriptors.FileDescriptor buildFileDescriptor(String fileName, Map<String, DescriptorProtos.FileDescriptorProto> state, Map<String, Descriptors.FileDescriptor> cache) throws Descriptors.DescriptorValidationException {
        Descriptors.FileDescriptor output = cache.get(fileName);
        if (output != null) {
            return output;
        }

        DescriptorProtos.FileDescriptorProto input = state.get(fileName);
        if (input == null) {
            throw new WorkflowEngineException("Missing protobuf dependency descriptor: " + fileName);
        }

        Descriptors.FileDescriptor[] dependencies = new Descriptors.FileDescriptor[input.getDependencyCount()];
        for (int index = 0; index < input.getDependencyCount(); index++) {
            String dependency = input.getDependency(index);
            dependencies[index] = buildFileDescriptor(dependency, state, cache);
        }

        Descriptors.FileDescriptor result = Descriptors.FileDescriptor.buildFrom(input, dependencies);
        cache.put(fileName, result);
        return result;
    }

    @Nullable
    private static Descriptors.Descriptor findByMessageName(List<Descriptors.Descriptor> descriptors, @Nullable String messageName) {
        if (messageName == null || messageName.isBlank()) {
            return null;
        }

        Descriptors.Descriptor fullNameMatch = null;
        int fullNameMatches = 0;
        Descriptors.Descriptor simpleNameMatch = null;
        int simpleNameMatches = 0;
        for (Descriptors.Descriptor descriptor : descriptors) {
            if (messageName.equals(descriptor.getFullName())) {
                fullNameMatch = descriptor;
                fullNameMatches++;
            }
            if (messageName.equals(descriptor.getName())) {
                simpleNameMatch = descriptor;
                simpleNameMatches++;
            }
        }

        if (fullNameMatches == 1) {
            return fullNameMatch;
        }
        if (simpleNameMatches == 1) {
            return simpleNameMatch;
        }
        return null;
    }
}
