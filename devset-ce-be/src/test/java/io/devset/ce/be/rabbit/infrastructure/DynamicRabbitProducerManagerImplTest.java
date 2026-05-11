/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.rabbit.infrastructure;

import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.common.domain.ExecutionPlanConnectorRef;
import io.devset.ce.be.engine.application.ExecutionPlanRunService;
import io.devset.ce.be.engine.infrastructure.ExecutionPlanRunRepository;
import io.devset.ce.be.engine.infrastructure.ExecutionPlanRunServiceImpl;
import io.devset.ce.be.rabbit.application.dto.RabbitBrokerResourcesDto;
import io.devset.ce.be.rabbit.application.dto.RabbitConnectionStatusDto;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class DynamicRabbitProducerManagerImplTest {

    @Test
    void shouldConnectObjectWithoutCreatingConsumerStatus() {
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));

        object.connect("object-1", "localhost", 5672, "/", null, null);

        List<RabbitConnectionStatusDto> output = object.listConnections();
        RabbitConnectionStatusDto result = output.getFirst();
        assertEquals(1, output.size());
        assertEquals("object-1", result.name());
        assertEquals("localhost:5672/", result.endpoint());
        assertTrue(result.producerConnected());
        assertFalse(result.consumerConnected());
        assertFalse(result.authenticated());
    }

    @Test
    void shouldReuseObjectForSameInput() {
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));

        object.connect("object-1", "localhost", 5672, "/", null, null);
        RabbitTemplate input = state(object).get("object-1");

        object.connect("object-1", "localhost", 5672, "/", null, null);
        RabbitTemplate output = state(object).get("object-1");

        assertSame(input, output);
    }

    @Test
    void shouldSendUsingQueueInput() {
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));
        RabbitTemplate state = mock(RabbitTemplate.class);
        state(object).put("object-1", state);

        object.sendMessage("object-1", "entity", null, null, "{\"id\":1}");

        ArgumentCaptor<String> output = ArgumentCaptor.forClass(String.class);
        verify(state).convertAndSend(
                org.mockito.ArgumentMatchers.eq("entity"),
                output.capture()
        );
        assertEquals("{\"id\":1}", output.getValue());
    }

    @Test
    void shouldSendUsingRoutingInput() {
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));
        RabbitTemplate state = mock(RabbitTemplate.class);
        state(object).put("object-1", state);

        object.sendMessage("object-1", null, "exchange", "entity", "{\"id\":1}");

        ArgumentCaptor<String> output = ArgumentCaptor.forClass(String.class);
        verify(state).convertAndSend(
                org.mockito.ArgumentMatchers.eq("exchange"),
                org.mockito.ArgumentMatchers.eq("entity"),
                output.capture()
        );
        assertEquals("{\"id\":1}", output.getValue());
    }

    @Test
    void shouldSendUsingExchangeOnlyInput() {
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));
        RabbitTemplate state = mock(RabbitTemplate.class);
        state(object).put("object-1", state);

        object.sendMessage("object-1", null, "exchange", null, "{\"id\":1}");

        ArgumentCaptor<String> output = ArgumentCaptor.forClass(String.class);
        verify(state).convertAndSend(
                org.mockito.ArgumentMatchers.eq("exchange"),
                org.mockito.ArgumentMatchers.eq(""),
                output.capture()
        );
        assertEquals("{\"id\":1}", output.getValue());
    }

    @Test
    void shouldFailWhenAddressInputIsMissing() {
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));
        RabbitTemplate state = mock(RabbitTemplate.class);
        state(object).put("object-1", state);

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.sendMessage("object-1", null, null, null, "{\"id\":1}")
        );

        assertEquals("RabbitMQ queueName, routingKey or exchange must not be blank", output.getMessage());
    }

    @Test
    void shouldRejectOverwriteWhenActiveRunUsesRabbitConnector() {
        ExecutionPlanRunRepository runRepository = new ExecutionPlanRunRepository();
        ExecutionPlanRunService runService = new ExecutionPlanRunServiceImpl(runRepository);
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(runService);
        object.connect("object-1", "localhost", 5672, "/", null, null);
        runService.savePendingRun(
                "run-1",
                1,
                Set.of(new ExecutionPlanConnectorRef(ConnectionType.RABBIT, "object-1"))
        );

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.connect("object-1", "other-host", 5672, "/", null, null)
        );

        assertEquals("Cannot overwrite RabbitMQ connector while active runs use it: object-1", output.getMessage());
        assertEquals("localhost:5672/", object.listConnections().getFirst().endpoint());
    }

    @Test
    void shouldRemoveExistingRabbitConnector() {
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));
        object.connect("object-1", "localhost", 5672, "/", null, null);

        object.remove("object-1");

        assertEquals(List.of(), object.listConnections());
    }

    @Test
    void shouldRejectRemoveWhenRabbitConnectorDoesNotExist() {
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.remove("missing")
        );

        assertEquals("RabbitMQ connector not found: missing", output.getMessage());
    }

    @Test
    void shouldRejectRemoveWhenActiveRunUsesRabbitConnector() {
        ExecutionPlanRunRepository runRepository = new ExecutionPlanRunRepository();
        ExecutionPlanRunService runService = new ExecutionPlanRunServiceImpl(runRepository);
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(runService);
        object.connect("object-1", "localhost", 5672, "/", null, null);
        runService.savePendingRun(
                "run-1",
                1,
                Set.of(new ExecutionPlanConnectorRef(ConnectionType.RABBIT, "object-1"))
        );

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.remove("object-1")
        );

        assertEquals("Cannot remove RabbitMQ connector while active runs use it: object-1", output.getMessage());
        assertEquals("object-1", object.listConnections().getFirst().name());
    }

    @Test
    void shouldThrowWhenListBrokerResourcesForMissingConnector() {
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));

        WorkflowEngineException output = assertThrows(
                WorkflowEngineException.class,
                () -> object.listBrokerResources("missing")
        );

        assertEquals("RabbitMQ connector not found: missing", output.getMessage());
    }

    @Test
    void shouldReturnUnavailableWhenManagementApiIsUnreachable() {
        DynamicRabbitProducerManagerImpl object = new DynamicRabbitProducerManagerImpl(new ExecutionPlanRunServiceImpl(new ExecutionPlanRunRepository()));
        object.connect("object-1", "localhost", 5672, "/", null, null);

        RabbitBrokerResourcesDto output = object.listBrokerResources("object-1");

        assertFalse(output.available());
        assertEquals(List.of(), output.queues());
        assertEquals(List.of(), output.exchanges());
    }

    @SuppressWarnings("unchecked")
    private static Map<String, RabbitTemplate> state(DynamicRabbitProducerManagerImpl object) {
        return (Map<String, RabbitTemplate>) ReflectionTestUtils.getField(object, "producers");
    }
}
