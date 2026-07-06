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

import io.devset.ce.be.common.domain.WorkflowEngineException;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;
import java.util.Comparator;

/**
 * Utility for compiling raw {@code .proto} source into a Base64-encoded
 * {@code FileDescriptorSet} by invoking the external {@code protoc} binary.
 * <p>
 * Writes the proto source to a temporary working directory, runs {@code protoc} with
 * {@code --include_imports}, reads the generated descriptor file and returns it as
 * Base64. The working directory is cleaned up on completion even on failure.
 */
public final class ProtoDescriptorUtils {

    private static final String DEFAULT_PROTO_FILE = "schema.proto";
    private static final String DEFAULT_DESCRIPTOR_FILE = "schema.desc";
    private static final String PROTOC_PATH_PROPERTY = "devset.protoc.path";
    private static final String PROTOC_PATH_ENV = "DEVSET_PROTOC_PATH";

    private ProtoDescriptorUtils() {
    }

    /**
     * Resolves the {@code protoc} binary to invoke. Uses the {@code devset.protoc.path}
     * system property or the {@code DEVSET_PROTOC_PATH} environment variable when set
     * (an absolute path is recommended), otherwise falls back to {@code protoc}
     * resolved from the system PATH.
     *
     * @return path or name of the {@code protoc} binary
     */
    private static String resolveProtocBinary() {
        String configured = System.getProperty(PROTOC_PATH_PROPERTY, System.getenv(PROTOC_PATH_ENV));
        return configured == null || configured.isBlank() ? "protoc" : configured;
    }

    /**
     * Compiles the given proto source using the default file name and returns the
     * Base64-encoded descriptor set.
     *
     * @param protoSchema {@code .proto} source text
     * @return Base64-encoded {@code FileDescriptorSet}
     * @throws WorkflowEngineException if compilation fails or {@code protoc} is unavailable
     */
    public static String generateDescriptorBase64(String protoSchema) {
        return generateDescriptorBase64(protoSchema, DEFAULT_PROTO_FILE);
    }

    /**
     * Compiles the given proto source with an explicit file name and returns the
     * Base64-encoded descriptor set.
     *
     * @param protoSchema   {@code .proto} source text; must not be blank
     * @param protoFileName target file name for the source; must end in {@code .proto}
     * @return Base64-encoded {@code FileDescriptorSet}
     * @throws WorkflowEngineException if input is invalid, compilation fails or {@code protoc} is unavailable
     */
    public static String generateDescriptorBase64(String protoSchema, String protoFileName) {
        if (protoSchema == null || protoSchema.isBlank()) {
            throw new WorkflowEngineException("Proto schema must not be blank");
        }
        if (protoFileName == null || protoFileName.isBlank()) {
            throw new WorkflowEngineException("Proto file name must not be blank");
        }
        if (!protoFileName.endsWith(".proto")) {
            throw new WorkflowEngineException("Proto file name must end with .proto");
        }

        Path workDir = null;
        try {
            workDir = Files.createTempDirectory("proto-descriptor-");
            Path protoPath = workDir.resolve(protoFileName);
            Path descriptorPath = workDir.resolve(DEFAULT_DESCRIPTOR_FILE);
            Files.writeString(protoPath, protoSchema, StandardCharsets.UTF_8);

            Process process = new ProcessBuilder(
                    resolveProtocBinary(),
                    "--include_imports",
                    "--descriptor_set_out=" + descriptorPath.toAbsolutePath(),
                    "--proto_path=" + workDir.toAbsolutePath(),
                    protoFileName
            )
                    .directory(workDir.toFile())
                    .redirectErrorStream(true)
                    .start();

            String output = new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            int exitCode = process.waitFor();
            if (exitCode != 0) {
                throw new WorkflowEngineException("Failed to generate protobuf descriptor: " + output.trim());
            }

            byte[] descriptor = Files.readAllBytes(descriptorPath);
            return Base64.getEncoder().encodeToString(descriptor);
        } catch (IOException exception) {
            throw new WorkflowEngineException("Failed to generate protobuf descriptor. Ensure protoc is installed and available in PATH, or set DEVSET_PROTOC_PATH.");
        } catch (InterruptedException exception) {
            Thread.currentThread().interrupt();
            throw new WorkflowEngineException("Descriptor generation interrupted");
        } finally {
            deleteQuietly(workDir);
        }
    }

    /**
     * Checks whether the {@code protoc} compiler is available.
     *
     * @return {@code true} if {@code protoc --version} executes successfully
     */
    public static boolean isProtocAvailable() {
        try {
            Process process = new ProcessBuilder(resolveProtocBinary(), "--version")
                    .redirectErrorStream(true)
                    .start();
            int exitCode = process.waitFor();
            return exitCode == 0;
        } catch (IOException | InterruptedException exception) {
            if (exception instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            return false;
        }
    }

    private static void deleteQuietly(Path path) {
        if (path == null || !Files.exists(path)) {
            return;
        }
        try (var output = Files.walk(path)) {
            output.sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(file -> {
                        if (!file.delete()) {
                            file.deleteOnExit();
                        }
                    });
        } catch (IOException ignored) {
            // no-op
        }
    }
}
