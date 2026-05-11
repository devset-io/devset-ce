/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.infrastructure;

import io.devset.ce.be.common.domain.Stage;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.workflow.application.WorkflowCatalog;
import io.devset.ce.be.workflow.application.WorkflowService;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WorkflowFacadeImplTest {

    @Test
    void shouldCreateWorkflow() {
        WorkflowCatalog catalog = mock(WorkflowCatalog.class);
        WorkflowService service = mock(WorkflowService.class);
        WorkflowFacadeImpl object = new WorkflowFacadeImpl(catalog, service);
        Workflow input = workflow("workflow-1");
        when(service.create(input)).thenReturn(input);

        Workflow output = object.createRequest(input);

        verify(service).create(input);
        assertSame(input, output);
    }

    @Test
    void shouldFindById() {
        WorkflowCatalog catalog = mock(WorkflowCatalog.class);
        WorkflowService service = mock(WorkflowService.class);
        WorkflowFacadeImpl object = new WorkflowFacadeImpl(catalog, service);
        Workflow stored = workflow("workflow-1");
        when(service.getByWorkflowId("workflow-1")).thenReturn(stored);

        Workflow output = object.getRequest("workflow-1");

        verify(service).getByWorkflowId("workflow-1");
        assertSame(stored, output);
    }

    @Test
    void shouldDeleteWorkflow() {
        WorkflowCatalog catalog = mock(WorkflowCatalog.class);
        WorkflowService service = mock(WorkflowService.class);
        WorkflowFacadeImpl object = new WorkflowFacadeImpl(catalog, service);

        object.deleteRequest("workflow-1");

        verify(service).delete("workflow-1");
    }

    @Test
    void shouldReturnAllWorkflows() {
        WorkflowCatalog catalog = mock(WorkflowCatalog.class);
        WorkflowService service = mock(WorkflowService.class);
        WorkflowFacadeImpl object = new WorkflowFacadeImpl(catalog, service);
        List<Workflow> stored = List.of(workflow("workflow-1"), workflow("workflow-2"));
        when(service.findAll()).thenReturn(stored);

        List<Workflow> output = object.listRequests();

        verify(service).findAll();
        assertEquals(2, output.size());
        assertEquals("workflow-1", output.get(0).id());
        assertEquals("workflow-2", output.get(1).id());
    }

    private Workflow workflow(String id) {
        return new Workflow(
                id,
                WorkflowMessageType.KAFKA,
                "producer-1",
                "workflow-topic",
                1,
                Map.of(),
                List.of(new Stage(
                        "open", "started", "none", 1,
                        Map.of(), Map.of(), Map.of(), Map.of(), Map.of(),
                        true, null
                ))
        );
    }
}
