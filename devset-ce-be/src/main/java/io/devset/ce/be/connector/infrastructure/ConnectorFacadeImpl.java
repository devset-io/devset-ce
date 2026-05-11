/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.connector.infrastructure;

import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.common.domain.WorkflowEngineException;
import io.devset.ce.be.connector.api.dto.ConnectorConnectionStatusDto;
import io.devset.ce.be.connector.api.dto.OpenConnectionDto;
import io.devset.ce.be.connector.application.ConnectorFacade;
import io.devset.ce.be.kafka.application.KafkaFacade;
import io.devset.ce.be.rabbit.application.RabbitFacade;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Infrastructure implementation of {@link ConnectorFacade}.
 * <p>
 * Routes operations to {@link KafkaFacade} or {@link RabbitFacade}
 * based on the connection type. Validates input before delegating.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ConnectorFacadeImpl implements ConnectorFacade {

    private final KafkaFacade kafkaFacade;
    private final RabbitFacade rabbitFacade;

    @Override
    public void openConnection(OpenConnectionDto openConnection) {
        if (openConnection.type() == null) {
            throw new WorkflowEngineException("Connection type must not be blank");
        }
        if (openConnection.name() == null || openConnection.name().isBlank()) {
            throw new WorkflowEngineException("Connection name must not be blank");
        }
        switch (openConnection.type()) {
            case KAFKA -> kafkaFacade.connect(
                    openConnection.name(),
                    openConnection.bootstrapServers(),
                    openConnection.username(),
                    openConnection.password()
            );
            case RABBIT -> rabbitFacade.connect(
                    openConnection.name(),
                    openConnection.host(),
                    openConnection.port(),
                    openConnection.virtualHost(),
                    openConnection.username(),
                    openConnection.password()
            );
        }
    }

    @Override
    public void deleteConnection(String type, String name) {
        ConnectionType connectionType = ConnectionType.from(type);
        if (name.isBlank()) {
            throw new WorkflowEngineException("Connection name must not be blank");
        }
        switch (connectionType) {
            case KAFKA -> kafkaFacade.remove(name);
            case RABBIT -> rabbitFacade.remove(name);
        }
    }

    @Override
    public List<ConnectorConnectionStatusDto> listConnections() {
        List<ConnectorConnectionStatusDto> output = new ArrayList<>();
        output.addAll(kafkaFacade.listConnections()
                .stream()
                .map(object -> new ConnectorConnectionStatusDto(
                        ConnectionType.KAFKA,
                        object.name(),
                        object.bootstrapServers(),
                        object.producerConnected(),
                        object.consumerConnected(),
                        object.authenticated()
                ))
                .toList());
        output.addAll(rabbitFacade.listConnections()
                .stream()
                .map(object -> new ConnectorConnectionStatusDto(
                        ConnectionType.RABBIT,
                        object.name(),
                        object.endpoint(),
                        object.producerConnected(),
                        object.consumerConnected(),
                        object.authenticated()
                ))
                .toList());
        return output.stream()
                .sorted(Comparator.comparing(ConnectorConnectionStatusDto::name))
                .toList();
    }
}
