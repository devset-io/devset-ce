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

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data repository for {@link SingleRequestEntity}.
 * Only internal to {@code singlerequest/infrastructure/persistence/} — never referenced from
 * other packages or modules (application depends on
 * {@link io.devset.ce.be.singlerequest.application.SingleRequestFacade} instead).
 */
public interface SingleRequestRepository extends JpaRepository<SingleRequestEntity, String> {

    /**
     * Checks whether at least one single request is bound to the given collection.
     *
     * @param collectionName the collection name to look for
     * @return {@code true} if any single request references the collection
     */
    boolean existsByCollectionName(String collectionName);
}
