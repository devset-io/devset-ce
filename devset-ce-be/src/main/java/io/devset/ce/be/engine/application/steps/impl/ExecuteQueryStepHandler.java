/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application.steps.impl;

import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.engine.application.steps.impl.query.QueryFilterResolver;
import io.devset.ce.be.engine.application.steps.impl.query.QueryProjectionBuilder;
import io.devset.ce.be.engine.application.steps.impl.query.QuerySelectApplier;
import io.devset.ce.be.mongodb.application.MongoDbFacade;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryRequestDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryResultDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Handles {@code execute-query} steps that fetch one document from a database
 * and map selected fields into state.
 * <p>
 * Filter resolution, projection building, and select application are delegated
 * to {@link QueryFilterResolver}, {@link QueryProjectionBuilder}, and
 * {@link QuerySelectApplier} respectively.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public final class ExecuteQueryStepHandler implements ExecutionPlanStepHandler {

    private static final String CONNECTION_NAME = "connectionName";
    private static final String DATABASE = "database";
    private static final String COLLECTION = "collection";
    private static final String FIND = "find";
    private static final String SELECT = "select";

    private final StepSupport stepSupport;
    private final MongoDbFacade mongoDbFacade;
    private final QueryFilterResolver filterResolver;
    private final QueryProjectionBuilder projectionBuilder;
    private final QuerySelectApplier selectApplier;

    @Override
    public StepType supports() {
        return StepType.EXECUTE_QUERY;
    }

    @Override
    public void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context) {
        String connectionName = stepSupport.requiredText(step, CONNECTION_NAME);
        String database = stepSupport.requiredText(step, DATABASE);
        String collection = stepSupport.requiredText(step, COLLECTION);

        @SuppressWarnings("unchecked")
        Map<String, Object> findConfig = (Map<String, Object>) step.config().getOrDefault(FIND, Map.of());
        @SuppressWarnings("unchecked")
        Map<String, Object> selectConfig = (Map<String, Object>) step.config().getOrDefault(SELECT, Map.of());

        String resolvedFilter = filterResolver.resolve(findConfig, context, step.id());
        String projection = projectionBuilder.build(selectConfig);

        if (context.simulationMode()) {
            writeMetadata(context, connectionName, database, collection, 0);
            return;
        }

        MongoDbQueryResultDto result = mongoDbFacade.executeQuery(
                new MongoDbQueryRequestDto(connectionName, database, collection, resolvedFilter, projection, 1)
        );

        Map<String, Object> document = result.documents().isEmpty() ? null : result.documents().getFirst();
        selectApplier.apply(selectConfig, document, context);
        writeMetadata(context, connectionName, database, collection, result.count());
    }

    private void writeMetadata(
            ExecutionPlanRuntimeContext context,
            String connectionName,
            String database,
            String collection,
            long count
    ) {
        String prefix = ExecutionStateKeys.META_LAST_QUERY;
        context.state().put(prefix + ".count", count);
        context.state().put(prefix + ".collection", collection);
        context.state().put(prefix + ".database", database);
        context.state().put(prefix + ".connectionName", connectionName);
        context.state().put(prefix + ".simulated", context.simulationMode());
    }
}
