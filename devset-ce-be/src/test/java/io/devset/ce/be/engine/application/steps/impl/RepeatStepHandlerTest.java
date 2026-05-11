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
import io.devset.ce.be.engine.application.steps.StepHandlerRegistry;
import io.devset.ce.be.engine.application.steps.helpers.ConditionEvaluator;
import io.devset.ce.be.engine.application.steps.helpers.ExecutionPlanRuntimeContext;
import io.devset.ce.be.engine.application.steps.helpers.StepSupport;
import io.devset.ce.be.engine.testutil.RuntimeContextBuilder;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

class RepeatStepHandlerTest {

    private final StepHandlerRegistry handlers = mock(StepHandlerRegistry.class);
    private final RepeatStepHandler handler = new RepeatStepHandler(
            new StepSupport(),
            handlers,
            new ConditionEvaluator()
    );

    @Test
    void shouldRepeatStepsNTimes() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "repeat-1",
                StepType.REPEAT,
                Map.of(
                        "times", 3,
                        "steps", List.of(nestedWaitStep("inner-1"))
                ),
                "open"
        ), context);

        verify(handlers, times(3)).handle(any(), eq(context));
    }

    @Test
    void shouldStopOnCondition() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "repeat-2",
                StepType.REPEAT,
                Map.of(
                        "times", 10,
                        "steps", List.of(nestedWaitStep("inner-1")),
                        "repeatUntil", Map.of("$fn", "gte(meta.loop.currentIteration,2)")
                ),
                "open"
        ), context);

        verify(handlers, times(2)).handle(any(), eq(context));
    }

    @Test
    void shouldHandleNestedSteps() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "repeat-3",
                StepType.REPEAT,
                Map.of(
                        "times", 1,
                        "steps", List.of(
                                nestedWaitStep("inner-1"),
                                nestedWaitStep("inner-2"),
                                nestedWaitStep("inner-3")
                        )
                ),
                "open"
        ), context);

        verify(handlers, times(3)).handle(any(), eq(context));
    }

    @Test
    void shouldNotRepeatWhenTimesIsZero() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "repeat-4",
                StepType.REPEAT,
                Map.of(
                        "times", 0,
                        "steps", List.of(nestedWaitStep("inner-1"))
                ),
                "open"
        ), context);

        verify(handlers, never()).handle(any(), any(ExecutionPlanRuntimeContext.class));
    }

    @Test
    void shouldBreakOnRepeatWhile() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context()
                .with("currentEvent.flag", false)
                .build();

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "repeat-while",
                StepType.REPEAT,
                Map.of(
                        "times", 10,
                        "steps", List.of(nestedWaitStep("inner-1")),
                        "repeatWhile", Map.of("$fn", "eq(currentEvent.flag,true)")
                ),
                "open"
        ), context);

        verify(handlers, never()).handle(any(), any(ExecutionPlanRuntimeContext.class));
    }

    @Test
    void shouldSetLoopMetaInState() {
        ExecutionPlanRuntimeContext context = RuntimeContextBuilder.context().build();

        handler.handle(new ExecutionPlanDefinition.ExecutionStepDefinition(
                "repeat-meta",
                StepType.REPEAT,
                Map.of(
                        "times", 3,
                        "steps", List.of(nestedWaitStep("inner-1"))
                ),
                "open"
        ), context);

        assertEquals(3, context.state().get(ExecutionStateKeys.META_LOOP + ".currentIteration"));
        assertEquals(3, context.state().get(ExecutionStateKeys.META_LOOP + ".totalIterations"));
    }

    private ExecutionPlanDefinition.ExecutionStepDefinition nestedWaitStep(String id) {
        return new ExecutionPlanDefinition.ExecutionStepDefinition(
                id,
                StepType.WAIT,
                Map.of("millis", 0),
                null
        );
    }
}
