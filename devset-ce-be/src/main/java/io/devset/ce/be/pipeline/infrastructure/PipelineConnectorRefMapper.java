/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.pipeline.infrastructure;

import io.devset.ce.be.common.domain.ConnectionType;
import io.devset.ce.be.common.domain.Workflow;
import io.devset.ce.be.common.domain.WorkflowMessageType;
import io.devset.ce.be.common.domain.ExecutionPlanConnectorRef;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

/**
 * MapStruct mapper that extracts a {@link ExecutionPlanConnectorRef} from a {@link Workflow}.
 * <p>
 * Maps the workflow's message type to a {@link ConnectionType} and uses the producer name
 * as the connector reference name.
 */
@Mapper(componentModel = "spring")
public interface PipelineConnectorRefMapper {

    /**
     * Extracts a {@link ExecutionPlanConnectorRef} from the workflow's messaging configuration.
     *
     * @param workflow source workflow definition
     * @return connector reference with resolved connection type and producer name
     */
    @Mapping(target = "type", source = "messageType")
    @Mapping(target = "name", source = "producerName")
    ExecutionPlanConnectorRef toConnectorRef(Workflow workflow);

    /** Maps {@link WorkflowMessageType} to the corresponding {@link ConnectionType}. */
    default ConnectionType map(WorkflowMessageType messageType) {
        if (messageType == null) {
            return null;
        }
        return messageType == WorkflowMessageType.KAFKA
                ? ConnectionType.KAFKA
                : ConnectionType.RABBIT;
    }
}
