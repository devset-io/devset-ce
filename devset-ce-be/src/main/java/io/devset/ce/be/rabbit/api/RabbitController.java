/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.rabbit.api;

import io.devset.ce.be.rabbit.application.RabbitFacade;
import io.devset.ce.be.rabbit.application.dto.RabbitBrokerResourcesDto;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * REST controller for RabbitMQ broker resource discovery.
 * Delegates ALL logic to {@link RabbitFacade}.
 */
@RestController("rabbitController")
@RequestMapping("/rabbit")
@RequiredArgsConstructor
public class RabbitController {

    private final RabbitFacade rabbitFacade;

    /**
     * Lists queues and exchanges from the RabbitMQ Management API.
     * When the Management Plugin is unavailable, returns {@code available: false} with empty lists.
     *
     * @param connectionName registered RabbitMQ connection to query
     * @return broker resources with availability flag
     */
    @GetMapping("/broker-resources")
    public RabbitBrokerResourcesDto listBrokerResources(@RequestParam String connectionName) {
        return rabbitFacade.listBrokerResources(connectionName);
    }
}
