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

import io.devset.ce.be.engine.application.ExecutionPlanStepHandler;
import io.devset.ce.be.engine.application.steps.helpers.*;
import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ExecutionStateKeys;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Handles {@code set-field} steps that assign a value to a state path.
 * <p>
 * Supports four value sources in priority order: {@code valuePath} (another state path),
 * {@code valueTemplate} (a map/list template with {@code $path}/{@code $expression}
 * placeholders), {@code valueExpression} (a DSL expression like {@code uuid()},
 * {@code int(1,10)}, {@code add(x, y)}) and literal {@code value}. A {@code when}
 * config key can conditionally route to default equivalents ({@code defaultValue...}).
 */
@Component
@RequiredArgsConstructor
public final class SetFieldStepHandler implements ExecutionPlanStepHandler {

    private static final String VALUE = "value";
    private static final String VALUE_PATH = "valuePath";
    private static final String VALUE_TEMPLATE = "valueTemplate";
    private static final String VALUE_EXPRESSION = "valueExpression";
    private static final String DEFAULT_VALUE = "defaultValue";
    private static final String DEFAULT_VALUE_PATH = "defaultValuePath";
    private static final String DEFAULT_VALUE_TEMPLATE = "defaultValueTemplate";
    private static final String DEFAULT_VALUE_EXPRESSION = "defaultValueExpression";
    private static final String WHEN = ExecutionStateKeys.DSL_WHEN;

    private final StateDataOps stateDataOps;
    private final StepSupport stepSupport;
    private final SetFieldTemplateResolver templateResolver;
    private final SetFieldExpressionResolver expressionResolver;
    private final ConditionEvaluator conditionEvaluator;

    @Override
    public StepType supports() {
        return StepType.SET_FIELD;
    }

    @Override
    public void handle(ExecutionPlanDefinition.ExecutionStepDefinition step, ExecutionPlanRuntimeContext context) {
        String targetPath = stepSupport.stringConfig(step, TARGET_PATH);
        if (step.config().containsKey(WHEN) && !conditionEvaluator.matches(step.config(), WHEN, context, step.id())) {
            if (!applyConfiguredValue(step, context, targetPath, DEFAULT_VALUE, DEFAULT_VALUE_PATH, DEFAULT_VALUE_TEMPLATE, DEFAULT_VALUE_EXPRESSION)) {
                return;
            }
            return;
        }

        if (!applyConfiguredValue(step, context, targetPath, VALUE, VALUE_PATH, VALUE_TEMPLATE, VALUE_EXPRESSION)) {
            throw new WorkflowEngineException(
                    "Missing config 'value', 'valuePath', 'valueTemplate' or 'valueExpression' for step: " + step.id()
            );
        }
    }

    private boolean applyConfiguredValue(
            ExecutionPlanDefinition.ExecutionStepDefinition step,
            ExecutionPlanRuntimeContext context,
            String targetPath,
            String valueKey,
            String valuePathKey,
            String valueTemplateKey,
            String valueExpressionKey
    ) {
        if (step.config().containsKey(valuePathKey)) {
            String path = stepSupport.stringConfig(step, valuePathKey);
            Object value;
            try {
                value = context.state().get(path);
            } catch (WorkflowEngineException e) {
                if (path.startsWith(ExecutionStateKeys.CURRENT_EVENT_PREFIX)) {
                    String statePath = "state." + path.substring(ExecutionStateKeys.CURRENT_EVENT_PREFIX.length());
                    value = context.state().get(statePath);
                } else {
                    throw e;
                }
            }
            context.state().put(targetPath, stateDataOps.deepCopyValue(value));
            return true;
        }
        if (step.config().containsKey(valueTemplateKey)) {
            context.state().put(targetPath, templateResolver.resolve(step.config().get(valueTemplateKey), context, targetPath));
            return true;
        }
        if (step.config().containsKey(valueExpressionKey)) {
            context.state().put(
                    targetPath,
                    expressionResolver.resolve(stepSupport.stringConfig(step, valueExpressionKey), context, step.id())
            );
            return true;
        }

        if (!step.config().containsKey(valueKey)) {
            return false;
        }
        context.state().put(targetPath, stateDataOps.deepCopyValue(step.config().get(valueKey)));
        return true;
    }
}
