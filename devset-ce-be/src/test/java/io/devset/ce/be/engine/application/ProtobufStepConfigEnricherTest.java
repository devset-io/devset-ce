/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.engine.application;

import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.common.domain.ExecutionPlanDefinition;
import io.devset.ce.be.common.domain.ProtobufSchemaDescriptor;
import io.devset.ce.be.common.domain.StepType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.ExecutionPlanConnectorRef;
import io.devset.ce.be.common.domain.ExecutionPlanInput;
import io.devset.ce.be.schema.application.SchemaFacade;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ProtobufStepConfigEnricherTest {

    @Test
    void shouldLoadDescriptorFromSchemaWhenStepContainsOnlySchemaId() {
        SchemaFacade schemaFacade = mock(SchemaFacade.class);
        when(schemaFacade.loadProtobufDescriptor("schema-1"))
                .thenReturn(new ProtobufSchemaDescriptor("descriptor-1", "example.Event"));
        ProtobufStepConfigEnricher object = new ProtobufStepConfigEnricher(schemaFacade);

        ExecutionPlanInput output = object.load(new ExecutionPlanInput(
                new ExecutionPlanDefinition(
                        "wf-1",
                        List.of(
                                new ExecutionPlanDefinition.ExecutionStepDefinition(
                                        "send-1",
                                        StepType.EXECUTE_SEND,
                                        Map.of(
                                                "contentType", "application/x-protobuf",
                                                "schemaId", "schema-1"
                                        ),
                                        "stage-1"
                                ),
                                new ExecutionPlanDefinition.ExecutionStepDefinition(
                                        "wire-1",
                                        StepType.WIRE_FORMAT,
                                        Map.of(
                                                "contentType", "application/x-protobuf",
                                                "schemaId", "schema-1"
                                        ),
                                        "stage-1"
                                )
                        )
                ),
                Map.of(),
                Set.of(new ExecutionPlanConnectorRef(ConnectionType.KAFKA, "local"))
        ));

        assertEquals("descriptor-1", output.definition().steps().get(0).config().get("schemaDescriptor"));
        assertEquals("example.Event", output.definition().steps().get(0).config().get("protobufRootMessage"));
        assertEquals("descriptor-1", output.definition().steps().get(1).config().get("schemaDescriptor"));
        assertEquals(Set.of(new ExecutionPlanConnectorRef(ConnectionType.KAFKA, "local")), output.connectors());
        verify(schemaFacade, times(1)).loadProtobufDescriptor("schema-1");
    }

    @Test
    void shouldUseUserProvidedDescriptorWithoutDatabaseLookup() {
        SchemaFacade schemaFacade = mock(SchemaFacade.class);
        ProtobufStepConfigEnricher object = new ProtobufStepConfigEnricher(schemaFacade);

        ExecutionPlanInput input = new ExecutionPlanInput(
                new ExecutionPlanDefinition(
                        "wf-1",
                        List.of(new ExecutionPlanDefinition.ExecutionStepDefinition(
                                "send-1",
                                StepType.EXECUTE_SEND,
                                Map.of(
                                        "contentType", "application/x-protobuf",
                                        "schemaDescriptor", "descriptor-from-user",
                                        "protobufRootMessage", "example.Event"
                                ),
                                "stage-1"
                        ))
                ),
                Map.of()
        );

        ExecutionPlanInput output = object.load(input);

        assertEquals(input, output);
        verify(schemaFacade, times(0)).loadProtobufDescriptor("schema-1");
    }

    @Test
    void shouldFailWhenSchemaIdAndDescriptorAreMissing() {
        ProtobufStepConfigEnricher object = new ProtobufStepConfigEnricher(mock(SchemaFacade.class));

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.load(new ExecutionPlanInput(
                        new ExecutionPlanDefinition(
                                "wf-1",
                                List.of(new ExecutionPlanDefinition.ExecutionStepDefinition(
                                        "send-1",
                                        StepType.EXECUTE_SEND,
                                        Map.of("contentType", "application/x-protobuf"),
                                        "stage-1"
                                ))
                        ),
                        Map.of()
                ))
        );

        assertEquals("Missing config 'schemaId' for protobuf step: send-1", output.getMessage());
    }
}
