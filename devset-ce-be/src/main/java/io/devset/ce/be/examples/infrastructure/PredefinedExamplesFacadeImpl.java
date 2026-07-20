/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.examples.infrastructure;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.collection.application.CollectionFacade;
import io.devset.ce.be.collection.domain.CollectionDefinition;
import io.devset.ce.be.common.domain.SchemaType;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.examples.application.PredefinedExamplesFacade;
import io.devset.ce.be.schema.application.SchemaFacade;
import io.devset.ce.be.schema.domain.SchemaDefinition;
import io.devset.ce.be.singlerequest.application.SingleRequestFacade;
import io.devset.ce.be.singlerequest.domain.SingleRequestDefinition;
import io.devset.ce.be.workflow.application.WorkflowFacade;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Seeds a fresh instance with predefined example data.
 * <p>
 * When the instance contains no schemas, workflows, collections and single requests,
 * creates an example JSON schema, an example Protobuf schema, an example workflow,
 * an {@code examples} collection and two example single requests (JSON and Protobuf),
 * so a first-time user always starts with working reference data. Example definitions
 * are bundled as classpath resources under {@code predefined/} and depend only on the
 * public facades of the other modules. A failing entry is logged and skipped.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PredefinedExamplesFacadeImpl implements PredefinedExamplesFacade {

    private static final String EXAMPLES_COLLECTION = "examples";

    private final SchemaFacade schemaFacade;
    private final WorkflowFacade workflowFacade;
    private final CollectionFacade collectionFacade;
    private final SingleRequestFacade singleRequestFacade;
    private final ObjectMapper objectMapper;

    @Override
    public void seedFreshInstance() {
        if (!isFreshInstance()) {
            log.debug("Skipping predefined examples: instance already contains data");
            return;
        }
        create("JSON schema", () -> schemaFacade.create(new SchemaDefinition(
                "example-json-schema", 1, SchemaType.JSON,
                readMap("predefined/example-json-schema.json"), null)));
        create("Protobuf schema", () -> schemaFacade.create(new SchemaDefinition(
                "example-protobuf-schema", 1, SchemaType.PROTOBUF,
                readText("predefined/example-protobuf-schema.proto"), null)));
        create("workflow", () -> workflowFacade.createRequest(
                read("predefined/example-workflow.json", Workflow.class)));
        create("collection", () -> collectionFacade.create(
                new CollectionDefinition(EXAMPLES_COLLECTION, Map.of("status", "OPEN"))));
        create("JSON single request", () -> singleRequestFacade.save(
                read("predefined/example-single-request-json.json", SingleRequestDefinition.class)));
        create("Protobuf single request", () -> singleRequestFacade.save(
                read("predefined/example-single-request-protobuf.json", SingleRequestDefinition.class)));
    }

    private boolean isFreshInstance() {
        return schemaFacade.findAll().isEmpty()
                && workflowFacade.listRequests().isEmpty()
                && collectionFacade.getAll().isEmpty()
                && singleRequestFacade.getAll().isEmpty();
    }

    private void create(String kind, Runnable action) {
        try {
            action.run();
            log.info("Created predefined example {}", kind);
        } catch (RuntimeException e) {
            log.warn("Failed to create predefined example {}: {}", kind, e.getMessage());
        }
    }

    private <T> T read(String path, Class<T> type) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return objectMapper.readValue(in, type);
        } catch (IOException e) {
            throw new WorkflowEngineException("Cannot read predefined example resource: " + path, e);
        }
    }

    private Map<String, Object> readMap(String path) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return objectMapper.readValue(in, new TypeReference<LinkedHashMap<String, Object>>() {
            });
        } catch (IOException e) {
            throw new WorkflowEngineException("Cannot read predefined example resource: " + path, e);
        }
    }

    private String readText(String path) {
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new WorkflowEngineException("Cannot read predefined example resource: " + path, e);
        }
    }
}
