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

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Prints a security warning at startup reminding operators that the application
 * has no built-in authentication and must not be exposed to the public internet.
 */
@Slf4j
@Component
class SecurityWarningBanner {

    @EventListener(ApplicationReadyEvent.class)
    void printWarning() {
        log.warn("""

                ========================================================================
                  WARNING: No authentication is configured.
                  All API endpoints are publicly accessible without credentials.
                  Do NOT expose this instance to the public internet.
                  See SECURITY.md for deployment recommendations.
                ========================================================================
                """);
    }
}
