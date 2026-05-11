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

import com.fasterxml.jackson.databind.ObjectMapper;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.SetFieldExpressionResolver;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.engine.application.steps.impl.query.QueryFilterResolver;
import io.devset.ce.be.engine.application.steps.impl.query.QueryProjectionBuilder;
import io.devset.ce.be.engine.application.steps.impl.query.QuerySelectApplier;
import io.devset.ce.be.engine.testutil.RuntimeContextBuilder;
import io.devset.ce.be.engine.testutil.StepBuilder;
import io.devset.ce.be.mongodb.application.MongoDbFacade;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryRequestDto;
import io.devset.ce.be.mongodb.application.dto.MongoDbQueryResultDto;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ExecuteQueryStepHandlerTest {

    private final MongoDbFacade mongoDbFacade = mock(MongoDbFacade.class);
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final SetFieldExpressionResolver expressionResolver = new SetFieldExpressionResolver();
    private final QueryFilterResolver filterResolver = new QueryFilterResolver(objectMapper, expressionResolver);
    private final QueryProjectionBuilder projectionBuilder = new QueryProjectionBuilder(objectMapper);
    private final QuerySelectApplier selectApplier = new QuerySelectApplier(filterResolver);
    private final ExecuteQueryStepHandler handler = new ExecuteQueryStepHandler(
            new StepSupport(), mongoDbFacade, filterResolver, projectionBuilder, selectApplier
    );

    @Test
    void shouldQueryAndMapSelectFieldsToState() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();
        when(mongoDbFacade.executeQuery(any(MongoDbQueryRequestDto.class)))
                .thenReturn(new MongoDbQueryResultDto(
                        List.of(Map.of("email", "alice@mail.com", "phone", "+48123")),
                        1
                ));

        handler.handle(StepBuilder.step("q-1", StepType.EXECUTE_QUERY)
                .config("connectionName", "my-mongo")
                .config("database", "mydb")
                .config("collection", "users")
                .config("find", Map.of("status", "active"))
                .config("select", Map.of(
                        "state.userEmail", "email",
                        "state.userPhone", "phone"
                ))
                .build(), context);

        assertEquals("alice@mail.com", context.state().get("state.userEmail"));
        assertEquals("+48123", context.state().get("state.userPhone"));
        assertEquals(1L, context.state().get(ExecutionStateKeys.META_LAST_QUERY + ".count"));
    }

    @Test
    void shouldResolvePathInFindFilter() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context()
                .with("currentEvent.userId", "user-42")
                .build();
        when(mongoDbFacade.executeQuery(any(MongoDbQueryRequestDto.class)))
                .thenReturn(new MongoDbQueryResultDto(List.of(Map.of("name", "Alice")), 1));

        handler.handle(StepBuilder.step("q-2", StepType.EXECUTE_QUERY)
                .config("connectionName", "my-mongo")
                .config("database", "mydb")
                .config("collection", "users")
                .config("find", Map.of("userId", Map.of("$path", "currentEvent.userId")))
                .config("select", Map.of("state.name", "name"))
                .build(), context);

        verify(mongoDbFacade).executeQuery(
                new MongoDbQueryRequestDto("my-mongo", "mydb", "users",
                        "{\"userId\":\"user-42\"}", "{\"name\":1,\"_id\":0}", 1)
        );
    }

    @Test
    void shouldUseDefaultWhenPathNotFoundInFind() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();
        when(mongoDbFacade.executeQuery(any(MongoDbQueryRequestDto.class)))
                .thenReturn(new MongoDbQueryResultDto(List.of(Map.of("name", "Guest")), 1));

        handler.handle(StepBuilder.step("q-3", StepType.EXECUTE_QUERY)
                .config("connectionName", "my-mongo")
                .config("database", "mydb")
                .config("collection", "users")
                .config("find", Map.of("userId", Map.of("$path", "currentEvent.missing", "default", "guest")))
                .config("select", Map.of("state.name", "name"))
                .build(), context);

        verify(mongoDbFacade).executeQuery(
                new MongoDbQueryRequestDto("my-mongo", "mydb", "users",
                        "{\"userId\":\"guest\"}", "{\"name\":1,\"_id\":0}", 1)
        );
    }

    @Test
    void shouldUsePathDefaultInFind() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context()
                .withMap("state", Map.of("fallbackId", "fallback-99"))
                .build();
        when(mongoDbFacade.executeQuery(any(MongoDbQueryRequestDto.class)))
                .thenReturn(new MongoDbQueryResultDto(List.of(Map.of("name", "Fallback")), 1));

        handler.handle(StepBuilder.step("q-4", StepType.EXECUTE_QUERY)
                .config("connectionName", "my-mongo")
                .config("database", "mydb")
                .config("collection", "users")
                .config("find", Map.of("userId", Map.of(
                        "$path", "currentEvent.missing",
                        "default", Map.of("$path", "state.fallbackId")
                )))
                .config("select", Map.of("state.name", "name"))
                .build(), context);

        verify(mongoDbFacade).executeQuery(
                new MongoDbQueryRequestDto("my-mongo", "mydb", "users",
                        "{\"userId\":\"fallback-99\"}", "{\"name\":1,\"_id\":0}", 1)
        );
    }

    @Test
    void shouldPassMongoOperatorsThrough() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context()
                .withMap("state", Map.of("minAge", 22))
                .build();
        when(mongoDbFacade.executeQuery(any(MongoDbQueryRequestDto.class)))
                .thenReturn(new MongoDbQueryResultDto(List.of(Map.of("name", "Alice")), 1));

        handler.handle(StepBuilder.step("q-5", StepType.EXECUTE_QUERY)
                .config("connectionName", "my-mongo")
                .config("database", "mydb")
                .config("collection", "users")
                .config("find", Map.of("wiek", Map.of("$gt", Map.of("$path", "state.minAge"))))
                .config("select", Map.of("state.name", "name"))
                .build(), context);

        verify(mongoDbFacade).executeQuery(
                new MongoDbQueryRequestDto("my-mongo", "mydb", "users",
                        "{\"wiek\":{\"$gt\":22}}", "{\"name\":1,\"_id\":0}", 1)
        );
    }

    @Test
    void shouldApplySelectDefaultWhenNoDocumentFound() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();
        when(mongoDbFacade.executeQuery(any(MongoDbQueryRequestDto.class)))
                .thenReturn(new MongoDbQueryResultDto(List.of(), 0));

        handler.handle(StepBuilder.step("q-6", StepType.EXECUTE_QUERY)
                .config("connectionName", "my-mongo")
                .config("database", "mydb")
                .config("collection", "users")
                .config("select", Map.of(
                        "state.userEmail", Map.of("field", "email", "default", "no-reply@devset.io")
                ))
                .build(), context);

        assertEquals("no-reply@devset.io", context.state().get("state.userEmail"));
    }

    @Test
    void shouldThrowWhenNoDocumentAndNoDefault() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();
        when(mongoDbFacade.executeQuery(any(MongoDbQueryRequestDto.class)))
                .thenReturn(new MongoDbQueryResultDto(List.of(), 0));

        WorkflowEngineException ex = assertThrows(
                WorkflowEngineException.class,
                () -> handler.handle(StepBuilder.step("q-11", StepType.EXECUTE_QUERY)
                        .config("connectionName", "my-mongo")
                        .config("database", "mydb")
                        .config("collection", "users")
                        .config("select", Map.of("state.userName", "name"))
                        .build(), context)
        );

        assertEquals(
                "Query returned no documents. State path 'state.userName' was not populated."
                        + " Configure a default value in the select mapping to handle empty results,"
                        + " e.g.: {\"field\": \"name\", \"default\": null}",
                ex.getMessage()
        );
    }

    @Test
    void shouldApplySelectDefaultFromPath() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context()
                .withMap("state", Map.of("fallbackEmail", "fallback@devset.io"))
                .build();
        when(mongoDbFacade.executeQuery(any(MongoDbQueryRequestDto.class)))
                .thenReturn(new MongoDbQueryResultDto(List.of(), 0));

        handler.handle(StepBuilder.step("q-7", StepType.EXECUTE_QUERY)
                .config("connectionName", "my-mongo")
                .config("database", "mydb")
                .config("collection", "users")
                .config("select", Map.of(
                        "state.userEmail", Map.of(
                                "field", "email",
                                "default", Map.of("$path", "state.fallbackEmail")
                        )
                ))
                .build(), context);

        assertEquals("fallback@devset.io", context.state().get("state.userEmail"));
    }

    @Test
    void shouldSkipQueryInSimulationMode() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context()
                .simulationMode(true)
                .build();

        handler.handle(StepBuilder.step("q-8", StepType.EXECUTE_QUERY)
                .config("connectionName", "my-mongo")
                .config("database", "mydb")
                .config("collection", "users")
                .build(), context);

        verify(mongoDbFacade, never()).executeQuery(any());
        assertEquals(0L, context.state().get(ExecutionStateKeys.META_LAST_QUERY + ".count"));
        assertEquals(true, context.state().get(ExecutionStateKeys.META_LAST_QUERY + ".simulated"));
    }

    @Test
    void shouldThrowWhenConnectionNameMissing() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> handler.handle(StepBuilder.step("q-9", StepType.EXECUTE_QUERY)
                        .config("database", "mydb")
                        .config("collection", "users")
                        .build(), context)
        );

        assertEquals("Missing config 'connectionName' for step: q-9", output.getMessage());
    }

    @Test
    void shouldResolveExpressionInFindFilter() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();
        when(mongoDbFacade.executeQuery(any(MongoDbQueryRequestDto.class)))
                .thenReturn(new MongoDbQueryResultDto(List.of(Map.of("name", "Alice")), 1));

        handler.handle(StepBuilder.step("q-expr", StepType.EXECUTE_QUERY)
                .config("connectionName", "my-mongo")
                .config("database", "mydb")
                .config("collection", "users")
                .config("find", Map.of("status", Map.of("$fn", "choice(active,inactive)")))
                .config("select", Map.of("state.name", "name"))
                .build(), context);

        var captor = org.mockito.ArgumentCaptor.forClass(MongoDbQueryRequestDto.class);
        verify(mongoDbFacade).executeQuery(captor.capture());
        String filter = captor.getValue().filter();
        org.assertj.core.api.Assertions.assertThat(filter)
                .matches("\\{\"status\":\"(active|inactive)\"\\}");
    }

    @Test
    void shouldQueryWithEmptyFindWhenNotProvided() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();
        when(mongoDbFacade.executeQuery(any(MongoDbQueryRequestDto.class)))
                .thenReturn(new MongoDbQueryResultDto(List.of(Map.of("name", "Alice")), 1));

        handler.handle(StepBuilder.step("q-10", StepType.EXECUTE_QUERY)
                .config("connectionName", "my-mongo")
                .config("database", "mydb")
                .config("collection", "users")
                .config("select", Map.of("state.name", "name"))
                .build(), context);

        verify(mongoDbFacade).executeQuery(
                new MongoDbQueryRequestDto("my-mongo", "mydb", "users",
                        "{}", "{\"name\":1,\"_id\":0}", 1)
        );
    }
}
