/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlerequest.infrastructure.persistence;

import io.devset.ce.be.common.persistence.MapStringObjectJsonConverter;
import io.devset.ce.be.schema.infrastructure.persistence.ObjectJsonConverter;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.util.Map;

/**
 * JPA entity for the message_dispatch_single_request table.
 */
@Entity
@Table(name = "message_dispatch_single_request")
@Getter
@Setter
public class SingleRequestEntity {

    @Id
    @Column(name = "single_request_name", nullable = false, updatable = false, length = 200)
    private String singleRequestName;

    @Column(name = "collection_name", nullable = false, length = 200)
    private String collectionName;

    @Column(name = "message_type", nullable = false, length = 50)
    private String messageType;

    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;

    @Column(name = "producer_name", length = 200)
    private String producerName;

    @Column(name = "topic", length = 200)
    private String topic;

    @Column(name = "exchange", length = 200)
    private String exchange;

    @Column(name = "routing_key", length = 200)
    private String routingKey;

    @Column(name = "executions", nullable = false)
    private Integer executions;

    @Column(name = "stage_name", nullable = false, length = 200)
    private String stage;

    @Column(name = "event_name", nullable = false, length = 200)
    private String event;

    @Convert(converter = MapStringObjectJsonConverter.class)
    @Column(name = "payload_json", nullable = false, columnDefinition = "TEXT")
    private Map<String, Object> state;

    @Convert(converter = ObjectJsonConverter.class)
    @Column(name = "key_json", columnDefinition = "TEXT")
    private Object key;

    @Convert(converter = MapStringObjectJsonConverter.class)
    @Column(name = "headers_json", nullable = false, columnDefinition = "TEXT")
    private Map<String, Object> headers;

    @Convert(converter = MapStringObjectJsonConverter.class)
    @Column(name = "wire_format_json", nullable = false, columnDefinition = "TEXT")
    private Map<String, Object> wireFormat;

    @Convert(converter = MapStringObjectJsonConverter.class)
    @Column(name = "state_json", nullable = false, columnDefinition = "TEXT")
    private Map<String, Object> workflowState;

    @Column(name = "proto_schema", columnDefinition = "TEXT")
    private String protoSchema;

    protected SingleRequestEntity() {
    }
}
