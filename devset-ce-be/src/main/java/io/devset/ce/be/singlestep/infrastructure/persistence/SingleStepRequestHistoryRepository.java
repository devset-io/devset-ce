/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.singlestep.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

/**
 * Spring Data repository for {@link SingleStepRequestHistoryEntity}.
 * Only internal to {@code singlestep/infrastructure/persistence/} — never referenced from
 * other packages or modules (application depends on
 * {@link io.devset.ce.be.singlestep.application.SingleStepFacade} instead).
 */
public interface SingleStepRequestHistoryRepository extends JpaRepository<SingleStepRequestHistoryEntity, String> {

    /**
     * Returns all single step history entries ordered by creation timestamp (descending),
     * then by id (descending) as a stable tiebreaker.
     *
     * @return history entries in newest-first order
     */
    List<SingleStepRequestHistoryEntity> findAllByOrderByCreatedAtEpochMillisDescIdDesc();
}
