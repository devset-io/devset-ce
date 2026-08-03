/*
 * This file is part of Devset CE.
 *
 * Copyright (C) 2025-2026 Dominik Martyniak
 *
 * Licensed under the Functional Source License, Version 1.1, Apache 2.0 Future License
 * (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License in the LICENSE file at the root of this repository.
 */

package io.devset.ce.be.dispatchworkspace.infrastructure.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Spring Data repository for {@link DispatchWorkspaceEntity}.
 * Only internal to {@code dispatchworkspace/infrastructure/persistence/} — application code depends
 * on {@link io.devset.ce.be.dispatchworkspace.application.DispatchWorkspaceFacade} instead.
 */
public interface DispatchWorkspaceRepository extends JpaRepository<DispatchWorkspaceEntity, String> {
}
