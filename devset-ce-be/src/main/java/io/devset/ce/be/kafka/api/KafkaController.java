/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.kafka.api;

import io.devset.ce.be.kafka.application.KafkaFacade;
import io.devset.ce.be.kafka.application.dto.KafkaMessageDto;
import io.devset.ce.be.kafka.application.dto.KafkaSendMessageDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.List;
import java.util.Set;

/**
 * REST controller for direct Kafka message publishing.
 * Delegates ALL logic to {@link KafkaFacade}.
 */
@RestController("kafkaSendMessageController")
@RequestMapping("/kafka")
@RequiredArgsConstructor
public class KafkaController {

    private final KafkaFacade kafkaFacade;

    /**
     * Publishes a message to Kafka.
     *
     * @param request payload with producer name, topic, headers and message body
     */
    @PostMapping("/messages/send")
    public void send(@RequestBody KafkaSendMessageDto request) {
        kafkaFacade.send(request);
    }

    /**
     * Lists all available topics on the given Kafka connection.
     *
     * @param connectionName registered Kafka connection to query
     * @return set of topic names
     */
    @GetMapping("/topics")
    public Set<String> listTopics(@RequestParam String connectionName) {
        return kafkaFacade.listTopics(connectionName);
    }

    /**
     * Fetches the last N messages from a Kafka topic.
     *
     * @param connectionName  registered Kafka connection to use
     * @param topic           topic to read from
     * @param limit           maximum number of messages (default 50, max 500)
     * @param beforeTimestamp  if provided, fetches messages older than this timestamp (cursor for paging)
     * @return messages sorted by timestamp descending (newest first)
     */
    @GetMapping("/messages")
    public List<KafkaMessageDto> fetch(
            @RequestParam String connectionName,
            @RequestParam String topic,
            @RequestParam(required = false) Integer limit,
            @RequestParam(required = false) Instant beforeTimestamp
    ) {
        return kafkaFacade.fetchMessages(connectionName, topic, limit, beforeTimestamp);
    }
}
