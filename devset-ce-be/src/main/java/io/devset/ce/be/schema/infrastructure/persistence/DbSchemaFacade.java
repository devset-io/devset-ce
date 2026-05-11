/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.schema.infrastructure.persistence;

import io.devset.ce.be.common.domain.ProtobufSchemaDescriptor;
import io.devset.ce.be.common.domain.SchemaType;
import io.devset.ce.be.common.domain.Stage;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.config.cache.CacheNames;
import io.devset.ce.be.schema.application.SchemaFacade;
import io.devset.ce.be.schema.domain.SchemaDefinition;
import io.devset.ce.be.schema.infrastructure.protobuf.ProtobufSchemaMetadataResolver;
import io.devset.ce.be.schema.infrastructure.protobuf.ProtobufSchemaMetadataResolver.ProtobufSchemaMetadata;
import io.devset.ce.be.workflow.application.WorkflowFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Database-backed implementation of {@link SchemaFacade}.
 * <p>
 * Manages JSON and Protobuf schema definitions stored in the {@code workflow_schema} table.
 * Validates schema body shape per type, resolves protobuf descriptors and root messages
 * via {@link ProtobufSchemaMetadataResolver}, and prevents removal of schemas referenced
 * by existing workflows.
 */
@Component
@RequiredArgsConstructor
public class DbSchemaFacade implements SchemaFacade {

    private final SchemaRepository repository;
    private final SchemaEntityMapper mapper;
    private final WorkflowFacade workflowFacade;

    @Override
    @Transactional
    @CacheEvict(cacheNames = {CacheNames.SCHEMA_LATEST_BY_ID, CacheNames.SCHEMA_ALL}, allEntries = true)
    public SchemaDefinition create(SchemaDefinition definition) {
        String schemaId = definition.id();
        if (schemaId == null || schemaId.isBlank()) {
            throw new WorkflowEngineException("Schema id must not be blank");
        }
        SchemaType schemaType = SchemaType.defaulted(definition.type());
        validateSchemaBody(schemaType, definition.schema());
        ProtobufSchemaMetadata descriptorResolution = resolveSchemaMetadata(
                schemaType,
                definition.schema(),
                definition.descriptor()
        );
        return repository.findFirstBySchemaIdOrderBySchemaVersionDesc(schemaId)
                .map(existing -> {
                    existing.replace(
                            schemaType.externalName(),
                            definition.schema(),
                            descriptorResolution.descriptor(),
                            descriptorResolution.protobufRootMessage()
                    );
                    return mapper.toDomain(repository.save(existing));
                })
                .orElseGet(() -> {
                    var newDefinition = new SchemaDefinition(
                            schemaId,
                            1,
                            schemaType,
                            definition.schema(),
                            descriptorResolution.descriptor(),
                            descriptorResolution.protobufRootMessage()
                    );
                    return mapper.toDomain(repository.save(mapper.toEntity(newDefinition)));
                });
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = {CacheNames.SCHEMA_LATEST_BY_ID, CacheNames.SCHEMA_ALL}, allEntries = true)
    public SchemaDefinition replace(SchemaDefinition definition) {
        String schemaId = definition.id();
        if (schemaId == null || schemaId.isBlank()) {
            throw new WorkflowEngineException("Schema id must not be blank");
        }
        SchemaEntity entity = repository.findFirstBySchemaIdOrderBySchemaVersionDesc(schemaId)
                .orElseThrow(() -> new WorkflowEngineException("Schema not found: " + schemaId));
        SchemaType schemaType = definition.type() != null ? definition.type() : SchemaType.defaulted(SchemaType.fromNullable(entity.getSchemaType()));
        validateSchemaBody(schemaType, definition.schema());
        ProtobufSchemaMetadata descriptorResolution = resolveSchemaMetadata(
                schemaType,
                definition.schema(),
                definition.descriptor()
        );
        entity.replace(
                schemaType.externalName(),
                definition.schema(),
                descriptorResolution.descriptor(),
                descriptorResolution.protobufRootMessage()
        );
        return mapper.toDomain(repository.save(entity));
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.SCHEMA_ALL)
    public List<SchemaDefinition> findAll() {
        return repository.findAllByOrderBySchemaIdAscSchemaVersionAsc()
                .stream()
                .map(mapper::toDomain)
                .toList();
    }

    @Override
    @Transactional
    @CacheEvict(cacheNames = {CacheNames.SCHEMA_LATEST_BY_ID, CacheNames.SCHEMA_ALL}, allEntries = true)
    public void delete(String schemaId) {
        if (schemaId == null || schemaId.isBlank()) {
            throw new WorkflowEngineException("Schema id must not be blank");
        }
        String workflowId = findFirstWorkflowUsingSchema(schemaId);
        if (workflowId != null) {
            throw new WorkflowEngineException("Schema cannot be removed because it is used by workflow: " + workflowId);
        }

        repository.findBySchemaId(schemaId).ifPresentOrElse(
                repository::delete,
                () -> {
                    throw new WorkflowEngineException("Schema not found: " + schemaId);
                }
        );
    }

    @Override
    @Transactional(readOnly = true)
    @Cacheable(cacheNames = CacheNames.SCHEMA_LATEST_BY_ID, key = "#schemaId")
    public SchemaDefinition loadLatest(String schemaId) {
        return repository.findFirstBySchemaIdOrderBySchemaVersionDesc(schemaId)
                .map(mapper::toDomain)
                .orElseThrow(() -> new WorkflowEngineException("Schema not found in DB: " + schemaId));
    }

    @Override
    @Transactional(readOnly = true)
    public ProtobufSchemaDescriptor loadProtobufDescriptor(String schemaId) {
        SchemaDefinition definition = loadLatest(schemaId);
        if (definition.type() != SchemaType.PROTOBUF) {
            throw new WorkflowEngineException("Schema must be protobuf for schemaId: " + schemaId);
        }
        String descriptor = definition.descriptor();
        if (descriptor == null || descriptor.isBlank()) {
            throw new WorkflowEngineException("Schema descriptor not found for schemaId: " + schemaId);
        }
        return new ProtobufSchemaDescriptor(descriptor, definition.protobufRootMessage());
    }

    @Override
    public ProtobufSchemaDescriptor resolveProtobufMetadata(String schemaText) {
        ProtobufSchemaMetadata resolved = ProtobufSchemaMetadataResolver.resolve(schemaText, null);
        return new ProtobufSchemaDescriptor(resolved.descriptor(), resolved.protobufRootMessage());
    }

    private String findFirstWorkflowUsingSchema(String schemaId) {
        return workflowFacade.listRequests()
                .stream()
                .filter(workflow -> schemaId.equals(workflow.schemaId()) || workflow.pipeline()
                        .stream()
                        .map(Stage::schemaId)
                        .anyMatch(schemaId::equals))
                .map(Workflow::id)
                .findFirst()
                .orElse(null);
    }

    private ProtobufSchemaMetadata resolveSchemaMetadata(
            SchemaType schemaType,
            Object schemaBody,
            String schemaDescriptor
    ) {
        if (schemaType != SchemaType.PROTOBUF) {
            return new ProtobufSchemaMetadata(schemaDescriptor, null);
        }
        return ProtobufSchemaMetadataResolver.resolve((String) schemaBody, schemaDescriptor);
    }

    private void validateSchemaBody(SchemaType schemaType, Object schemaBody) {
        if (schemaBody == null) {
            throw new WorkflowEngineException("Schema body must not be empty");
        }
        if (schemaType == SchemaType.JSON && !(schemaBody instanceof java.util.Map<?, ?>)) {
            throw new WorkflowEngineException("Schema body for type 'json' must be an object");
        }
        if (schemaType == SchemaType.PROTOBUF) {
            if (!(schemaBody instanceof String schemaText) || schemaText.isBlank()) {
                throw new WorkflowEngineException("Schema body for type 'protobuf' must be a non-empty string");
            }
        }
    }
}
