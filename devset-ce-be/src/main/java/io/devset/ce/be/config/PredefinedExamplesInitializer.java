/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.config;

import io.devset.ce.be.examples.application.PredefinedExamplesFacade;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Triggers predefined example seeding once the application is ready.
 * <p>
 * Delegates all work to {@link PredefinedExamplesFacade}; seeding only happens on a
 * fresh instance with no existing data.
 */
@Component
@RequiredArgsConstructor
class PredefinedExamplesInitializer {

    private final PredefinedExamplesFacade predefinedExamplesFacade;

    @EventListener(ApplicationReadyEvent.class)
    void seedOnStartup() {
        predefinedExamplesFacade.seedFreshInstance();
    }
}
