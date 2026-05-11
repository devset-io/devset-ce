/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.workflow.infrastructure.persistence;

import io.devset.ce.be.common.domain.Stage;
import io.devset.ce.be.common.persistence.MapStringObjectJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Map;

/**
 * JPA entity for the workflow_dsl_request table.
 */
@Entity
@Table(name = "workflow_dsl_request")
@Getter
@Setter
public class WorkflowRequestEntity {

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 200)
    private String id;

    @Column(name = "producer_name", length = 200)
    private String producerName;

    @Column(name = "message_type", length = 50)
    private String messageType;

    @Column(name = "content_type", length = 120)
    private String contentType;

    @Column(name = "topic", length = 200)
    private String topic;

    @Column(name = "exchange", length = 200)
    private String exchange;

    @Column(name = "routing_key", length = 200)
    private String routingKey;

    @Column(name = "schema_id", length = 200)
    private String schemaId;

    @Column(name = "executions")
    private Integer executions;

    @Convert(converter = MapStringObjectJsonConverter.class)
    @Column(name = "state_json", nullable = false, columnDefinition = "TEXT")
    private Map<String, Object> state;

    @Convert(converter = WorkflowStageListJsonConverter.class)
    @Column(name = "pipeline_json", nullable = false, columnDefinition = "TEXT")
    private List<Stage> pipeline;

    protected WorkflowRequestEntity() {
    }
}
