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

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data repository for {@link WorkflowRequestEntity}.
 * Only internal to {@code workflow/infrastructure/persistence/} — never referenced from
 * other packages or modules (application depends on
 * {@link io.devset.ce.be.workflow.application.WorkflowFacade} instead).
 */
public interface WorkflowRepository extends JpaRepository<WorkflowRequestEntity, String> {
}
