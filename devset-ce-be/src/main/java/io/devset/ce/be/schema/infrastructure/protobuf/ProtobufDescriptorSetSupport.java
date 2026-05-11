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
import com.google.protobuf.InvalidProtocolBufferException;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Package-private helper for parsing and inspecting protobuf {@code FileDescriptorSet}
 * byte representations.
 * <p>
 * Provides Base64 decoding with descriptive error mapping, primary file selection
 * (files that are not imported as dependencies), and top-level message extraction in
 * both metadata (full names) and runtime descriptor forms.
 */
@UtilityClass
final class ProtobufDescriptorSetSupport {

    static DescriptorProtos.FileDescriptorSet parseDescriptorSet(
            String descriptorBase64,
            String invalidBase64Error,
            String invalidDescriptorError
    ) {
        try {
            return DescriptorProtos.FileDescriptorSet.parseFrom(Base64.getDecoder().decode(descriptorBase64));
        } catch (IllegalArgumentException exception) {
            throw new WorkflowEngineException(invalidBase64Error);
        } catch (InvalidProtocolBufferException exception) {
            throw new WorkflowEngineException(invalidDescriptorError);
        }
    }

    static List<DescriptorProtos.FileDescriptorProto> selectPrimaryFiles(
            DescriptorProtos.FileDescriptorSet descriptorSet
    ) {
        Set<String> dependencyFileNames = new LinkedHashSet<>();
        for (DescriptorProtos.FileDescriptorProto file : descriptorSet.getFileList()) {
            dependencyFileNames.addAll(file.getDependencyList());
        }

        List<DescriptorProtos.FileDescriptorProto> output = new ArrayList<>();
        for (DescriptorProtos.FileDescriptorProto file : descriptorSet.getFileList()) {
            if (!dependencyFileNames.contains(file.getName())) {
                output.add(file);
            }
        }
        if (!output.isEmpty()) {
            return output;
        }
        return descriptorSet.getFileList();
    }

    static List<String> collectTopLevelMessageFullNames(
            DescriptorProtos.FileDescriptorSet descriptorSet
    ) {
        List<String> output = new ArrayList<>();
        for (DescriptorProtos.FileDescriptorProto file : selectPrimaryFiles(descriptorSet)) {
            for (DescriptorProtos.DescriptorProto messageType : file.getMessageTypeList()) {
                String simpleName = messageType.getName();
                if (simpleName == null || simpleName.isBlank()) {
                    continue;
                }
                String packageName = file.getPackage();
                if (packageName == null || packageName.isBlank()) {
                    output.add(simpleName);
                } else {
                    output.add(packageName + "." + simpleName);
                }
            }
        }
        return output;
    }

    static List<Descriptors.Descriptor> collectTopLevelMessageDescriptors(
            DescriptorProtos.FileDescriptorSet descriptorSet,
            Map<String, Descriptors.FileDescriptor> fileDescriptors
    ) {
        List<Descriptors.Descriptor> output = new ArrayList<>();
        for (DescriptorProtos.FileDescriptorProto file : selectPrimaryFiles(descriptorSet)) {
            Descriptors.FileDescriptor descriptor = fileDescriptors.get(file.getName());
            if (descriptor == null) {
                continue;
            }
            for (Descriptors.Descriptor messageType : descriptor.getMessageTypes()) {
                if (!messageType.getOptions().getMapEntry()) {
                    output.add(messageType);
                }
            }
        }
        return output;
    }
}
